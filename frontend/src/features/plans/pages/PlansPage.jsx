import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, Pencil } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { platformRequest } from '../services/plans.api.js';
import { INITIAL_LIMITS, LIMITS, MODULES, money } from '../plan.utils.js';
import PlanFields from '../components/PlanFields.jsx';
import { PATHS } from '../../../routes/paths.js';
import './Plans.css';

function initialForm() {
  return { code: '', name: '', description: '', monthlyPriceCOP: '', isActive: true,
    modules: ['crm', 'activities', 'opportunities', 'quotes', 'messaging', 'ai'], limits: { ...INITIAL_LIMITS }, reason: '' };
}

export default function PlansPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [catalog, setCatalog] = useState({ modules: MODULES, limits: LIMITS });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const editor = useRef(null);
  const load = useCallback(async signal => {
    setLoading(true); setError('');
    try {
      const data = await platformRequest(token, '/api/plans', { signal });
      if (!signal?.aborted) { setPlans(data.plans || []); if (data.catalog) setCatalog(data.catalog); }
    } catch (err) { if (err.name !== 'AbortError') setError(err.message); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [token]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);
  function openEditor(plan) {
    setEditing(plan || null); setFormError(''); setSuccess(''); setShowForm(true);
    setForm(plan ? { ...plan, modules: [...plan.modules], limits: { ...plan.limits }, reason: '' } : initialForm());
    requestAnimationFrame(() => editor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  async function save(event) {
    event.preventDefault();
    if (form.reason.trim().length < 5) { setFormError('Escribe un motivo de al menos 5 caracteres.'); return; }
    setSaving(true); setFormError(''); setSuccess('');
    const body = {
      name: form.name.trim(), description: form.description.trim(), monthlyPriceCOP: Number(form.monthlyPriceCOP),
      modules: form.modules, limits: form.limits, isActive: form.isActive, reason: form.reason.trim(),
      ...(editing ? { expectedVersion: editing.version } : { code: form.code.trim().toUpperCase() }),
    };
    try {
      await platformRequest(token, editing ? `/api/plans/${editing._id}` : '/api/plans', { method: editing ? 'PATCH' : 'POST', body });
      setShowForm(false);
      setSuccess(editing ? 'Plan actualizado. Las suscripciones existentes conservaron sus condiciones; puedes aplicar la nueva versión desde la ficha de cada empresa.' : 'Plan creado. Ya puedes asignarlo a una empresa.');
      await load();
    } catch (err) { setFormError(err.status === 409 ? `${err.message} Actualiza el catálogo y vuelve a abrir el plan para editarlo.` : err.message); }
    finally { setSaving(false); }
  }
  return <main className="fin-plans-page">
    <Link className="fin-plans-back" to={PATHS.superAdminDashboard}><ArrowLeft size={17} /> Empresas</Link>
    <header className="fin-plans-header">
      <div><p className="fin-plans-eyebrow">SUPER_ADMIN · CATÁLOGO COMERCIAL</p><h1>Planes y funcionalidades</h1><p>Define qué puede contratar cada empresa y los límites de su suscripción.</p></div>
      <button className="fin-plans-button" onClick={() => openEditor(null)} disabled={saving}><Plus size={18} /> Nuevo plan</button>
    </header>
    <div className="fin-plans-note"><strong>Las condiciones contratadas se conservan.</strong> Editar un plan actualiza el catálogo. Para cambiar una empresa, aplica la versión deseada en su ficha y registra el motivo.</div>
    {success && <p className="fin-plans-success" role="status">{success}</p>}
    {error && <p className="fin-plans-error" role="alert">{error}</p>}
    <section className="fin-plans-card">
      <div className="fin-plans-section-heading"><h2>Catálogo de planes</h2><button className="fin-plans-button fin-plans-button--secondary" disabled={loading || saving} onClick={() => load()}><RefreshCw size={16} /> Actualizar</button></div>
      {loading ? <p role="status">Cargando planes...</p> : plans.length === 0 ? <p>No hay planes registrados. Crea el primero para empezar a asignar suscripciones.</p> :
        <div className="fin-plans-table-scroll"><table className="fin-plans-table">
          <thead><tr><th>Plan</th><th>Precio mensual</th><th>Módulos</th><th>Cupos activos</th><th>Disponibilidad</th><th>Acciones</th></tr></thead>
          <tbody>{plans.map(plan => <tr key={plan._id}>
            <td><strong>{plan.name}</strong><small>{plan.code} · versión {plan.version}</small></td>
            <td>{money(plan.monthlyPriceCOP)}<small>COP / mes</small></td>
            <td><div className="fin-plans-tags">{plan.modules.map(key => <span key={key}>{catalog.modules.find(module => module.key === key)?.label || key}</span>)}</div></td>
            <td>{plan.limits.maxActiveUsers}</td>
            <td><span className={`fin-plans-badge fin-plans-badge--${plan.isActive ? 'ACTIVE' : 'INACTIVE'}`}>{plan.isActive ? 'Disponible' : 'Inactivo'}</span></td>
            <td><button className="fin-plans-button fin-plans-button--small fin-plans-button--secondary" onClick={() => openEditor(plan)} disabled={saving}><Pencil size={15} /> Editar {plan.name}</button></td>
          </tr>)}</tbody>
        </table></div>}
    </section>
    {showForm && <section className="fin-plans-card" ref={editor}>
      <h2>{editing ? `Editar ${editing.name}` : 'Crear plan'}</h2>
      <form className="fin-plans-form" onSubmit={save}>
        <div className="fin-plans-form-grid">
          <label>Código del plan<input value={form.code} onChange={event => setForm({ ...form, code: event.target.value.toUpperCase() })} required minLength={3} maxLength={40} pattern="[A-Z][A-Z0-9_]{2,39}" disabled={Boolean(editing) || saving} placeholder="ESENCIAL" /></label>
          <label>Nombre comercial<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required minLength={2} maxLength={100} disabled={saving} /></label>
          <label>Precio mensual en COP<input type="number" min="0" max="1000000000" step="1" value={form.monthlyPriceCOP} onChange={event => setForm({ ...form, monthlyPriceCOP: event.target.value })} required disabled={saving} /></label>
          <label className="fin-plans-check"><input type="checkbox" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} disabled={saving} /><span>Disponible para nuevas suscripciones</span></label>
        </div>
        <label>Descripción<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} maxLength={1000} disabled={saving} /></label>
        <PlanFields value={form} onChange={setForm} catalog={catalog} disabled={saving} />
        <label>Motivo para el historial<textarea value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} minLength={5} maxLength={500} required disabled={saving} placeholder="Explica por qué creas o modificas este plan" /></label>
        {formError && <p className="fin-plans-error" role="alert">{formError}</p>}
        <div className="fin-plans-actions"><button type="submit" className="fin-plans-button" disabled={saving}>{saving ? 'Guardando...' : editing ? 'Guardar nueva versión' : 'Crear plan'}</button><button type="button" className="fin-plans-button fin-plans-button--secondary" disabled={saving} onClick={() => setShowForm(false)}>Cancelar</button></div>
      </form>
    </section>}
  </main>;
}
