import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {Plus,RefreshCw,Pencil,ClipboardCheck,ArrowLeft,CheckCircle2,PauseCircle,Play,SquareCheck,Filter} from 'lucide-react';
import {useAuth} from '../../auth/context/AuthContext.jsx';
import {PATHS} from '../../../routes/paths.js';
import {campaignsApi} from '../services/campaigns.api.js';
import './CampaignsPage.css';

const PURPOSES={PROMOTION:'Promoción',FOLLOW_UP:'Seguimiento',INVITATION:'Invitación',LOYALTY:'Fidelización'};
const CHANNELS={EMAIL:'Correo',PHONE:'Llamada',WHATSAPP:'WhatsApp',OTHER:'Otro'};
const STATES={DRAFT:'Borrador',ACTIVE:'Activa',PAUSED:'Pausada',COMPLETED:'Finalizada'};
const TYPES={CONTACTED:'Contacto realizado',RESPONDED:'Respuesta recibida',OPPORTUNITY:'Oportunidad vinculada',OPT_OUT:'Baja / No contactar'};
const formatDate=value=>value?new Date(value).toLocaleDateString('es-CO',{timeZone:'UTC'}):'—';
const money=value=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(value)||0);
const formDefaults=()=>({name:'',objective:'',purpose:'FOLLOW_UP',channel:'EMAIL',budget:'0',startAt:new Date().toISOString().slice(0,10),endAt:new Date(Date.now()+7*86400000).toISOString().slice(0,10),clientIds:[]});
const eventDefaults=()=>({clientId:'',type:'CONTACTED',details:'',opportunityId:'',authorizationConfirmed:false});

export default function CampaignsPage(){
  const {token}=useAuth();
  const [items,setItems]=useState([]);
  const [options,setOptions]=useState({clients:[],opportunities:[]});
  const [analytics,setAnalytics]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('ALL');
  const [editor,setEditor]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [form,setForm]=useState(formDefaults);
  const [clientFilter,setClientFilter]=useState('');
  const [detail,setDetail]=useState(null);
  const [eventForm,setEventForm]=useState(eventDefaults);

  const refresh=useCallback(async()=>{
    if(!token)return;
    setLoading(true);setError('');
    try{
      const [campaigns,available,stats]=await Promise.all([campaignsApi.list(token),campaignsApi.options(token),campaignsApi.analytics(token)]);
      setItems(campaigns);setOptions(available);setAnalytics(stats);
    }catch(err){setError(err.message);}finally{setLoading(false);}
  },[token]);
  useEffect(()=>{refresh();},[refresh]);

  const visible=useMemo(()=>items.filter(item=>
    (filter==='ALL'||item.status===filter)&&`${item.name} ${item.objective}`.toLowerCase().includes(search.toLowerCase().trim())
  ),[items,filter,search]);
  const filteredClients=useMemo(()=>options.clients.filter(c=>`${c.name} ${c.email||''}`.toLowerCase().includes(clientFilter.toLowerCase().trim())),[options.clients,clientFilter]);
  const selectedStats=useMemo(()=>analytics?.byCampaign?.find(s=>s.id===String(detail?.campaign?._id)),[analytics,detail]);
  const relatedOpportunities=useMemo(()=>options.opportunities.filter(o=>String(o.clientId)===eventForm.clientId),[options.opportunities,eventForm.clientId]);

  const startNew=()=>{setEditingId(null);setForm(formDefaults());setClientFilter('');setEditor(true);setNotice('');setError('');};
  const startEdit=campaign=>{setEditingId(campaign._id);setForm({name:campaign.name,objective:campaign.objective,purpose:campaign.purpose,channel:campaign.channel,budget:String(campaign.budget),startAt:campaign.startAt?.slice(0,10)||'',endAt:campaign.endAt?.slice(0,10)||'',clientIds:campaign.clientIds.map(String)});setClientFilter('');setEditor(true);setNotice('');};
  const field=(name,value)=>setForm(f=>({...f,[name]:value}));
  const toggleClient=(id,checked)=>setForm(f=>({...f,clientIds:checked?[...f.clientIds,id]:f.clientIds.filter(x=>x!==id)}));

  async function save(e){
    e.preventDefault();setBusy(true);setError('');setNotice('');
    try{
      const body={...form,budget:Number(form.budget),startAt:new Date(`${form.startAt}T12:00:00Z`).toISOString(),endAt:new Date(`${form.endAt}T12:00:00Z`).toISOString()};
      if(editingId) await campaignsApi.update(token,editingId,body);
      else await campaignsApi.create(token,body);
      setEditor(false);setEditingId(null);setNotice('Campaña guardada. No se ha enviado ningún mensaje.');await refresh();
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }
  async function changeStatus(item,status){
    const text=status==='ACTIVE'?'Activar permite registrar actividades, pero no envía mensajes. ¿Continuar?':`¿Cambiar la campaña a ${STATES[status]}?`;
    if(!window.confirm(text))return;
    setBusy(true);setError('');setNotice('');
    try{await campaignsApi.status(token,item._id,status);setNotice('Estado actualizado. No se han enviado mensajes.');await refresh();if(detail?.campaign?._id===item._id) await openDetail(item._id);}catch(err){setError(err.message);}finally{setBusy(false);}
  }
  async function openDetail(id){
    setError('');
    try{const result=await campaignsApi.detail(token,id);setDetail(result);setEventForm(eventDefaults());}
    catch(err){setError(err.message);}
  }
  async function recordEvent(e){
    e.preventDefault();if(!detail?.campaign)return;
    if(eventForm.type==='OPT_OUT'&&!window.confirm('Registrar baja del cliente. Se bloquearán futuros contactos desde FinCRM para este cliente. ¿Continuar?'))return;
    setBusy(true);setError('');setNotice('');
    try{
      await campaignsApi.event(token,detail.campaign._id,{...eventForm,opportunityId:eventForm.type==='OPPORTUNITY'?eventForm.opportunityId:null});
      setNotice('Resultado registrado correctamente (registro manual, no evento de Brevo).');
      await openDetail(detail.campaign._id);await refresh();
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <main className="fc-campaign-page">
    <Link className="fc-campaign-back" to={PATHS.dashboard}><ArrowLeft size={16}/> Volver al panel</Link>
    <header className="fc-campaign-head">
      <div><h1>Campañas</h1><p>Organiza campañas comerciales y registra resultados reales de seguimiento.</p></div>
      <div className="fc-campaign-head-actions"><button type="button" className="fc-campaign-btn fc-campaign-primary" onClick={startNew} disabled={busy||loading}><Plus size={18}/> Nueva campaña</button><button type="button" className="fc-campaign-btn fc-campaign-outline" onClick={refresh} disabled={busy||loading}><RefreshCw size={18}/> Actualizar</button></div>
    </header>
    <section className="fc-campaign-banner" aria-label="Información de seguridad"><ClipboardCheck size={20}/><div><strong>Gestión con trazabilidad, sin envíos automáticos</strong><p>Esta etapa guarda campañas, audiencias y resultados declarados por el ADMIN. Ninguna acción envía correos, SMS o WhatsApp. Las métricas del proveedor llegarán con webhooks verificados en una etapa posterior.</p></div></section>
    {error&&<div role="alert" className="fc-campaign-message fc-campaign-message-error">{error}</div>}
    {notice&&<div role="status" className="fc-campaign-message fc-campaign-message-ok">{notice}</div>}
    <section className="fc-campaign-kpis" aria-label="Indicadores generales">
      <div className="fc-campaign-kpi fc-campaign-kpi-dark"><span>Campañas</span><strong>{loading?'—':analytics?.totals?.campaigns??0}</strong><small>Total registrado</small></div>
      <div className="fc-campaign-kpi"><span>Activas</span><strong>{loading?'—':analytics?.totals?.active??0}</strong><small>Seguimientos abiertos</small></div>
      <div className="fc-campaign-kpi"><span>Contactados</span><strong>{loading?'—':analytics?.totals?.contacted??0}</strong><small>Registros manuales</small></div>
      <div className="fc-campaign-kpi"><span>Respuestas</span><strong>{loading?'—':analytics?.totals?.responses??0}</strong><small>Confirmadas manualmente</small></div>
    </section>

    {editor&&<section className="fc-campaign-card" aria-label="Formulario de campaña">
      <div className="fc-campaign-section-head"><div><h2>{editingId?'Editar borrador':'Crear campaña'}</h2><p>Los destinatarios deben pertenecer a tu empresa. Seleccionarlos no equivale a tener consentimiento.</p></div><button className="fc-campaign-btn fc-campaign-outline" type="button" onClick={()=>setEditor(false)} disabled={busy}>Cerrar</button></div>
      <form onSubmit={save}>
        <div className="fc-campaign-fields">
          <label>Nombre de campaña *<input required maxLength={120} minLength={3} value={form.name} onChange={e=>field('name',e.target.value)} placeholder="Ej. Seguimiento comercial de diciembre"/></label>
          <label>Finalidad *<select value={form.purpose} onChange={e=>field('purpose',e.target.value)}>{Object.entries(PURPOSES).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label>Canal previsto *<select value={form.channel} onChange={e=>field('channel',e.target.value)}>{Object.entries(CHANNELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label>Presupuesto planeado (COP)<input type="number" min="0" step="1" value={form.budget} onChange={e=>field('budget',e.target.value)}/></label>
          <label>Inicio *<input type="date" required value={form.startAt} onChange={e=>field('startAt',e.target.value)}/></label>
          <label>Fin *<input type="date" required min={form.startAt} value={form.endAt} onChange={e=>field('endAt',e.target.value)}/></label>
          <label className="fc-campaign-wide">Objetivo comercial *<textarea rows="2" minLength={8} maxLength={600} required value={form.objective} onChange={e=>field('objective',e.target.value)} placeholder="Objetivo medible de la campaña"/></label>
        </div>
        <fieldset className="fc-campaign-audience"><legend>Audiencia · {form.clientIds.length} seleccionados (máx. 100)</legend><p>Elige clientes de tu empresa. Antes de cualquier contacto deberás acreditar la autorización correspondiente.</p><input aria-label="Buscar destinatarios" value={clientFilter} onChange={e=>setClientFilter(e.target.value)} placeholder="Buscar por nombre o correo"/><div className="fc-campaign-client-list">{filteredClients.map(c=><label key={c._id} className="fc-campaign-check"><input type="checkbox" checked={form.clientIds.includes(c._id)} disabled={!form.clientIds.includes(c._id)&&form.clientIds.length>=100} onChange={e=>toggleClient(c._id,e.target.checked)}/><span>{c.name} <small>{c.email||'Sin correo registrado'}</small></span></label>)}{filteredClients.length===0&&<p>No hay clientes con ese filtro.</p>}</div></fieldset>
        <div className="fc-campaign-buttons"><button type="button" className="fc-campaign-btn fc-campaign-outline" onClick={()=>setEditor(false)} disabled={busy}>Cancelar</button><button type="submit" className="fc-campaign-btn fc-campaign-primary" disabled={busy||form.clientIds.length===0}>{busy?'Guardando…':editingId?'Guardar cambios':'Guardar campaña'}</button></div>
      </form>
    </section>}

    <section className="fc-campaign-card">
      <div className="fc-campaign-section-head"><div><h2>Directorio de campañas</h2><p>{visible.length} de {items.length} campañas de tu empresa</p></div><Link className="fc-campaign-link" to={PATHS.campaignAnalytics}>Ver dashboard de analítica</Link></div>
      <div className="fc-campaign-filters"><label>Buscar<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nombre u objetivo"/></label><label>Estado<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">Todos</option>{Object.entries(STATES).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><button type="button" className="fc-campaign-btn fc-campaign-outline" onClick={()=>{setSearch('');setFilter('ALL');}}><Filter size={16}/> Limpiar filtros</button></div>
      {loading?<div className="fc-campaign-empty">Cargando campañas…</div>:visible.length===0?<div className="fc-campaign-empty">No hay campañas con estos filtros. Crea una nueva para comenzar.</div>:<div className="fc-campaign-scroll"><table className="fc-campaign-table"><thead><tr><th>Campaña</th><th>Canal</th><th>Audiencia</th><th>Período</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{visible.map(item=><tr key={item._id}><td><strong>{item.name}</strong><small>{item.objective}</small></td><td>{CHANNELS[item.channel]}</td><td>{item.clientIds.length}</td><td>{formatDate(item.startAt)} — {formatDate(item.endAt)}</td><td><span className={`fc-campaign-status fc-campaign-status-${item.status.toLowerCase()}`}>{STATES[item.status]}</span></td><td><div className="fc-campaign-row-actions"><button type="button" className="fc-campaign-btn fc-campaign-dark fc-campaign-small" onClick={()=>openDetail(item._id)}>Gestionar</button>{item.status==='DRAFT'&&<button className="fc-campaign-btn fc-campaign-outline fc-campaign-small" onClick={()=>startEdit(item)}><Pencil size={14}/> Editar</button>}</div></td></tr>)}</tbody></table></div>}
    </section>

    {detail?.campaign&&<section className="fc-campaign-card" aria-labelledby="campaign-detail-title">
      <div className="fc-campaign-section-head"><div><h2 id="campaign-detail-title">{detail.campaign.name}</h2><p>{detail.campaign.objective}</p></div><button type="button" className="fc-campaign-btn fc-campaign-outline" onClick={()=>setDetail(null)}>Cerrar detalle</button></div>
      <div className="fc-campaign-detailstrip"><span><strong>Estado:</strong> {STATES[detail.campaign.status]}</span><span><strong>Canal:</strong> {CHANNELS[detail.campaign.channel]}</span><span><strong>Presupuesto:</strong> {money(detail.campaign.budget)}</span><span><strong>Contactados:</strong> {selectedStats?.contacted??0}</span><span><strong>Respuestas:</strong> {selectedStats?.responses??0}</span></div>
      <div className="fc-campaign-buttons fc-campaign-left">
        {detail.campaign.status==='DRAFT'&&<button className="fc-campaign-btn fc-campaign-dark" onClick={()=>changeStatus(detail.campaign,'ACTIVE')} disabled={busy}><Play size={17}/> Activar seguimiento</button>}
        {detail.campaign.status==='ACTIVE'&&<button className="fc-campaign-btn fc-campaign-outline" onClick={()=>changeStatus(detail.campaign,'PAUSED')} disabled={busy}><PauseCircle size={17}/> Pausar</button>}
        {detail.campaign.status==='PAUSED'&&<button className="fc-campaign-btn fc-campaign-dark" onClick={()=>changeStatus(detail.campaign,'ACTIVE')} disabled={busy}><Play size={17}/> Reanudar</button>}
        {['ACTIVE','PAUSED'].includes(detail.campaign.status)&&<button className="fc-campaign-btn fc-campaign-outline" onClick={()=>changeStatus(detail.campaign,'COMPLETED')} disabled={busy}><SquareCheck size={17}/> Finalizar</button>}
      </div>
      <div className="fc-campaign-two-cols">
        <div><h3>Clientes de la campaña</h3><div className="fc-campaign-recipient-list">{detail.campaign.clientIds.map(c=><div key={c._id}><strong>{c.name}</strong><small>{c.email||'Sin correo'} · {c.phone||'Sin teléfono'}</small></div>)}</div></div>
        <div><h3>Registrar resultado</h3>{detail.campaign.status==='ACTIVE'?<form className="fc-campaign-event" onSubmit={recordEvent}>
          <label>Cliente *<select required value={eventForm.clientId} onChange={e=>setEventForm(f=>({...f,clientId:e.target.value,opportunityId:''}))}><option value="">Selecciona</option>{detail.campaign.clientIds.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
          <label>Resultado *<select value={eventForm.type} onChange={e=>setEventForm(f=>({...f,type:e.target.value,opportunityId:'',authorizationConfirmed:false}))}>{Object.entries(TYPES).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
          {eventForm.type==='OPPORTUNITY'&&<label>Oportunidad del mismo cliente *<select required value={eventForm.opportunityId} onChange={e=>setEventForm(f=>({...f,opportunityId:e.target.value}))}><option value="">Selecciona una oportunidad</option>{relatedOpportunities.map(o=><option key={o._id} value={o._id}>{o.title} · {o.stage}</option>)}</select></label>}
          <label>Observaciones {eventForm.type==='CONTACTED'?'(evidencia de autorización y contexto)':''}<textarea rows="3" value={eventForm.details} onChange={e=>setEventForm(f=>({...f,details:e.target.value}))} placeholder="Qué ocurrió y cómo se verificó"/></label>
          {eventForm.type==='CONTACTED'&&<label className="fc-campaign-check"><input type="checkbox" required checked={eventForm.authorizationConfirmed} onChange={e=>setEventForm(f=>({...f,authorizationConfirmed:e.target.checked}))}/><span>Confirmo que verifiqué la autorización de contacto.</span></label>}
          <button disabled={busy||!eventForm.clientId} className="fc-campaign-btn fc-campaign-primary" type="submit">{busy?'Guardando…':'Registrar resultado'}</button>
        </form>:<p className="fc-campaign-muted">Activa la campaña para registrar contactos y respuestas. Activarla no realiza envíos externos.</p>}</div>
      </div>
      <h3>Bitácora de seguimiento</h3>{detail.events.length===0?<p className="fc-campaign-muted">Todavía no existen eventos reales registrados.</p>:<div className="fc-campaign-scroll"><table className="fc-campaign-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Evento</th><th>Detalle</th></tr></thead><tbody>{detail.events.map(event=><tr key={event._id}><td>{new Date(event.createdAt).toLocaleString('es-CO')}</td><td>{event.clientId?.name||'Cliente'}</td><td>{TYPES[event.type]}</td><td>{event.details||event.opportunityId?.title||'—'}</td></tr>)}</tbody></table></div>}
    </section>}
  </main>;
}
