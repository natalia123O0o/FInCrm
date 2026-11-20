'use strict';
const mongoose = require('mongoose');
const Campaign = require('./campaign.model');
const CampaignEvent = require('./campaignEvent.model');
const Client = require('../clients/client.model');
const Opportunity = require('../opportunities/opportunity.model');
const { summarize } = require('./campaign.stats');
const { withQuota, requestQuota } = require('../subscriptions/usage.service');
const { respondAccessError } = require('../../middlewares/feature.middleware');

const isId = v => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
const text = v => typeof v === 'string' ? v.trim() : '';
const valid = (value, max, min = 1) => value.length >= min && value.length <= max;
const PURPOSES = ['PROMOTION','FOLLOW_UP','INVITATION','LOYALTY'];
const CHANNELS = ['EMAIL','PHONE','WHATSAPP','OTHER'];
const EVENTS = ['CONTACTED','RESPONDED','OPPORTUNITY','OPT_OUT'];
const NEXT = { DRAFT: ['ACTIVE'], ACTIVE: ['PAUSED','COMPLETED'], PAUSED: ['ACTIVE','COMPLETED'], COMPLETED: [] };

function failure(res, err, label) {
  if (respondAccessError(res, err)) return;
  if (err?.name === 'ValidationError' || err?.name === 'CastError') {
    return res.status(400).json({ message: 'Datos inválidos. Revisa los campos.' });
  }
  console.error(`FinCampaigns ${label}:`, err?.message);
  return res.status(500).json({message:'No se pudo completar la operación de campañas.'});
}

function normalize(body) {
  const name = text(body?.name), objective = text(body?.objective);
  if (!valid(name,120,3) || !valid(objective,600,8)) throw new Error('Nombre (3-120) y objetivo (8-600) son obligatorios.');
  if (!PURPOSES.includes(body.purpose) || !CHANNELS.includes(body.channel)) throw new Error('Finalidad o canal inválido.');
  const startAt = new Date(body.startAt), endAt = new Date(body.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt < startAt) throw new Error('Revisa las fechas de inicio y fin.');
  const budget = Number(body.budget);
  if (!Number.isFinite(budget) || budget < 0 || budget > 1e12) throw new Error('Presupuesto fuera de rango.');
  if (!Array.isArray(body.clientIds) || !body.clientIds.length || body.clientIds.length > 100 || !body.clientIds.every(isId)) throw new Error('Selecciona entre 1 y 100 clientes válidos.');
  const clientIds = [...new Set(body.clientIds.map(v => v.toLowerCase()))];
  return { name, objective, purpose: body.purpose, channel: body.channel, startAt, endAt, budget, clientIds };
}
async function verifyClients(tenantId, clientIds) {
  const count = await Client.countDocuments({ _id: {$in: clientIds}, tenantId, isActive: true });
  return count === clientIds.length;
}

async function options(req,res) {
  try {
    const [clients,opportunities]=await Promise.all([
      Client.find({ tenantId:req.user.tenantId, isActive:true }).select('name email phone').sort({name:1}).limit(300).lean(),
      Opportunity.find({ tenantId:req.user.tenantId }).select('title stage clientId estimatedValue').sort({createdAt:-1}).limit(300).lean()
    ]);
    res.json({clients,opportunities, note:'La lista de selección muestra hasta 300 clientes. Los envíos masivos no están habilitados.'});
  } catch(err) {failure(res,err,'options');}
}
async function list(req,res) {
  try {
    const items = await Campaign.find({tenantId:req.user.tenantId}).sort({createdAt:-1}).limit(300).lean();
    res.json({campaigns:items});
  } catch(err) {failure(res,err,'list');}
}
async function detail(req,res) {
  if (!isId(req.params.id)) return res.status(400).json({message:'Identificador inválido.'});
  try {
    const campaign = await Campaign.findOne({_id:req.params.id,tenantId:req.user.tenantId}).populate('clientIds','name email phone');
    if (!campaign) return res.status(404).json({message:'Campaña no encontrada.'});
    const events = await CampaignEvent.find({campaignId:campaign._id,tenantId:req.user.tenantId})
      .sort({createdAt:-1}).limit(500).populate('clientId','name').populate('opportunityId','title stage').lean();
    res.json({campaign,events});
  } catch(err) {failure(res,err,'detail');}
}
async function create(req,res) {
  let payload;
  try {payload=normalize(req.body);}catch(err){return res.status(400).json({message:err.message});}
  try {
    const tenantId=req.user.tenantId;
    if (!await verifyClients(tenantId,payload.clientIds)) return res.status(404).json({message:'Alguno de los clientes no pertenece a tu empresa o está inactivo.'});
    const campaign=await withQuota(requestQuota(req,'campaigns'),async session=>{
      const [item]=await Campaign.create([{...payload,tenantId,createdBy:req.user._id}],{session});
      return item;
    });
    return res.status(201).json({campaign});
  } catch(err){failure(res,err,'create');}
}
async function update(req,res) {
  if(!isId(req.params.id)) return res.status(400).json({message:'Identificador inválido.'});
  let payload;
  try {payload=normalize(req.body);}catch(err){return res.status(400).json({message:err.message});}
  try {
    const tenantId=req.user.tenantId;
    const campaign=await Campaign.findOne({_id:req.params.id,tenantId});
    if(!campaign) return res.status(404).json({message:'Campaña no encontrada.'});
    if(campaign.status!=='DRAFT') return res.status(409).json({message:'Solo los borradores se pueden editar. No alteres el historial de una campaña activada.'});
    if(!await verifyClients(tenantId,payload.clientIds)) return res.status(404).json({message:'Cliente inexistente o perteneciente a otra empresa.'});
    Object.assign(campaign,payload);
    await campaign.save();
    res.json({campaign});
  }catch(err){failure(res,err,'update');}
}
async function status(req,res) {
  if(!isId(req.params.id)) return res.status(400).json({message:'Identificador inválido.'});
  const next=text(req.body?.status);
  try {
    const campaign=await Campaign.findOne({_id:req.params.id,tenantId:req.user.tenantId});
    if(!campaign)return res.status(404).json({message:'Campaña no encontrada.'});
    if(!(NEXT[campaign.status]||[]).includes(next))return res.status(409).json({message:`No puedes pasar de ${campaign.status} a ${next}.`});
    campaign.status=next; await campaign.save();
    return res.json({campaign,message:'Estado actualizado. Esto no envía mensajes a ningún destinatario.'});
  }catch(err){failure(res,err,'status');}
}
async function recordEvent(req,res) {
  if(!isId(req.params.id))return res.status(400).json({message:'Identificador inválido.'});
  const {clientId,type,opportunityId,authorizationConfirmed,details} = req.body || {};
  if(!isId(clientId) || !EVENTS.includes(type) || (opportunityId && !isId(opportunityId)))return res.status(400).json({message:'Datos del seguimiento inválidos.'});
  if(typeof (details ?? '')!=='string' || text(details).length>600)return res.status(400).json({message:'Observaciones demasiado extensas.'});
  try {
    const tenantId=req.user.tenantId;
    const campaign=await Campaign.findOne({_id:req.params.id,tenantId});
    if(!campaign)return res.status(404).json({message:'Campaña no encontrada.'});
    if(campaign.status!=='ACTIVE')return res.status(409).json({message:'Activa primero la campaña para registrar resultados.'});
    if(!campaign.clientIds.some(v=>String(v)===clientId))return res.status(404).json({message:'El cliente no pertenece a la audiencia de esta campaña.'});
    const client=await Client.findOne({_id:clientId,tenantId,isActive:true}).select('_id').lean();
    if(!client)return res.status(404).json({message:'Cliente no disponible en esta empresa.'});
    const isSuppressed=await CampaignEvent.exists({tenantId,clientId,type:'OPT_OUT'});
    if(type==='CONTACTED') {
      if(isSuppressed)return res.status(403).json({message:'El cliente registró una exclusión. No se debe contactar.'});
      if(authorizationConfirmed!==true || text(details).length<8)return res.status(400).json({message:'Confirma la autorización y registra la evidencia o contexto (mínimo 8 caracteres).'});
    }
    if(type==='RESPONDED' || type==='OPPORTUNITY') {
      const contacted=await CampaignEvent.exists({tenantId,campaignId:campaign._id,clientId,type:'CONTACTED'});
      if(!contacted)return res.status(409).json({message:'Primero registra el contacto verificado con este cliente.'});
    }
    let linkedOpportunity=null;
    if(type==='OPPORTUNITY') {
      if(!isId(opportunityId))return res.status(400).json({message:'Selecciona una oportunidad válida.'});
      linkedOpportunity=await Opportunity.findOne({_id:opportunityId,tenantId,clientId}).select('_id').lean();
      if(!linkedOpportunity)return res.status(404).json({message:'La oportunidad no pertenece a este cliente o empresa.'});
      const duplicated=await CampaignEvent.exists({tenantId,campaignId:campaign._id,type:'OPPORTUNITY',opportunityId});
      if(duplicated)return res.status(409).json({message:'Esta oportunidad ya fue asociada a la campaña.'});
    } else if(opportunityId) return res.status(400).json({message:'Solo el evento de oportunidad admite oportunidadId.'});
    if(type==='OPT_OUT' && isSuppressed)return res.status(409).json({message:'La exclusión ya fue registrada.'});
    const event=await CampaignEvent.create({tenantId,campaignId:campaign._id,clientId,type,opportunityId:linkedOpportunity?linkedOpportunity._id:null,details:text(details),authorizationConfirmed:type==='CONTACTED',recordedBy:req.user._id});
    res.status(201).json({event});
  }catch(err){failure(res,err,'record-event');}
}
async function analytics(req,res) {
  try {
    const tenantId=req.user.tenantId;
    const campaignCount=await Campaign.countDocuments({tenantId});
    if(campaignCount>300)return res.status(422).json({message:'Demasiadas campañas para esta versión del informe. Activa una consulta paginada o agregación.'});
    const campaigns=await Campaign.find({tenantId}).lean();
    const eventCount=await CampaignEvent.countDocuments({tenantId});
    if(eventCount>20000)return res.status(422).json({message:'El volumen de eventos requiere el informe agregado (fase de escalabilidad).'});
    const events=await CampaignEvent.find({tenantId}).lean();
    const ids=[...new Set(events.filter(e=>e.type==='OPPORTUNITY' && e.opportunityId).map(e=>String(e.opportunityId)))];
    const opportunities=ids.length?await Opportunity.find({_id:{$in:ids},tenantId}).select('stage estimatedValue').lean():[];
    res.json(summarize(campaigns,events,opportunities));
  }catch(err){failure(res,err,'analytics');}
}
module.exports={options,list,detail,create,update,status,recordEvent,analytics};
