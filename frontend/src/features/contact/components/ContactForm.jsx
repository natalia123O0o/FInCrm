import { useEffect, useState } from 'react';
import { contactSchema } from '../schemas/contact.schema.js';
import { sendContact } from '../services/contact.api.js';

const EMPTY = {nombre:'',empresa:'',correo:'',telefono:'',planInteres:'',mensaje:'',aceptaDatos:false,website:''};
export default function ContactForm({onSuccess,onError,onSending,selectedPlan=''}){
 const [values,setValues]=useState(EMPTY);
 const [errors,setErrors]=useState({});
 const [status,setStatus]=useState('idle');
 const [serverError,setServerError]=useState('');
 useEffect(()=>{if(selectedPlan)setValues(v=>({...v,planInteres:selectedPlan}));},[selectedPlan]);
 const change=e=>{
  const {name,type,checked,value}=e.target;
  setValues(v=>({...v,[name]:type==='checkbox'?checked:value}));
  setErrors(old=>({...old,[name]:undefined}));
 };
 const submit=async e=>{
  e.preventDefault();setServerError('');
  const parsed=contactSchema.safeParse(values);
  if(!parsed.success){
   const next={};for(const issue of parsed.error.issues)next[issue.path[0]]=issue.message;
   setErrors(next);return;
  }
  setStatus('sending');onSending?.();
  try{
   await sendContact(parsed.data);
   setStatus('success');onSuccess?.();
  }catch(err){
   setStatus('error');setServerError(err.message||'No pudimos enviar la solicitud. Intenta nuevamente.');onError?.();
  }
 };
 const busy=status==='sending';
 return <form className="cf" noValidate onSubmit={submit}>
  <div className="cf__two">
   <div className="cf__field"><label htmlFor="contact-nombre">Nombre completo <b>*</b></label><input id="contact-nombre" name="nombre" autoComplete="name" required maxLength={80} value={values.nombre} onChange={change} disabled={busy} aria-invalid={Boolean(errors.nombre)}/>{errors.nombre&&<small className="cf__error" role="alert">{errors.nombre}</small>}</div>
   <div className="cf__field"><label htmlFor="contact-empresa">Empresa <b>*</b></label><input id="contact-empresa" name="empresa" autoComplete="organization" required maxLength={100} value={values.empresa} onChange={change} disabled={busy} aria-invalid={Boolean(errors.empresa)}/>{errors.empresa&&<small className="cf__error" role="alert">{errors.empresa}</small>}</div>
  </div>
  <div className="cf__two">
   <div className="cf__field"><label htmlFor="contact-correo">Correo electrónico <b>*</b></label><input id="contact-correo" type="email" name="correo" autoComplete="email" required maxLength={254} value={values.correo} onChange={change} disabled={busy} aria-invalid={Boolean(errors.correo)}/>{errors.correo&&<small className="cf__error" role="alert">{errors.correo}</small>}</div>
   <div className="cf__field"><label htmlFor="contact-telefono">Teléfono (opcional)</label><input id="contact-telefono" type="tel" name="telefono" autoComplete="tel" placeholder="300 123 4567" maxLength={25} value={values.telefono} onChange={change} disabled={busy} aria-invalid={Boolean(errors.telefono)}/>{errors.telefono&&<small className="cf__error" role="alert">{errors.telefono}</small>}</div>
  </div>
  <div className="cf__field"><label htmlFor="contact-plan">¿Qué plan te interesa?</label><select id="contact-plan" name="planInteres" value={values.planInteres} onChange={change} disabled={busy}>
   <option value="">Aún no lo sé</option><option value="ESSENTIAL">Esencial</option><option value="BUSINESS">Negocio</option><option value="INTELLIGENT">Inteligente</option>{values.planInteres&&! ['ESSENTIAL','BUSINESS','INTELLIGENT'].includes(values.planInteres)&&<option value={values.planInteres}>Plan seleccionado ({values.planInteres})</option>}
  </select></div>
  <div className="cf__field"><label htmlFor="contact-mensaje">¿Qué necesitas resolver? <b>*</b></label><textarea id="contact-mensaje" name="mensaje" rows={4} required maxLength={1000} value={values.mensaje} onChange={change} disabled={busy} aria-invalid={Boolean(errors.mensaje)} placeholder="Me interesa organizar mis cotizaciones y probar el asistente con IA..."/><div className="cf__counter">{values.mensaje.length}/1000</div>{errors.mensaje&&<small className="cf__error" role="alert">{errors.mensaje}</small>}</div>
  <div className="cf__honeypot" aria-hidden="true"><label htmlFor="contact-website">No completar</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={change}/></div>
  <div className="cf__field"><label className="cf__consent"><input type="checkbox" name="aceptaDatos" checked={values.aceptaDatos} onChange={change} disabled={busy}/>Autorizo el tratamiento de mis datos únicamente para responder esta solicitud. No acepto publicidad por este hecho.</label>{errors.aceptaDatos&&<small role="alert" className="cf__error">{errors.aceptaDatos}</small>}</div>
  {serverError&&<div className="cf__server-error" role="alert">{serverError}</div>}
  <button type="submit" disabled={busy} className="btn btn--primary cf__submit">{busy?'Enviando solicitud…':'Enviar solicitud'}</button>
  <p className="cf__fineprint">Tus datos se envían de forma segura al servidor FinCRM y se utilizan para responderte mediante Brevo. No se agregan automáticamente a campañas de marketing.</p>
 </form>;
}
