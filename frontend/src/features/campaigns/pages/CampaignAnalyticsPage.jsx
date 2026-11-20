import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,RefreshCw,Info,BarChart3} from 'lucide-react';
import {useAuth} from '../../auth/context/AuthContext.jsx';
import {PATHS} from '../../../routes/paths.js';
import {campaignsApi} from '../services/campaigns.api.js';
import './CampaignsPage.css';

const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(n)||0);
const formatRate=n=>n===null||n===undefined?'Sin base':`${Number(n).toFixed(1)} %`;
export default function CampaignAnalyticsPage(){
  const {token}=useAuth();
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [selected,setSelected]=useState('ALL');
  const load=useCallback(async()=>{
    if(!token)return;
    setLoading(true);setError('');
    try{setData(await campaignsApi.analytics(token));}catch(err){setError(err.message);}finally{setLoading(false);}
  },[token]);
  useEffect(()=>{load();},[load]);
  const campaigns=useMemo(()=>selected==='ALL'?(data?.byCampaign||[]):(data?.byCampaign||[]).filter(c=>c.id===selected),[data,selected]);
  const totals=useMemo(()=>{
    if(selected==='ALL') return data?.totals||{};
    const row=campaigns[0];
    return row?{campaigns:1,active:row.status==='ACTIVE'?1:0,audience:row.audience,contacted:row.contacted,responses:row.responses,opportunities:row.opportunities,won:row.won,estimatedWonValue:row.estimatedWonValue,optOuts:row.optOuts,responseRate:row.responseRate,opportunityRate:row.opportunityRate,plannedBudget:row.budget}:{};
  },[data,selected,campaigns]);
  const peak=Math.max(1,...(data?.trend||[]).map(x=>Math.max(x.contacts,x.responses,x.opportunities)));
  return <main className="fc-campaign-page fc-campaign-analytics">
    <Link to={PATHS.campaigns} className="fc-campaign-back"><ArrowLeft size={16}/> Volver a campañas</Link>
    <header className="fc-campaign-head"><div><h1>Analítica de campañas</h1><p>Resultados verificados según los registros comerciales de tu empresa.</p></div><button type="button" className="fc-campaign-btn fc-campaign-outline" onClick={load} disabled={loading}><RefreshCw size={17}/> Actualizar</button></header>
    <section className="fc-campaign-banner"><Info size={20}/><div><strong>Datos reales; sin métricas inventadas</strong><p>Los contactos y las respuestas se registran manualmente. La entrega, la apertura y los clics aparecerán únicamente cuando integremos eventos comprobados del proveedor de correo.</p></div></section>
    {error&&<div className="fc-campaign-message fc-campaign-message-error" role="alert">{error}</div>}
    {loading?<div className="fc-campaign-card">Cargando analítica…</div>:<>
      <section className="fc-campaign-card fc-campaign-filter-panel"><div className="fc-campaign-section-head"><div><h2>Panel de resultados</h2><p>Compara el rendimiento de todas las campañas o de una en particular.</p></div></div><label>Campaña<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="ALL">Todas las campañas</option>{(data?.byCampaign||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></section>
      <section className="fc-campaign-kpis fc-campaign-analytics-kpis" aria-label="Indicadores de rendimiento">
        {[
          ['Campañas',totals.campaigns??0,'Campañas registradas'],
          ['Audiencia',totals.audience??0,'Selecciones de clientes'],
          ['Contactados',totals.contacted??0,'Contactos registrados'],
          ['Respuestas',totals.responses??0,'Respuestas confirmadas'],
          ['Tasa de respuesta',formatRate(totals.responseRate),'Respuestas / contactados'],
          ['Oportunidades',totals.opportunities??0,'Vinculadas a campaña'],
          ['Ganadas',totals.won??0,'Oportunidades con etapa WON'],
          ['Valor estimado ganado',money(totals.estimatedWonValue),'No es facturación']
        ].map(([label,value,desc],i)=><div className={`fc-campaign-kpi ${i===0?'fc-campaign-kpi-dark':''}`} key={label}><span>{label}</span><strong className={String(value).length>12?'fc-campaign-kpi-amount':''}>{value}</strong><small>{desc}</small></div>)}
      </section>
      <div className="fc-campaign-analytics-grid">
        <section className="fc-campaign-card"><h2>Embudo comercial</h2><p className="fc-campaign-muted">Recuento confirmado de las acciones registradas</p><div className="fc-campaign-funnel">{[
          ['Audiencia',totals.audience??0,'navy'],['Contactados',totals.contacted??0,'slate'],['Respuestas',totals.responses??0,'blue'],['Oportunidades',totals.opportunities??0,'slate'],['Ganadas',totals.won??0,'navy']
        ].map(([name,value,tone])=><div key={name} className="fc-campaign-funnel-line"><div><span>{name}</span><strong>{value}</strong></div><div className="fc-campaign-bar-track"><div className={`fc-campaign-bar fc-campaign-bar-${tone}`} style={{width:`${value===0?0:Math.max(2,100*value/Math.max(totals.audience||1,totals.contacted||1))}%`}}/></div></div>)}</div></section>
        <section className="fc-campaign-card"><h2>Calidad del seguimiento</h2><p className="fc-campaign-muted">Medidas que ayudan a tomar decisiones comerciales</p><div className="fc-campaign-highlight"><span>Conversión a oportunidad</span><strong>{formatRate(totals.opportunityRate)}</strong><small>Oportunidades asociadas / contactados registrados</small></div><div className="fc-campaign-highlight"><span>Bajas registradas</span><strong>{totals.optOuts??0}</strong><small>Se bloquean contactos futuros a clientes con exclusión.</small></div><div className="fc-campaign-highlight"><span>Presupuesto planeado</span><strong>{money(totals.plannedBudget)}</strong><small>No representa gasto ejecutado ni ROI.</small></div></section>
      </div>
      <section className="fc-campaign-card"><div className="fc-campaign-section-head"><div><h2>Actividad comercial por mes</h2><p>Conteos por fecha de registro. No son eventos de correo entregado.</p></div><BarChart3 size={20}/></div>{selected!=='ALL'?<p className="fc-campaign-muted">La serie mensual general muestra todos los eventos de la empresa. Selecciona «Todas las campañas» para interpretarla.</p>:null}
        {(data?.trend||[]).length===0?<div className="fc-campaign-empty">Todavía no hay actividad registrada para graficar.</div>:<div className="fc-campaign-trend">{data.trend.map(row=><div className="fc-campaign-trend-row" key={row.month}><strong>{row.month}</strong><div className="fc-campaign-trend-bars"><div title={`Contactos: ${row.contacts}`} style={{width:`${row.contacts/peak*100}%`}} className="fc-campaign-bar fc-campaign-bar-navy"/><div title={`Respuestas: ${row.responses}`} style={{width:`${row.responses/peak*100}%`}} className="fc-campaign-bar fc-campaign-bar-slate"/><div title={`Oportunidades: ${row.opportunities}`} style={{width:`${row.opportunities/peak*100}%`}} className="fc-campaign-bar fc-campaign-bar-blue"/></div><span>{row.contacts} / {row.responses} / {row.opportunities}</span></div>)}</div>}
        <p className="fc-campaign-muted">Orden: contactos (navy), respuestas (pizarra), oportunidades (azul informativo). Los colores representan series, no estados.</p>
      </section>
      <section className="fc-campaign-card"><h2>Resultados por campaña</h2>{campaigns.length===0?<div className="fc-campaign-empty">No hay campañas registradas.</div>:<div className="fc-campaign-scroll"><table className="fc-campaign-table"><thead><tr><th>Campaña</th><th>Audiencia</th><th>Contactados</th><th>Respuestas</th><th>Oportunidades</th><th>Ganadas</th><th>Tasa respuesta</th></tr></thead><tbody>{campaigns.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.audience}</td><td>{c.contacted}</td><td>{c.responses}</td><td>{c.opportunities}</td><td>{c.won}</td><td>{formatRate(c.responseRate)}</td></tr>)}</tbody></table></div>}</section>
      <section className="fc-campaign-card"><h2>Indicadores del proveedor</h2><p className="fc-campaign-muted">Se activarán después de recibir datos confiables de Brevo a través de webhooks autenticados.</p><div className="fc-campaign-unavailable">{['Entregados','Aperturas','Clics','Rebotes','Bajas del proveedor'].map(label=><div key={label}><span>{label}</span><strong>Sin datos</strong></div>)}</div></section>
    </>}
  </main>;
}
