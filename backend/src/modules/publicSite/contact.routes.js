'use strict';
const router = require('express').Router();
const { z } = require('zod');

// Límite básico por IP. Para varias instancias usar Redis o un rate limiter persistente.
const attempts = new Map();
const INTERVAL = 60 * 60 * 1000;
const MAX_REQUESTS = 8;
const planNames = { ESSENTIAL:'Esencial', BUSINESS:'Negocio', INTELLIGENT:'Inteligente' };
const schema = z.object({
 nombre:z.string().trim().min(2).max(80),
 empresa:z.string().trim().min(2).max(100),
 correo:z.string().trim().email().max(254),
 telefono:z.string().trim().max(25).refine(v=>!v||/^[+()0-9\s-]{7,25}$/.test(v)),
 planInteres:z.string().trim().regex(/^[A-Z0-9_-]{0,40}$/),
 mensaje:z.string().trim().min(10).max(1000),
 aceptaDatos:z.literal(true),
 website:z.string().max(200).optional().default(''),
}).strict();

function escapeHTML(text){
 return String(text||'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function renderEmail(data){
 const items=[['Nombre',data.nombre],['Empresa',data.empresa],['Correo',data.correo],['Teléfono',data.telefono||'No indicó'],['Plan de interés',planNames[data.planInteres]||data.planInteres||'Sin definir'],['Mensaje',data.mensaje]];
 const rows=items.map(([key,value])=>`<tr><th style="padding:12px 16px;text-align:left;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;vertical-align:top;width:30%">${escapeHTML(key)}</th><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;white-space:pre-wrap">${escapeHTML(value)}</td></tr>`).join('');
 return `<!doctype html><html lang="es"><body style="margin:0;padding:40px 12px;background:#f8fafc;font-family:Arial,sans-serif"><main style="max-width:610px;margin:auto;background:white;border-radius:18px;overflow:hidden;border:1px solid #cbd5e1"><header style="background:#0f172a;padding:26px 30px;color:white"><b style="font-size:24px">Fin<span style="color:#f97316">CRM</span></b><p style="margin:8px 0 0;color:#a5ecf5">Nueva solicitud de contacto desde la landing</p></header><table style="width:100%;border-collapse:collapse">${rows}</table><div style="padding:20px 30px;font-size:12px;color:#64748b">Solicitud comercial recibida desde el formulario público. No implica consentimiento para campañas.</div></main></body></html>`;
}
function limitReached(req){
 const key=req.ip || req.socket.remoteAddress || 'unknown';
 const now=Date.now();
 if(attempts.size>10000){for(const [ip,data] of attempts){if(now-data.since>INTERVAL)attempts.delete(ip)}}
 let state=attempts.get(key);
 if(!state || now-state.since>INTERVAL)state={since:now,count:0};
 state.count+=1;attempts.set(key,state);
 return state.count>MAX_REQUESTS;
}
router.post('/',async (req,res)=>{
 if(limitReached(req))return res.status(429).json({ok:false,message:'Has realizado demasiadas solicitudes. Vuelve a intentar más tarde.'});
 const result=schema.safeParse(req.body);
 if(!result.success)return res.status(400).json({ok:false,message:'Revisa los campos y la autorización de datos.'});
 const data=result.data;
 // Campo antispam invisible para visitantes reales.
 if(data.website)return res.status(200).json({ok:true});
 const apiKey=process.env.BREVO_API_KEY;
 const sender=process.env.BREVO_SENDER_EMAIL;
 const recipient=process.env.BREVO_TO_EMAIL;
 if(!apiKey||!sender||!recipient){
  console.error('Contacto Brevo: faltan variables de entorno.');
  return res.status(503).json({ok:false,message:'El formulario no está disponible temporalmente. Intenta más tarde.'});
 }
 const params={
  NOMBRE:data.nombre, EMPRESA:data.empresa, CORREO:data.correo,
  TELEFONO:data.telefono||'No indicó',
  PLAN:planNames[data.planInteres]||data.planInteres||'Sin definir', MENSAJE:data.mensaje,
 };
 const templateId=Number(process.env.BREVO_TEMPLATE_ID);
 const body={
  sender:{email:sender,name:process.env.BREVO_SENDER_NAME||'FinCRM'},
  to:[{email:recipient,name:'Equipo FinCRM'}],
  replyTo:{email:data.correo,name:data.nombre},
  subject:`FinCRM | Nueva solicitud comercial (${data.empresa})`,
  tags:['fincrm-contacto'],
  ...(Number.isSafeInteger(templateId)&&templateId>0?{templateId,params}:{htmlContent:renderEmail(data)}),
 };
 try{
  const response=await fetch('https://api.brevo.com/v3/smtp/email',{
   method:'POST',headers:{'api-key':apiKey,'accept':'application/json','content-type':'application/json'},
   body:JSON.stringify(body),signal:AbortSignal.timeout(12000),
  });
  if(!response.ok){
   const errText=await response.text().catch(()=>'');
   console.error('Brevo rechazo un contacto',response.status,errText.slice(0,250));
   return res.status(502).json({ok:false,message:'No pudimos entregar tu solicitud en este momento. Inténtalo de nuevo.'});
  }
  return res.status(201).json({ok:true,message:'Tu solicitud se envió correctamente.'});
 }catch(error){
  console.error('Brevo contacto: error de red',error.message);
  return res.status(502).json({ok:false,message:'El servicio de contacto no está disponible temporalmente.'});
 }
});
module.exports=router;
