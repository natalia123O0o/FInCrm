'use strict';
const crypto = require('node:crypto');
const Quote = require('./quote.model');
const Policy = require('./pricingPolicy.model');
const Client = require('../clients/client.model');
const Opportunity = require('../opportunities/opportunity.model');
const User = require('../users/user.model');
const PosProduct = require('../pos/product.model');
const { assertFeature, respondAccessError } = require('../../middlewares/feature.middleware');
const { withQuota, consumeQuota, requestQuota } = require('../subscriptions/usage.service');
const { isId,clean,calculate,parseDate,assess }=require('./quote.logic');
const STATUSES = {submit:['DRAFT','PENDING_APPROVAL'],approve:['PENDING_APPROVAL','APPROVED'],send:['APPROVED','SENT'],accept:['SENT','ACCEPTED'],reject:['SENT','REJECTED'],revise:['APPROVED','DRAFT']};
const policyFor = async tenantId => await Policy.findOne({tenantId}).lean() || {minimumMarginPct:20,approvalDiscountPct:10,stalledDays:5};
const permitted = req => ({tenantId:req.user.tenantId,...(req.user.role==='USER'?{assignedTo:req.user._id}:{})});
const populated = q => q.populate('clientId','name').populate('assignedTo','name').populate('opportunityId','title stage');
function safeError(res,err,location) {
 if (respondAccessError(res,err)) return;
 if (err?.name==='VersionError') return res.status(409).json({message:'La cotización cambió en otra sesión. Actualiza y vuelve a intentarlo.'});
 if (err?.code===11000) return res.status(409).json({message:'Conflicto al crear el código de cotización. Inténtalo de nuevo.'});
 console.error(`FinCotiza ${location}:`,err?.message);
 return res.status(500).json({message:'No se pudo completar la operación de cotizaciones.'});
}
function requireBody(b) {
 if (!b || typeof b!=='object' || Array.isArray(b)) throw new Error('Los datos de cotización son inválidos.');
 const title=clean(b.title);
 if (!title || title.length>120 || typeof (b.notes??'')!=='string' || b.notes?.length>2000) throw new Error('Título o descripción inválidos.');
 if (!isId(b.clientId)||!isId(b.assignedTo)) throw new Error('Selecciona un cliente y empleado válidos.');
 if (b.opportunityId && !isId(b.opportunityId)) throw new Error('La oportunidad seleccionada no es válida.');
 return {title,notes:clean(b.notes),clientId:b.clientId,assignedTo:b.assignedTo,opportunityId:b.opportunityId||null,validUntil:parseDate(b.validUntil),...calculate(b.lines)};
}
async function verifyReferences(tenantId, data) {
 const [client,user,opp]=await Promise.all([
   Client.findOne({_id:data.clientId,tenantId,isActive:true}).select('_id').lean(),
   User.findOne({...require('../users/user.status').activeUserFilter(tenantId),_id:data.assignedTo,role:'USER'}).select('_id').lean(),
   data.opportunityId?Opportunity.findOne({_id:data.opportunityId,tenantId,clientId:data.clientId,assignedTo:data.assignedTo}).select('_id').lean():Promise.resolve(true)
 ]);
 if(!client || !user || !opp) return false;
 const products=data.lines.filter(l=>l.kind==='PRODUCT');
 if(!products.length) return true;
 const ids=[...new Set(products.map(l=>String(l.productId)))];
 const found=await PosProduct.find({_id:{$in:ids},tenantId,isActive:true}).select('_id sku name').lean();
 if(found.length!==ids.length)return false;
 const byId=new Map(found.map(p=>[String(p._id),p]));
 data.lines.forEach(l=>{if(l.kind==='PRODUCT'){const p=byId.get(String(l.productId));l.description=p.name;l.sku=p.sku;}});
 return true;
}
function itemVersion(quote,by) {return {number:quote.revision,at:new Date(),by,lines:quote.lines.map(l=>l.toObject ? l.toObject():l),total:quote.total,marginPct:quote.marginPct};}
function record(quote,kind,by,note=''){quote.events.push({kind,by,note,at:new Date()});}
function present(quote,policy) {
 const q=quote.toObject?quote.toObject():quote;
 return {...q,risk:assess(q,policy)};
}
async function options(req,res) {
 try {
  const [products,policy]=await Promise.all([req.entitlements.modules.includes('pos') ? PosProduct.find({tenantId:req.user.tenantId,isActive:true}).select('name sku price stock').sort({name:1}).limit(200).lean() : Promise.resolve([]),policyFor(req.user.tenantId)]);
  res.json({products,policy});
 }catch(err){safeError(res,err,'options');}
}
async function getPolicy(req,res) {try{res.json({policy:await policyFor(req.user.tenantId)});}catch(err){safeError(res,err,'policy');}}
async function updatePolicy(req,res) {
 try {
  const {minimumMarginPct,approvalDiscountPct,stalledDays}=req.body||{};
  const nums=[Number(minimumMarginPct),Number(approvalDiscountPct),Number(stalledDays)];
  if(nums.some(n=>!Number.isFinite(n))||nums[0]<0||nums[0]>95||nums[1]<0||nums[1]>100||!Number.isInteger(nums[2])||nums[2]<1||nums[2]>90) return res.status(400).json({message:'Política inválida: margen 0-95 %, descuento 0-100 %, seguimiento 1-90 días.'});
  const policy=await Policy.findOneAndUpdate({tenantId:req.user.tenantId},{$set:{minimumMarginPct:nums[0],approvalDiscountPct:nums[1],stalledDays:nums[2]}},{upsert:true,returnDocument:'after',setDefaultsOnInsert:true});
  res.json({policy});
 }catch(err){safeError(res,err,'update-policy');}
}
async function list(req,res) {
 try {
  const [quotes,policy]=await Promise.all([populated(Quote.find(permitted(req)).select('-versions -events -recommendation').sort({createdAt:-1}).limit(200)),policyFor(req.user.tenantId)]);
  res.json({quotes:quotes.map(q=>present(q,policy))});
 }catch(err){safeError(res,err,'list');}
}
async function detail(req,res) {
 if(!isId(req.params.id))return res.status(400).json({message:'Identificador inválido.'});
 try {
  const q=await populated(Quote.findOne({_id:req.params.id,...permitted(req)}));
  if(!q)return res.status(404).json({message:'Cotización no encontrada.'});
  res.json({quote:present(q,await policyFor(req.user.tenantId))});
 }catch(err){safeError(res,err,'detail');}
}
async function create(req,res) {
 let data;try{data=requireBody(req.body);}catch(err){return res.status(400).json({message:err.message});}
 try {
  if (data.lines.some(line=>line.kind==='PRODUCT')) assertFeature(req.tenant,'pos');
  if(!await verifyReferences(req.user.tenantId,data)) return res.status(404).json({message:'Cliente, empleado, oportunidad o producto no encontrados en tu empresa.'});
  const code=`COT-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const q=await withQuota(requestQuota(req,'quotes'),async(session,access)=>{
   if (data.lines.some(line=>line.kind==='PRODUCT')) assertFeature(access.tenant,'pos');
   const item=new Quote({...data,code,tenantId:req.user.tenantId,createdBy:req.user._id});
   item.versions.push(itemVersion(item,req.user._id));record(item,'CREATED',req.user._id);
   await item.save({session});return item;
  });
  await q.populate('clientId','name');
  res.status(201).json({quote:present(q,await policyFor(req.user.tenantId))});
 }catch(err){safeError(res,err,'create');}
}
async function update(req,res) {
 if(!isId(req.params.id))return res.status(400).json({message:'Identificador inválido.'});
 let data;try{data=requireBody(req.body);}catch(err){return res.status(400).json({message:err.message});}
 try { if (data.lines.some(line=>line.kind==='PRODUCT')) assertFeature(req.tenant,'pos'); }
 catch(err) { return safeError(res,err,'product-access'); }
 try {
  const q=await Quote.findOne({_id:req.params.id,tenantId:req.user.tenantId});
  if(!q)return res.status(404).json({message:'Cotización no encontrada.'});
  if(q.status!=='DRAFT')return res.status(409).json({message:'Para editar, la cotización debe estar en borrador. Puedes crear una revisión.'});
  if(!await verifyReferences(req.user.tenantId,data))return res.status(404).json({message:'Referencias no disponibles para tu empresa.'});
  if(q.versions.length>=50)return res.status(409).json({message:'Límite de 50 versiones alcanzado. Crea una nueva cotización.'});
  Object.assign(q,data);
  q.revision+=1;
  q.versions.push(itemVersion(q,req.user._id));
  record(q,'EDITED',req.user._id);
  q.recommendation={text:'',generatedAt:null};
  await q.save();
  res.json({quote:present(q,await policyFor(req.user.tenantId))});
 }catch(err){safeError(res,err,'update');}
}
async function transition(req,res) {
 if(!isId(req.params.id))return res.status(400).json({message:'Identificador inválido.'});
 const action=req.body?.action;
 const cfg=STATUSES[action];
 if(!cfg)return res.status(400).json({message:'Acción no permitida.'});
 const note=clean(req.body?.note);
 if(note.length>500)return res.status(400).json({message:'Máximo 500 caracteres en el motivo.'});
 if(['accept','reject'].includes(action)&&note.length<10)return res.status(400).json({message:'Registra al menos 10 caracteres con la confirmación o motivo del cliente.'});
 try {
  const q=await Quote.findOne({_id:req.params.id,tenantId:req.user.tenantId});
  if(!q)return res.status(404).json({message:'Cotización no encontrada.'});
  if(q.status!==cfg[0])return res.status(409).json({message:`Acción ${action} no disponible para una cotización ${q.status}.`});
  const policy=await policyFor(req.user.tenantId);
  if(action==='approve' && q.marginPct<policy.minimumMarginPct) return res.status(409).json({message:`El margen ${q.marginPct}% está por debajo del mínimo ${policy.minimumMarginPct}%. Corrige los precios o cambia la política con autorización.`});
  if(['submit','approve','send','accept'].includes(action)&&q.validUntil<new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))return res.status(409).json({message:'La cotización venció. Crea una nueva revisión con vigencia actual.'});
  if(action==='revise') {
   if(q.versions.length>=50)return res.status(409).json({message:'Se alcanzó el límite de 50 versiones. Crea otra cotización.'});
   q.status='DRAFT';q.sentAt=null;q.recommendation={text:'',generatedAt:null};
   q.revision+=1;q.versions.push(itemVersion(q,req.user._id));
  }else {
   q.status=cfg[1];
   if(action==='send')q.sentAt=new Date();
   if(action==='accept')q.acceptedAt=new Date();
  }
  record(q,action.toUpperCase(),req.user._id,note);
  await q.save();
  res.json({quote:present(q,policy),message:action==='send'?'Marcada como enviada manualmente. Esta acción NO envía un correo.':'Estado actualizado.'});
 }catch(err){safeError(res,err,'transition');}
}
async function recommend(req,res) {
 if(!isId(req.params.id))return res.status(400).json({message:'Identificador inválido.'});
 try {
  const q=await Quote.findOne({_id:req.params.id,...permitted(req)});
  if(!q)return res.status(404).json({message:'Cotización no encontrada.'});
  if(q.recommendation?.generatedAt && Date.now()-new Date(q.recommendation.generatedAt).getTime()<7200000) return res.json({recommendation:q.recommendation,cached:true});
  if(!process.env.GEMINI_API_KEY)return res.status(503).json({message:'Gemini no está configurado para FinCotiza.'});
  const policy=await policyFor(req.user.tenantId);
  const risk=assess(q,policy);
  const opp=q.opportunityId?await Opportunity.findOne({_id:q.opportunityId,tenantId:req.user.tenantId,assignedTo:q.assignedTo}).select('stage encounters.type encounters.outcome encounters.happenedAt').lean():null;
  const history=opp?.encounters?.slice(-12).map(encounter=>({type:encounter.type,outcome:encounter.outcome,daysAgo:Math.max(0,Math.floor((Date.now()-new Date(encounter.happenedAt).getTime())/86400000))}))||[];
  const data={status:q.status,marginPct:q.marginPct,minimumMarginPct:policy.minimumMarginPct,maxLineDiscount:q.maxLineDiscount,approvalDiscountPct:policy.approvalDiscountPct,risks:risk.flags,validUntil:q.validUntil,daysSinceSent:q.sentAt?Math.floor((Date.now()-new Date(q.sentAt).getTime())/86400000):null,opportunityStage:opp?.stage||null,encounters:history,numberOfLines:q.lines.length};
  const {GoogleGenAI}=require('@google/genai');
  const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
  await consumeQuota(requestQuota(req,'aiRequests','quotes'));
  const response=await ai.models.generateContent({model:process.env.FINCRM_OPPORTUNITY_GEMINI_MODEL||'gemini-3.5-flash-lite',contents:JSON.stringify(data),config:{systemInstruction:'Eres asistente comercial de FinCRM. Escribe en español como máximo 140 palabras. Recibes SOLO indicadores verificados y sin datos personales. Explica 1) riesgo, 2) próxima acción sugerida y 3) información que falta. No inventes probabilidad estadística, compromisos, ventas ni autorizaciones. No ordenes descuentos fuera de política, envíos automáticos ni facturas.',temperature:0.2,maxOutputTokens:400,httpOptions:{timeout:20000}}});
  const text=clean(response.text).slice(0,4000);
  if(!text) return res.status(502).json({message:'Gemini no generó una respuesta.'});
  q.recommendation={text,generatedAt:new Date()};
  await q.save();
  res.json({recommendation:q.recommendation,cached:false});
 }catch(err){safeError(res,err,'recommend');}
}
module.exports={options,getPolicy,updatePolicy,list,detail,create,update,transition,recommend};
