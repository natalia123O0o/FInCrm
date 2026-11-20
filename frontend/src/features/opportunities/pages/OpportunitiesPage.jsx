import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, Sparkles, Pencil, History, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import UserWorkspaceLayout from '../../user/components/UserWorkspaceLayout.jsx';
import { PATHS } from '../../../routes/paths.js';
import { listOpportunities, getOpportunity, createOpportunity, updateOpportunity, addEncounter, requestRecommendation, registerAIDecision, loadReference } from '../services/opportunities.api.js';
import { STAGES, ENCOUNTERS, OUTCOMES, DECISIONS, formatMoney, formatDate, toDateTimeLocal } from '../opportunity.constants.js';
import '../../activities/pages/ActivitiesPage.css';
import './OpportunitiesPage.css';

const BLANK = { title:'', description:'', clientId:'', assignedTo:'', stage:'NEW', estimatedValue:'0', expectedCloseAt:'' };
function newEncounter() { return { type:'CALL', outcome:'FOLLOW_UP', summary:'', nextAction:'', happenedAt:toDateTimeLocal(new Date()) }; }

export default function OpportunitiesPage() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [editor, setEditor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [encounter, setEncounter] = useState(newEncounter);
  const [showEncounter, setShowEncounter] = useState(false);
  const [decision, setDecision] = useState({ action:'ACCEPT', reason:'' });
  const [stageFilter, setStageFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const promises = [listOpportunities(token)];
      if (isAdmin) promises.push(loadReference(token,'/api/clients','clients'),loadReference(token,'/api/users','users'));
      const [list, peopleClients, peopleUsers] = await Promise.all(promises);
      setItems(list);
      if (isAdmin) {
        setClients((peopleClients || []).filter(x => x.isActive !== false));
        setEmployees((peopleUsers || []).filter(x => x.role === 'USER' && x.isActive !== false));
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [token, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const readSelected = useCallback(async id => {
    if (!id || !token) return;
    try { const detail = await getOpportunity(token, id); setSelected(detail); setSelectedId(id); }
    catch (e) { setError(e.message); setSelected(null); }
  }, [token]);

  const filtered = useMemo(() => items.filter(o => stageFilter === 'ALL' || o.stage === stageFilter), [items, stageFilter]);
  const summary = useMemo(() => ({
    total:items.length, open:items.filter(o => !['WON','LOST'].includes(o.stage)).length,
    won:items.filter(o => o.stage === 'WON').length,
    value:items.filter(o => !['WON','LOST'].includes(o.stage)).reduce((n,o) => n + Number(o.estimatedValue || 0),0)
  }), [items]);

  function startNew() { setForm({ ...BLANK }); setEditingId(null); setEditor(true); setSelected(null); setSelectedId(''); setError(''); setNotice(''); }
  function startEdit(item) {
    setForm({ title:item.title || '', description:item.description || '', stage:item.stage || 'NEW',
      estimatedValue:String(item.estimatedValue ?? 0), expectedCloseAt:toDateTimeLocal(item.expectedCloseAt),
      clientId:item.clientId?._id || '', assignedTo:item.assignedTo?._id || '' });
    setEditingId(item._id); setEditor(true); setError(''); setNotice('');
  }
  function changeField(key, value) { setForm(f => ({ ...f, [key]:value })); }

  async function saveOpportunity(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = { ...form, title:form.title.trim(), description:form.description.trim(),
        estimatedValue:Number(form.estimatedValue), expectedCloseAt:form.expectedCloseAt ? new Date(form.expectedCloseAt).toISOString() : null };
      if (editingId) await updateOpportunity(token,editingId,data);
      else await createOpportunity(token,data);
      setEditor(false); setEditingId(null); setForm({ ...BLANK });
      setNotice('Oportunidad guardada correctamente.');
      await load();
    } catch (e2) { setError(e2.message); }
    finally { setBusy(false); }
  }

  async function saveEncounter(e) {
    e.preventDefault(); if (!selectedId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await addEncounter(token, selectedId, { ...encounter, summary:encounter.summary.trim(), nextAction:encounter.nextAction.trim(), happenedAt:new Date(encounter.happenedAt).toISOString() });
      setEncounter(newEncounter()); setShowEncounter(false);
      setNotice('Encuentro registrado en el historial de la oportunidad.');
      await readSelected(selectedId);
      await load();
    } catch (e2) { setError(e2.message); }
    finally { setBusy(false); }
  }

  async function generateAI() {
    if (!selectedId) return;
    setAiBusy(true); setError(''); setNotice('');
    try {
      await requestRecommendation(token,selectedId);
      await readSelected(selectedId);
      setNotice('Sugerencia generada con Gemini. Revísala antes de tomar decisiones.');
    } catch (e) { setError(e.message); }
    finally { setAiBusy(false); }
  }

  async function saveDecision(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await registerAIDecision(token,selectedId,{ action:decision.action, reason:decision.reason.trim() });
      setDecision({action:'ACCEPT',reason:''});
      await readSelected(selectedId);
      setNotice('Tu decisión quedó registrada. No se ejecutó ninguna acción automática.');
    } catch (e2) { setError(e2.message); }
    finally { setBusy(false); }
  }

  const page = <main className="fin-act fin-opp">
    <Link className="fin-act-back" to={isAdmin ? PATHS.dashboard : PATHS.userDashboard}><ArrowLeft size={17}/> Volver al panel</Link>
    <header className="fin-act-page-heading">
      <div><h1>{isAdmin ? 'Gestión de oportunidades' : 'Mis oportunidades'}</h1><p>{isAdmin ? 'Organiza negocios y revisa el seguimiento de tu equipo.' : 'Registra encuentros y consulta las siguientes acciones sugeridas.'}</p></div>
      <div className="fin-act-header-actions">
        {isAdmin && !editor && <button className="fin-act-btn fin-act-btn-primary" type="button" onClick={startNew} disabled={loading || employees.length === 0 || clients.length === 0}><Plus size={19}/> Nueva oportunidad</button>}
        <button type="button" className="fin-act-btn fin-act-btn-outline" onClick={load} disabled={loading || busy}><RefreshCw size={18}/> Actualizar</button>
      </div>
    </header>
    {error && <div className="fin-act-feedback fin-act-feedback-error" role="alert">{error}</div>}
    {notice && <div className="fin-act-feedback fin-act-feedback-success" role="status">{notice}</div>}
    {isAdmin && !loading && (!employees.length || !clients.length) && <div className="fin-act-feedback">Para crear oportunidades necesitas al menos un empleado USER y un cliente activo de la empresa.</div>}

    <section className="fin-act-kpi-grid" aria-label="Resumen de oportunidades">
      <div className="fin-act-kpi"><span>Total</span><strong>{loading ? '—' : summary.total}</strong></div>
      <div className="fin-act-kpi"><span>Abiertas</span><strong>{loading ? '—' : summary.open}</strong></div>
      <div className="fin-act-kpi"><span>Ganadas</span><strong>{loading ? '—' : summary.won}</strong></div>
      <div className="fin-act-kpi"><span>Valor potencial abierto</span><strong className="fin-opp-money">{loading ? '—' : formatMoney(summary.value)}</strong></div>
    </section>

    {isAdmin && editor && <section className="fin-act-card fin-act-section" aria-labelledby="op-editor-title">
      <div className="fin-act-section-heading"><div><h2 id="op-editor-title">{editingId ? 'Editar oportunidad' : 'Registrar oportunidad'}</h2><p>El empleado y cliente deben pertenecer a tu empresa.</p></div></div>
      <form className="fin-act-grid" onSubmit={saveOpportunity}>
        <div className="fin-act-field"><label htmlFor="op-title">Nombre de la oportunidad *</label><input id="op-title" maxLength={120} required value={form.title} onChange={e=>changeField('title',e.target.value)} placeholder="Ej. Renovación de contrato"/></div>
        <div className="fin-act-field"><label htmlFor="op-client">Cliente *</label><select id="op-client" value={form.clientId} required onChange={e=>changeField('clientId',e.target.value)}><option value="">Selecciona un cliente</option>{clients.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
        <div className="fin-act-field"><label htmlFor="op-employee">Responsable *</label><select id="op-employee" required value={form.assignedTo} onChange={e=>changeField('assignedTo',e.target.value)}><option value="">Selecciona un empleado</option>{employees.map(u=><option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
        <div className="fin-act-field"><label htmlFor="op-stage">Etapa *</label><select id="op-stage" value={form.stage} onChange={e=>changeField('stage',e.target.value)}>{Object.entries(STAGES).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></div>
        <div className="fin-act-field"><label htmlFor="op-value">Valor estimado (COP)</label><input id="op-value" type="number" min="0" step="1" value={form.estimatedValue} onChange={e=>changeField('estimatedValue',e.target.value)}/></div>
        <div className="fin-act-field"><label htmlFor="op-close">Fecha tentativa de cierre</label><input id="op-close" type="datetime-local" value={form.expectedCloseAt} onChange={e=>changeField('expectedCloseAt',e.target.value)}/></div>
        <div className="fin-act-field fin-act-grid-full"><label htmlFor="op-description">Descripción</label><textarea id="op-description" maxLength={1500} value={form.description} onChange={e=>changeField('description',e.target.value)} rows={3}/></div>
        <div className="fin-act-grid-full fin-act-form-actions"><button type="button" className="fin-act-btn fin-act-btn-outline" disabled={busy} onClick={()=>{setEditor(false);setEditingId(null);}}>Cancelar</button><button className="fin-act-btn fin-act-btn-primary" disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar oportunidad'}</button></div>
      </form>
    </section>}

    <section className="fin-act-card fin-act-section" aria-labelledby="op-list-title">
      <div className="fin-act-section-heading"><div><h2 id="op-list-title">{isAdmin ? 'Oportunidades del equipo' : 'Oportunidades asignadas'}</h2><p>{loading ? 'Consultando…' : `${filtered.length} de ${items.length} oportunidades`}</p></div><div className="fin-act-field"><label htmlFor="op-filter">Filtrar por etapa</label><select id="op-filter" value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option value="ALL">Todas las etapas</option>{Object.entries(STAGES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div></div>
      {loading ? <div className="fin-act-skeleton" role="status"/> : filtered.length === 0 ? <div className="fin-act-empty">No hay oportunidades con este filtro.</div> :
        <div className="fin-act-table-scroll"><table className="fin-act-table"><thead><tr><th>Oportunidad</th><th>Cliente</th>{isAdmin && <th>Empleado</th>}<th>Etapa</th><th>Valor estimado</th><th>Acción</th></tr></thead><tbody>
          {filtered.map(item=><tr key={item._id}><td><strong>{item.title}</strong></td><td>{item.clientId?.name || '—'}</td>{isAdmin && <td>{item.assignedTo?.name || '—'}</td>}<td><span className={`fin-opp-stage fin-opp-stage-${item.stage.toLowerCase()}`}>{STAGES[item.stage] || item.stage}</span></td><td>{formatMoney(item.estimatedValue)}</td><td><div className="fin-opp-actions"><button type="button" className="fin-act-btn fin-act-btn-dark fin-act-btn-small" onClick={()=>{setEditor(false);setShowEncounter(false);setError('');readSelected(item._id);}}><History size={16}/> Ver ficha</button>{isAdmin && <button type="button" className="fin-act-btn fin-act-btn-outline fin-act-btn-small" onClick={()=>startEdit(item)}><Pencil size={16}/> Editar</button>}</div></td></tr>)}
        </tbody></table></div>}
    </section>

    {selected && !editor && <section className="fin-act-card fin-act-section" aria-labelledby="op-detail-title">
      <div className="fin-act-section-heading"><div><h2 id="op-detail-title">Seguimiento: {selected.title}</h2><p>Cliente: {selected.clientId?.name || '—'} · Responsable: {selected.assignedTo?.name || '—'} · Etapa: {STAGES[selected.stage]}</p></div><button type="button" className="fin-act-btn fin-act-btn-outline" onClick={()=>{setSelected(null);setSelectedId('');setShowEncounter(false);}}>Cerrar ficha</button></div>
      {selected.description && <p className="fin-opp-description">{selected.description}</p>}
      <div className="fin-act-section-heading fin-opp-subheading"><div><h3>Historial de encuentros</h3><p>Registra llamadas, reuniones, visitas y sus resultados.</p></div>{!showEncounter && <button type="button" className="fin-act-btn fin-act-btn-dark" onClick={()=>{setShowEncounter(true);setEncounter(newEncounter());}}>Registrar encuentro</button>}</div>
      {showEncounter && <form className="fin-act-grid fin-opp-encounter-form" onSubmit={saveEncounter}>
        <div className="fin-act-field"><label htmlFor="enc-type">Tipo de encuentro *</label><select id="enc-type" value={encounter.type} onChange={e=>setEncounter(x=>({...x,type:e.target.value}))}>{Object.entries(ENCOUNTERS).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></div>
        <div className="fin-act-field"><label htmlFor="enc-result">Resultado *</label><select id="enc-result" value={encounter.outcome} onChange={e=>setEncounter(x=>({...x,outcome:e.target.value}))}>{Object.entries(OUTCOMES).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></div>
        <div className="fin-act-field"><label htmlFor="enc-date">Fecha del encuentro *</label><input id="enc-date" required type="datetime-local" value={encounter.happenedAt} onChange={e=>setEncounter(x=>({...x,happenedAt:e.target.value}))}/></div>
        <div className="fin-act-field"><label htmlFor="enc-next">Próxima acción</label><input id="enc-next" maxLength={500} value={encounter.nextAction} onChange={e=>setEncounter(x=>({...x,nextAction:e.target.value}))} placeholder="Ej. Preparar propuesta"/></div>
        <div className="fin-act-field fin-act-grid-full"><label htmlFor="enc-summary">¿Qué sucedió? *</label><textarea id="enc-summary" required maxLength={2000} rows={3} value={encounter.summary} onChange={e=>setEncounter(x=>({...x,summary:e.target.value}))} placeholder="Resumen del encuentro y compromisos confirmados"/></div>
        <div className="fin-act-grid-full fin-act-form-actions"><button type="button" className="fin-act-btn fin-act-btn-outline" onClick={()=>setShowEncounter(false)} disabled={busy}>Cancelar</button><button className="fin-act-btn fin-act-btn-primary" disabled={busy || !encounter.summary.trim()} type="submit">{busy ? 'Guardando…' : 'Guardar encuentro'}</button></div>
      </form>}
      {!selected.encounters?.length ? <p className="fin-opp-muted">Todavía no hay encuentros registrados.</p> : <ol className="fin-opp-history">{[...selected.encounters].sort((a,b)=>new Date(b.happenedAt)-new Date(a.happenedAt)).map(entry=><li key={entry._id}><div><strong>{ENCOUNTERS[entry.type] || entry.type}</strong><span className="fin-opp-muted"> · {formatDate(entry.happenedAt)}</span></div><p>Resultado: {OUTCOMES[entry.outcome] || entry.outcome}</p><p>{entry.summary}</p>{entry.nextAction && <p><strong>Siguiente paso registrado:</strong> {entry.nextAction}</p>}<small>Registró: {entry.recordedBy?.name || 'Colaborador'}</small></li>)}</ol>}
      <div className="fin-opp-ai">
        <div className="fin-act-section-heading"><div><h3>Asesor inteligente para esta oportunidad</h3><p>Gemini analiza etapas y tipos/resultados de encuentros, sin enviar notas ni datos personales.</p></div><button type="button" className="fin-opp-ai-button" disabled={aiBusy || !selected.encounters?.length} onClick={generateAI}><Sparkles size={19}/> {aiBusy ? 'Analizando…' : 'Sugerir siguiente paso con IA'}</button></div>
        {selected.recommendation?.text ? <><div className="fin-opp-ai-answer"><strong>Recomendación (requiere revisión humana)</strong><p>{selected.recommendation.text}</p><small>Generada: {formatDate(selected.recommendation.generatedAt)}</small></div>
          <form className="fin-opp-decision-form" onSubmit={saveDecision}><h3>Registrar mi decisión</h3><div className="fin-act-field"><label htmlFor="op-decision">Decisión</label><select id="op-decision" value={decision.action} onChange={e=>setDecision(x=>({...x,action:e.target.value}))}>{Object.entries(DECISIONS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div><div className="fin-act-field"><label htmlFor="op-reason">Motivo *</label><textarea id="op-reason" rows={2} maxLength={1000} required value={decision.reason} onChange={e=>setDecision(x=>({...x,reason:e.target.value}))} placeholder="¿Por qué tomaste esta decisión?"/></div><button type="submit" className="fin-act-btn fin-act-btn-dark" disabled={busy || !decision.reason.trim()}><CheckCircle2 size={18}/> Registrar decisión</button></form>
        </> : <p className="fin-opp-muted">La IA aún no ha generado una sugerencia. Primero registra al menos un encuentro.</p>}
        {selected.decisions?.length > 0 && <div className="fin-opp-decisions"><h3>Bitácora de decisiones</h3>{[...selected.decisions].reverse().map(entry=><p key={entry._id}><strong>{DECISIONS[entry.action]}</strong> — {entry.reason} <small>({entry.recordedBy?.name || 'Colaborador'}, {formatDate(entry.createdAt)})</small></p>)}</div>}
      </div>
    </section>}
  </main>;

  return isAdmin ? page : <UserWorkspaceLayout>{page}</UserWorkspaceLayout>;
}
