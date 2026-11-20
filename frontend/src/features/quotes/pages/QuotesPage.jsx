import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, FileDown, Sparkles, Pencil, ShieldCheck, RotateCcw, FileCheck, Send, CheckCircle2, XCircle, ClipboardList, Settings2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { PATHS } from '../../../routes/paths.js';
import { quotesApi, listResource } from '../services/quotes.api.js';
import { emptyLine, emptyQuote, previewTotals, fmtCOP, fmtDate, STATUSES, COLORS, ACTIONS } from '../quote.helpers.js';
import { downloadQuotePdf } from '../quote.pdf.js';
import './QuotesPage.css';

const ACTION_ICONS={submit:ClipboardList,approve:ShieldCheck,send:Send,accept:CheckCircle2,reject:XCircle,revise:RotateCcw};
const ACTION_MAP={DRAFT:['submit'],PENDING_APPROVAL:['approve','revise'],APPROVED:['send','revise'],SENT:['accept','reject','revise'],ACCEPTED:[],REJECTED:['revise']};
const numeric=x=>Number(x)||0;
function idOf(v){return typeof v==='string'?v:v?._id||'';}
function Tag({status}){return <span className={`fc-quote-tag fc-quote-tag-${COLORS[status]||'neutral'}`}>{STATUSES[status]||status}</span>;}
function Info({children}){return <p className="fc-quote-help">{children}</p>;}

export default function QuotesPage(){
 const {user,token}=useAuth();
 const modalRef=useRef(null);
 const busyRef=useRef(false);
 const aiBusyRef=useRef(false);
 const isAdmin=user?.role==='ADMIN';
 const [quotes,setQuotes]=useState([]),[clients,setClients]=useState([]),[employees,setEmployees]=useState([]),[opportunities,setOpportunities]=useState([]),[products,setProducts]=useState([]);
 const [policy,setPolicy]=useState({minimumMarginPct:20,approvalDiscountPct:10,stalledDays:5});
 const [policyDraft,setPolicyDraft]=useState({minimumMarginPct:20,approvalDiscountPct:10,stalledDays:5});
 const [showPolicy,setShowPolicy]=useState(false);
 const [form,setForm]=useState(emptyQuote),[editor,setEditor]=useState(false),[editingId,setEditingId]=useState(null);
 const [selected,setSelected]=useState(null),[selectedAction,setSelectedAction]=useState(''),[actionNote,setActionNote]=useState('');
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('ALL');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[aiBusy,setAiBusy]=useState(false);
 const [error,setError]=useState(''),[success,setSuccess]=useState('');
 const [openingId,setOpeningId]=useState(null);
 busyRef.current=busy;
 aiBusyRef.current=aiBusy;

 // Focus management and keyboard accessibility for the modal.
 useEffect(()=>{
   if(!editor&&!selected)return undefined;
   const previousFocus=document.activeElement;
   const originalOverflow=document.body.style.overflow;
   document.body.style.overflow='hidden';
   const modal=modalRef.current;
   const initiallyFocusable=editor?modal?.querySelector('input:not([disabled])'):modal?.querySelector('[data-modal-close]');
   (initiallyFocusable||modal)?.focus();
   const onKeyDown=e=>{
     if(e.key==='Escape'){
       if(busyRef.current||aiBusyRef.current)return;
       e.preventDefault();setEditor(false);setEditingId(null);setSelected(null);setSelectedAction('');setError('');
     }
     if(e.key!=='Tab'||!modalRef.current)return;
     const focusable=Array.from(modalRef.current.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
     if(!focusable.length)return;
     const first=focusable[0],last=focusable[focusable.length-1];
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   };
   document.addEventListener('keydown',onKeyDown);
   return ()=>{
     document.removeEventListener('keydown',onKeyDown);
     document.body.style.overflow=originalOverflow;
     if(previousFocus?.isConnected)previousFocus.focus();
   };
 },[editor,selected?._id]);
 const load=useCallback(async()=>{
   if(!token)return;
   setLoading(true);setError('');
   try{
     const [list,refs,opts,staff,opps]=await Promise.all([
       quotesApi.list(token),
       isAdmin?listResource(token,'/api/clients','clients'):Promise.resolve([]),
       isAdmin?quotesApi.options(token):Promise.resolve({products:[],policy:null}),
       isAdmin?listResource(token,'/api/users','users'):Promise.resolve([]),
       isAdmin?listResource(token,'/api/opportunities','opportunities'):Promise.resolve([])
     ]);
     setQuotes(list);setClients(refs.filter(c=>c.isActive!==false));setEmployees(staff.filter(u=>u.role==='USER'&&u.isActive!==false));
     setProducts(opts.products||[]);setOpportunities(opps);if(opts.policy){setPolicy(opts.policy);setPolicyDraft({minimumMarginPct:opts.policy.minimumMarginPct,approvalDiscountPct:opts.policy.approvalDiscountPct,stalledDays:opts.policy.stalledDays});}
   }catch(e){setError(e.message||'Error al consultar cotizaciones.');}
   finally{setLoading(false);}
 },[token,isAdmin]);
 useEffect(()=>{load();},[load]);
 const filtered=useMemo(()=>quotes.filter(q=>{
   const value=`${q.code} ${q.title} ${q.clientId?.name||''} ${q.assignedTo?.name||''}`.toLowerCase();
   return value.includes(search.toLowerCase().trim())&&(filter==='ALL'||(filter==='RISK'?q.risk?.flags?.length:q.status===filter));
 }),[quotes,search,filter]);
 const summary=useMemo(()=>({total:quotes.length,pending:quotes.filter(q=>['DRAFT','PENDING_APPROVAL','APPROVED','SENT'].includes(q.status)).length,accepted:quotes.filter(q=>q.status==='ACCEPTED').length,risk:quotes.filter(q=>q.risk?.flags?.length).length}),[quotes]);
 const totals=useMemo(()=>previewTotals(form.lines),[form.lines]);
 const eligibleOpps=opportunities.filter(o=>!form.clientId||idOf(o.clientId)===form.clientId);
 const alertLine=totals.net>0&&totals.marginPct<policy.minimumMarginPct;
 function field(k,v){setForm(f=>({...f,[k]:v}));}
 function lineField(i,k,v){setForm(f=>({...f,lines:f.lines.map((l,j)=>i===j?{...l,[k]:v}:l)}));}
 function setProduct(i,v){const p=products.find(x=>x._id===v);setForm(f=>({...f,lines:f.lines.map((l,j)=>i===j?{...l,productId:v,kind:'PRODUCT',description:p?.name||'',sku:p?.sku||'',unitPrice:p?String(p.price):'0'}:l)}));}
 function chooseOpportunity(v){const op=opportunities.find(o=>o._id===v);setForm(f=>({...f,opportunityId:v,clientId:op?idOf(op.clientId):f.clientId,assignedTo:op?idOf(op.assignedTo):f.assignedTo}));}
 function changeClient(v){setForm(f=>({...f,clientId:v,opportunityId:''}));}
 function closeEditor(){
   if(busyRef.current)return;
   setEditor(false);setEditingId(null);setForm(emptyQuote());setError('');
 }
 function closeDetails(){
   if(busyRef.current||aiBusyRef.current)return;
   setSelected(null);setSelectedAction('');setActionNote('');setError('');
 }
 function newQuote(){setEditor(true);setEditingId(null);setForm(emptyQuote());setSelected(null);setError('');setSuccess('');setSelectedAction('');}
 function editQuote(q){
   setForm({title:q.title||'',notes:q.notes||'',clientId:idOf(q.clientId),assignedTo:idOf(q.assignedTo),opportunityId:idOf(q.opportunityId),validUntil:q.validUntil?.slice(0,10)||'',lines:(q.lines||[]).map(l=>({kind:l.kind,productId:idOf(l.productId),description:l.description,quantity:l.quantity,unitPrice:l.unitPrice,unitCost:l.unitCost,discountPct:l.discountPct,taxRate:l.taxRate,sku:l.sku||''}))});
   setEditingId(q._id);setEditor(true);setError('');setSuccess('');setSelected(null);setSelectedAction('');
 }
 async function openQuote(id,mode='edit'){
   if(openingId)return;
   setOpeningId(id);setError('');setSuccess('');setSelectedAction('');
   try{
     const quote=await quotesApi.detail(token,id);
     if(mode==='edit'&&isAdmin&&quote.status==='DRAFT')editQuote(quote);
     else {setEditor(false);setSelected(quote);}
   }catch(e){setError(e.message||'No se pudo abrir la cotización.');}
   finally{setOpeningId(null);}
 }
 async function refreshSelected(id){setSelected(await quotesApi.detail(token,id));}
 async function save(e){e.preventDefault();if(busy)return;setBusy(true);setError('');setSuccess('');try{
   const payload={...form,opportunityId:form.opportunityId||null,lines:form.lines.map(l=>({...l,productId:l.kind==='PRODUCT'?l.productId:null,quantity:numeric(l.quantity),unitPrice:numeric(l.unitPrice),unitCost:numeric(l.unitCost),discountPct:numeric(l.discountPct),taxRate:numeric(l.taxRate)}))};
   const wasEditing=Boolean(editingId);
   if(wasEditing)await quotesApi.update(token,editingId,payload);
   else await quotesApi.create(token,payload);
   setEditor(false);setEditingId(null);setSelected(null);setForm(emptyQuote());
   await load();
   setSuccess(wasEditing?'Cotización actualizada correctamente.':'Cotización guardada en MongoDB.');
 }catch(e){setError(e.message||'No se pudo guardar.');}finally{setBusy(false);}}
 async function confirmAction(){if(!selectedAction||!selected)return;setBusy(true);setError('');setSuccess('');try{
   const result=await quotesApi.transition(token,selected._id,selectedAction,actionNote.trim());
   setSuccess(result.message||'Estado actualizado.');setSelectedAction('');setActionNote('');await load();await refreshSelected(selected._id);
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 async function generateAdvice(){if(!selected)return;setAiBusy(true);setError('');try{await quotesApi.recommend(token,selected._id);await refreshSelected(selected._id);}catch(e){setError(e.message);}finally{setAiBusy(false);}}
 async function savePolicy(e){e.preventDefault();setBusy(true);setError('');try{await quotesApi.policy(token,policyDraft);setSuccess('Política de márgenes actualizada.');setShowPolicy(false);await load();if(selected)await refreshSelected(selected._id);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <main className="fc-quote-page">
   <Link to={isAdmin?PATHS.dashboard:PATHS.userDashboard} className="fc-quote-back"><ArrowLeft size={17}/> Volver al panel</Link>
   <header className="fc-quote-heading"><div><h1>{isAdmin?'FinCotiza':'Mis cotizaciones'}</h1><p>{isAdmin?'Propuestas comerciales, rentabilidad y seguimiento del equipo.':'Cotizaciones asociadas a tus oportunidades.'}</p></div><div className="fc-quote-top-actions">{isAdmin&&<button className="fc-quote-btn fc-quote-primary" onClick={newQuote} disabled={loading}><Plus size={19}/> Nueva cotización</button>}{isAdmin&&<button className="fc-quote-btn fc-quote-outline" onClick={()=>setShowPolicy(v=>!v)}><Settings2 size={18}/> Política</button>}<button className="fc-quote-btn fc-quote-outline" onClick={load} disabled={loading||busy}><RefreshCw size={18}/> Actualizar</button></div></header>
   {error&&<div className="fc-quote-feedback fc-quote-feedback-error" role="alert">{error}</div>}
   {success&&<div className="fc-quote-feedback fc-quote-feedback-success" role="status">{success}</div>}
   {isAdmin&&showPolicy&&<section className="fc-quote-card"><h2>Política de precios de tu empresa</h2><Info>Se aplica solo a cotizaciones de tu empresa. Los costos de FinPOS no están registrados: introdúcelos para calcular márgenes.</Info><form className="fc-quote-fields" onSubmit={savePolicy}>
      <label>Margen mínimo (%)<input type="number" min="0" max="95" step="0.5" required value={policyDraft.minimumMarginPct} onChange={e=>setPolicyDraft(p=>({...p,minimumMarginPct:Number(e.target.value)}))}/></label>
      <label>Descuento que requiere revisión (%)<input type="number" min="0" max="100" step="0.5" required value={policyDraft.approvalDiscountPct} onChange={e=>setPolicyDraft(p=>({...p,approvalDiscountPct:Number(e.target.value)}))}/></label>
      <label>Días para detectar estancamiento<input type="number" min="1" max="90" step="1" required value={policyDraft.stalledDays} onChange={e=>setPolicyDraft(p=>({...p,stalledDays:Number(e.target.value)}))}/></label>
      <div className="fc-quote-form-actions"><button type="button" className="fc-quote-btn fc-quote-outline" onClick={()=>setShowPolicy(false)}>Cancelar</button><button className="fc-quote-btn fc-quote-primary" disabled={busy}>Guardar política</button></div>
    </form></section>}
   {editor&&isAdmin&&<div className="fc-quote-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)closeEditor();}}>
     <section ref={modalRef} className="fc-quote-modal" role="dialog" aria-modal="true" aria-labelledby="fc-edit-heading" tabIndex={-1}>
     <div className="fc-quote-modal-header">
     <div className="fc-quote-section-head"><div><h2 id="fc-edit-heading">{editingId?'Editar cotización':'Nueva cotización'}</h2><Info>{editingId?'Edita los campos y confirma con Guardar cambios. Los cambios no se aplican hasta guardar.':'Los datos se validan en el backend y se separan por empresa.'}</Info></div><button type="button" data-modal-close className="fc-quote-icon-btn" aria-label="Cancelar y cerrar formulario" disabled={busy} onClick={closeEditor}><X size={20}/></button></div>
     </div>
     <div className="fc-quote-modal-body">
     {error&&<div className="fc-quote-feedback fc-quote-feedback-error" role="alert">{error}</div>}
     <form id="fc-quote-edit-form" onSubmit={save}>
       <div className="fc-quote-fields">
         <label>Título de la propuesta *<input required maxLength={120} placeholder="Ej. Implementación de software" value={form.title} onChange={e=>field('title',e.target.value)}/></label>
         <label>Cliente *<select required value={form.clientId} disabled={Boolean(form.opportunityId)} onChange={e=>changeClient(e.target.value)}><option value="">Selecciona un cliente</option>{clients.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
         <label>Oportunidad (opcional)<select value={form.opportunityId} onChange={e=>chooseOpportunity(e.target.value)}><option value="">Sin oportunidad vinculada</option>{eligibleOpps.map(o=><option key={o._id} value={o._id}>{o.title} — {o.clientId?.name}</option>)}</select></label>
         <label>Responsable USER *<select required disabled={Boolean(form.opportunityId)} value={form.assignedTo} onChange={e=>field('assignedTo',e.target.value)}><option value="">Selecciona empleado</option>{employees.map(u=><option key={u._id} value={u._id}>{u.name}</option>)}</select></label>
         <label>Válida hasta *<input required type="date" value={form.validUntil} onChange={e=>field('validUntil',e.target.value)}/></label>
         <label className="fc-quote-wide">Condiciones comerciales<textarea rows={2} maxLength={2000} placeholder="Escribe condiciones confirmadas con el cliente" value={form.notes} onChange={e=>field('notes',e.target.value)}/></label>
       </div>
       <div className="fc-quote-section-head"><div><h3>Productos y servicios</h3><Info>Los precios y costos son valores antes de impuestos. El sistema no asume automáticamente la tasa tributaria.</Info></div></div>
       {form.lines.map((l,i)=><div className="fc-quote-line" key={i}>
          <div className="fc-quote-line-head"><strong>Línea {i+1}</strong><button className="fc-quote-btn fc-quote-outline fc-quote-small" type="button" disabled={form.lines.length===1} onClick={()=>field('lines',form.lines.filter((_,j)=>i!==j))}>Quitar</button></div>
          <div className="fc-quote-line-grid">
            <label>Tipo<select value={l.kind} onChange={e=>{const kind=e.target.value;setForm(f=>({...f,lines:f.lines.map((x,j)=>i===j?{...emptyLine(),kind}:x)}));}}><option value="SERVICE">Servicio</option><option value="PRODUCT">Producto FinPOS</option></select></label>
            {l.kind==='PRODUCT'&&<label className="fc-quote-line-desc">Producto<select required value={l.productId||''} onChange={e=>setProduct(i,e.target.value)}><option value="">Selecciona un producto</option>{products.map(p=><option key={p._id} value={p._id}>{p.name} · {fmtCOP(p.price)}</option>)}</select></label>}
            <label className="fc-quote-line-desc">Descripción<input required maxLength={180} value={l.description} onChange={e=>lineField(i,'description',e.target.value)}/></label>
            <label>Cantidad<input required type="number" min="1" max="100000" step="1" value={l.quantity} onChange={e=>lineField(i,'quantity',e.target.value)}/></label>
            <label>Precio unitario<input required type="number" min="0" max="1000000000000" step="0.01" value={l.unitPrice} onChange={e=>lineField(i,'unitPrice',e.target.value)}/></label>
            <label>Costo unitario estimado<input required type="number" min="0" max="1000000000000" step="0.01" value={l.unitCost} onChange={e=>lineField(i,'unitCost',e.target.value)}/></label>
            <label>Descuento (%)<input type="number" min="0" max="100" step="0.5" value={l.discountPct} onChange={e=>lineField(i,'discountPct',e.target.value)}/></label>
            <label>Impuesto (%)<select value={l.taxRate} onChange={e=>lineField(i,'taxRate',e.target.value)}><option value={0}>0 %</option><option value={5}>5 %</option><option value={19}>19 %</option></select></label>
          </div>
          {numeric(l.unitCost)>0&&<p className="fc-quote-price-hint">Precio mínimo orientativo por unidad para conservar un margen del {policy.minimumMarginPct}% con este descuento: <strong>{numeric(l.discountPct)>=100?'No viable':fmtCOP(numeric(l.unitCost)/(1-policy.minimumMarginPct/100)/(1-numeric(l.discountPct)/100))}</strong>. No incluye impuestos ni gastos adicionales.</p>}
       </div>)}
       <button type="button" className="fc-quote-btn fc-quote-outline" disabled={form.lines.length>=40} onClick={()=>field('lines',[...form.lines,emptyLine()])}><Plus size={18}/> Agregar línea</button>
       <div className="fc-quote-calculation"><div><span>Subtotal</span><strong>{fmtCOP(totals.net)}</strong></div><div><span>Impuestos</span><strong>{fmtCOP(totals.tax)}</strong></div><div><span>Total cotizado</span><strong>{fmtCOP(totals.total)}</strong></div><div><span>Margen estimado, antes de impuestos</span><strong>{totals.marginPct.toFixed(1)}%</strong></div></div>
       {alertLine&&<div className="fc-quote-feedback fc-quote-feedback-error">El margen es inferior al mínimo establecido de {policy.minimumMarginPct}%. No podrá aprobarse hasta corregirlo.</div>}
     </form>
     </div>
     <footer className="fc-quote-modal-footer">
       <button type="button" className="fc-quote-btn fc-quote-outline" onClick={closeEditor} disabled={busy}>Cancelar</button>
       <button type="submit" form="fc-quote-edit-form" className="fc-quote-btn fc-quote-primary" disabled={busy||loading}>{busy?'Guardando…':editingId?'Guardar cambios':'Guardar cotización'}</button>
     </footer>
     </section>
   </div>}
   <div className="fc-quote-kpis"><div className="fc-quote-kpi"><span>Total</span><strong>{summary.total}</strong></div><div className="fc-quote-kpi"><span>Abiertas</span><strong>{summary.pending}</strong></div><div className="fc-quote-kpi"><span>Aceptadas</span><strong>{summary.accepted}</strong></div><div className="fc-quote-kpi"><span>Con alertas</span><strong>{summary.risk}</strong></div></div>
   <section className="fc-quote-card"><div className="fc-quote-section-head"><div><h2>Directorio de cotizaciones</h2><Info>{filtered.length} de {quotes.length} cotizaciones · solo datos de tu empresa.</Info></div></div>
     <div className="fc-quote-filter"><label>Buscar<input placeholder="Número, cliente, oportunidad…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Estado<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">Todos</option>{Object.entries(STATUSES).map(([k,v])=><option value={k} key={k}>{v}</option>)}<option value="RISK">Con alertas</option></select></label><button className="fc-quote-btn fc-quote-outline" type="button" onClick={()=>{setSearch('');setFilter('ALL');}}>Limpiar filtros</button></div>
     {loading?<p role="status" className="fc-quote-empty">Cargando cotizaciones…</p>:filtered.length===0?<div className="fc-quote-empty">No hay cotizaciones con estos filtros. {isAdmin?'Puedes crear la primera cotización.':''}</div>:<div className="fc-quote-scroll"><table className="fc-quote-table"><thead><tr><th>Cotización</th><th>Cliente</th><th>Total</th><th>Vigencia</th><th>Estado</th><th>Riesgo</th><th>Acciones</th></tr></thead><tbody>{filtered.map(q=><tr key={q._id}><td><strong>{q.code}</strong><small>{q.title}</small></td><td>{q.clientId?.name||'—'}</td><td>{fmtCOP(q.total)}</td><td>{q.validUntil}</td><td><Tag status={q.status}/></td><td><span className={`fc-quote-risk fc-quote-risk-${q.risk?.level||'LOW'}`}>{q.risk?.flags?.length?`${q.risk.flags.length} alerta(s)`:'Normal'}</span></td><td><div className="fc-quote-row-actions"><button type="button" className="fc-quote-btn fc-quote-dark fc-quote-small" disabled={openingId===q._id} onClick={()=>openQuote(q._id)}>{openingId===q._id?'Abriendo…':isAdmin&&q.status==='DRAFT'?'Editar':'Consultar'}</button>{isAdmin&&q.status==='DRAFT'&&<button type="button" className="fc-quote-btn fc-quote-outline fc-quote-small" disabled={openingId===q._id} onClick={()=>openQuote(q._id,'details')}>Opciones</button>}</div></td></tr>)}</tbody></table></div>}
   </section>
   {selected&&!editor&&<div className="fc-quote-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)closeDetails();}}>
   <section ref={modalRef} className="fc-quote-modal fc-quote-modal-details" role="dialog" aria-modal="true" aria-labelledby="fc-quote-details" tabIndex={-1}>
   <div className="fc-quote-modal-body"><div className="fc-quote-section-head"><div><h2 id="fc-quote-details">{selected.code} · {selected.title}</h2><Info>Versión {selected.revision} · Cliente {selected.clientId?.name||'—'} · Responsable {selected.assignedTo?.name||'—'}</Info></div><button className="fc-quote-icon-btn" data-modal-close aria-label="Cerrar detalle" type="button" disabled={busy||aiBusy} onClick={closeDetails}><X size={20}/></button></div>
      {error&&<div className="fc-quote-feedback fc-quote-feedback-error" role="alert">{error}</div>}
      {isAdmin&&selected.status!=='DRAFT'&&<div className="fc-quote-feedback">Esta cotización está en estado <strong>{STATUSES[selected.status]}</strong>. Para modificar sus importes, crea una revisión desde las opciones disponibles.</div>}
      <div className="fc-quote-details-row"><Tag status={selected.status}/><strong>{fmtCOP(selected.total)}</strong><span>Margen: {selected.marginPct}%</span><span>Válida hasta: {selected.validUntil}</span></div>
      <h3>Detalle de la cotización</h3>
      <div className="fc-quote-scroll"><table className="fc-quote-table"><thead><tr><th>Concepto</th><th>Cantidad</th><th>Precio</th><th>Descuento</th><th>Impuesto</th><th>Total</th></tr></thead><tbody>{selected.lines.map((l,i)=><tr key={i}><td>{l.description}</td><td>{l.quantity}</td><td>{fmtCOP(l.unitPrice)}</td><td>{l.discountPct}%</td><td>{l.taxRate}%</td><td>{fmtCOP(l.total)}</td></tr>)}</tbody></table></div>
      <div className="fc-quote-calculation"><div><span>Subtotal</span><strong>{fmtCOP(selected.net)}</strong></div><div><span>Impuestos</span><strong>{fmtCOP(selected.tax)}</strong></div><div><span>Total cotizado</span><strong>{fmtCOP(selected.total)}</strong></div></div>
      {selected.notes&&<p className="fc-quote-note"><strong>Condiciones:</strong> {selected.notes}</p>}
      <div className="fc-quote-risk-panel"><h3>Evaluación comercial por reglas</h3><Info>No es una probabilidad estadística de cierre. Se basa en fechas, descuentos y margen registrado.</Info>{selected.risk?.flags?.length?<ul>{selected.risk.flags.map((m,i)=><li key={i}>{m}</li>)}</ul>:<p>Sin alertas con los datos actuales.</p>}</div>
      <div className="fc-quote-actions"><button type="button" className="fc-quote-btn fc-quote-outline" onClick={()=>downloadQuotePdf(selected)}><FileDown size={18}/> Descargar PDF comercial</button>{isAdmin&&selected.status==='DRAFT'&&<button type="button" className="fc-quote-btn fc-quote-dark" onClick={()=>editQuote(selected)}><Pencil size={18}/> Editar borrador</button>}{isAdmin&&(ACTION_MAP[selected.status]||[]).map(action=>{const Icon=ACTION_ICONS[action];return <button type="button" key={action} className="fc-quote-btn fc-quote-dark" onClick={()=>{setSelectedAction(action);setActionNote('');}}><Icon size={18}/>{ACTIONS[action]}</button>;})}</div>
      {selectedAction&&isAdmin&&<div className="fc-quote-confirm"><h3>Confirmar: {ACTIONS[selectedAction]}</h3><Info>{selectedAction==='send'?'Esto registra que enviaste la propuesta por un canal externo; NO envía correo ni WhatsApp.':selectedAction==='accept'?'Registra la confirmación del cliente. NO crea una venta, deuda ni factura.':'El evento quedará guardado en el historial.'}</Info><label>Motivo o evidencia {['accept','reject'].includes(selectedAction)?'*':''}<textarea rows={2} maxLength={500} value={actionNote} onChange={e=>setActionNote(e.target.value)} placeholder="Ej. Confirmación recibida por llamada el día de hoy"/></label><div className="fc-quote-form-actions"><button className="fc-quote-btn fc-quote-outline" onClick={()=>setSelectedAction('')} disabled={busy}>Cancelar</button><button className="fc-quote-btn fc-quote-primary" type="button" onClick={confirmAction} disabled={busy||(['accept','reject'].includes(selectedAction)&&actionNote.trim().length<10)}>{busy?'Guardando…':'Confirmar acción'}</button></div></div>}
      <div className="fc-quote-advice"><div className="fc-quote-section-head"><div><h3>Asesor comercial con Gemini</h3><Info>Recibe solo indicadores estructurados; no enviamos nombres, correos ni notas del cliente.</Info></div><button type="button" className="fc-quote-btn fc-quote-ai" onClick={generateAdvice} disabled={aiBusy}><Sparkles size={18}/>{aiBusy?'Analizando…':'Sugerir siguiente acción'}</button></div>{selected.recommendation?.text?<div className="fc-quote-markdown"><ReactMarkdown>{selected.recommendation.text}</ReactMarkdown><small>Recomendación asistida. Requiere revisión humana.</small></div>:<Info>Disponible bajo demanda si Gemini está configurado en el backend.</Info>}</div>
      <div className="fc-quote-history"><h3>Historial de cambios</h3>{!selected.events?.length?<Info>Sin eventos.</Info>:<ol>{[...selected.events].reverse().map((ev,i)=><li key={i}><strong>{ev.kind}</strong><span>{fmtDate(ev.at)}</span>{ev.note&&<p>{ev.note}</p>}</li>)}</ol>}</div>
      {selected.versions?.length>0&&<div className="fc-quote-history"><h3>Versiones registradas</h3><Info>{selected.versions.map(v=>`Versión ${v.number} (${fmtCOP(v.total)})`).join(' · ')}</Info></div>}
   </div></section></div>}
  </main>;
}
