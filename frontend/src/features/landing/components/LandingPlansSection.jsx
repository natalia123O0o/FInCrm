import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import './landing-plans.css';

// Referencia inicial basada en el catálogo de planes del backend (seedPlans).
// Los planes activos del SUPER_ADMIN reemplazan estos valores cuando la API está disponible.
const EXAMPLES = [
  {code:'ESSENTIAL',name:'Esencial',monthlyPriceCOP:39900,description:'CRM comercial, cotizaciones y asistente IA para empezar.',modules:['crm','activities','opportunities','quotes','messaging','ai'],limits:{maxActiveUsers:3,aiRequestsPerMonth:50,quotesPerMonth:30}},
  {code:'BUSINESS',name:'Negocio',monthlyPriceCOP:79900,description:'Campañas personalizadas y mayor capacidad comercial.',modules:['crm','activities','opportunities','quotes','campaigns','messaging','ai'],limits:{maxActiveUsers:10,aiRequestsPerMonth:200,quotesPerMonth:200}},
  {code:'INTELLIGENT',name:'Inteligente',monthlyPriceCOP:129900,description:'CRM, campañas, IA y FinPOS con inventario.',modules:['crm','activities','opportunities','quotes','campaigns','messaging','ai','pos'],limits:{maxActiveUsers:25,aiRequestsPerMonth:600,quotesPerMonth:1000}},
];
const money = n=> new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
const LABELS={crm:'Clientes y cartera',activities:'Actividades y tareas',opportunities:'Oportunidades',quotes:'Cotizaciones',campaigns:'Campañas',messaging:'Mensajería',ai:'Asistente con IA',pos:'FinPOS e inventario',radar:'FinRadar'};
const BASE=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'') || (import.meta.env.DEV ? 'http://localhost:4000' : '');

export default function LandingPlansSection({onChoosePlan}){
 const [plans,setPlans]=useState(EXAMPLES);
 const [live,setLive]=useState(false);
 useEffect(()=>{
   const controller=new AbortController();
   fetch(`${BASE}/api/public/plans`,{signal:controller.signal})
     .then(async r=>{if(!r.ok)throw Error('No disponible');return r.json()})
     .then(data=>{if(Array.isArray(data.plans)&&data.plans.length){setPlans(data.plans);setLive(true)}})
     .catch(()=>{});
   return ()=>controller.abort();
 },[]);
 return <section className="lp section" id="planes" data-bg="light" data-nav-theme="light">
   <div className="container">
     <div className="lp__intro"><span className="section-label">PLANES FINCRM</span><h2>Elige la inteligencia que tu negocio necesita.</h2><p>{plans.every(plan => ['quotes','ai'].every(module => (plan.modules || []).includes(module))) ? 'Los tres planes incluyen cotizaciones y asistente con IA. Cambian los cupos, usuarios y herramientas disponibles.' : 'Elige un plan segun las funciones, usuarios y cuotas disponibles. Consulta el asistente y las cotizaciones en los planes que los incluyen.'}</p></div>
     <div className="lp__grid">{plans.map((plan,i)=>{
       const featured=plan.code==='BUSINESS'||(!plans.some(p=>p.code==='BUSINESS')&&i===1);
       return <article key={plan.code||plan._id||i} className={`lp__card ${featured?'lp__card--featured':''}`}>
        {featured&&<div className="lp__badge">RECOMENDADO</div>}
        <div className="lp__card-top"><span className="lp__plan-name">{plan.name}</span><Sparkles aria-hidden="true" size={20}/></div>
        <div className="lp__price">{money(plan.monthlyPriceCOP)} <span>/ mes</span></div>
        <p className="lp__description">{plan.description||'Plan empresarial FinCRM.'}</p>
        <div className="lp__rule"/>
        <ul className="lp__features">{(plan.modules||[]).filter(m=>LABELS[m]).map(m=><li key={m}><Check size={15} aria-hidden="true"/>{LABELS[m]}</li>)}
         <li><Check size={15} aria-hidden="true"/>Hasta {plan.limits?.maxActiveUsers??'-'} usuarios</li>
         {(plan.modules||[]).includes('ai')&&<li><Check size={15} aria-hidden="true"/>{plan.limits?.aiRequestsPerMonth??'-'} consultas IA / mes</li>}
         {(plan.modules||[]).includes('quotes')&&<li><Check size={15} aria-hidden="true"/>{plan.limits?.quotesPerMonth??'-'} cotizaciones / mes</li>}
        </ul>
        <button className={`btn ${featured?'btn--primary':'btn--ghost'} lp__button`} type="button" onClick={()=>onChoosePlan(plan.code)}>Solicitar información</button>
       </article>;
     })}</div>
     <p className="lp__note">{live?'Precios y módulos consultados del catálogo activo de FinCRM. Solicita confirmación comercial antes de contratar.':'Precios orientativos de presentación. Para mostrar planes actuales del SUPER_ADMIN, conecta el backend y configura VITE_API_URL.'} La disponibilidad de cada módulo depende de la suscripción y del estado de desarrollo.</p>
   </div>
 </section>;
}
