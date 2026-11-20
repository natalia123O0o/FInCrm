import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, Pencil, X } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { PATHS } from '../../../routes/paths.js';
import { getActivities, createActivity, updateActivity } from '../services/activities.api.js';
import { ACTIVITY_TYPES, ACTIVITY_PRIORITIES, activityStatus, isOverdue, formatActivityDate, toDateTimeLocal } from '../activity.utils.js';
import './ActivitiesPage.css';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const EMPTY_FORM = {
  title: '', description: '', type: 'TASK', priority: 'MEDIUM',
  dueAt: '', assignedTo: '', clientId: ''
};

async function fetchReference(token, route, key) {
  let response;
  try {
    response = await fetch(`${BASE}${route}`, {
      method: 'GET', cache: 'no-store', headers: { Authorization: `Bearer ${token}` }
    });
  } catch { throw new Error('No hay conexión con el backend de FinCRM.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `No se pudo consultar ${route}.`);
  if (!Array.isArray(data[key])) throw new Error(`Respuesta inválida de ${route}.`);
  return data[key];
}

function StatusBadge({ activity }) {
  const status = activityStatus(activity);
  return <span className={`fin-act-badge fin-act-badge-${status.kind}`}>{status.label}</span>;
}

export default function AdminActivitiesPage() {
  const { token } = useAuth();
  const [activities, setActivities] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const [items, staff, customers] = await Promise.all([
        getActivities(token),
        fetchReference(token, '/api/users', 'users'),
        fetchReference(token, '/api/clients', 'clients')
      ]);
      setActivities(items);
      setEmployees(staff.filter(person => person.isActive));
      setClients(customers.filter(client => client.isActive !== false));
    } catch (err) {
      setError(err.message || 'No se pudo obtener la información.');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const count = useMemo(() => ({
    total: activities.length,
    pending: activities.filter(item => item.status === 'PENDING').length,
    completed: activities.filter(item => item.status === 'COMPLETED').length,
    overdue: activities.filter(item => isOverdue(item)).length,
  }), [activities]);

  const visible = useMemo(() => activities.filter(item => {
    const text = `${item.title} ${item.assignedTo?.name || ''} ${item.clientId?.name || ''}`.toLowerCase();
    const matchesSearch = text.includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === 'ALL'
      || (statusFilter === 'OVERDUE' ? isOverdue(item) : item.status === statusFilter);
    return matchesSearch && matchesStatus;
  }), [activities, search, statusFilter]);

  function startNew() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setEditorOpen(true);
    setNotice('');
    setError('');
  }

  function startEdit(item) {
    setForm({
      title: item.title || '', description: item.description || '',
      type: item.type || 'TASK', priority: item.priority || 'MEDIUM',
      dueAt: toDateTimeLocal(item.dueAt),
      assignedTo: item.assignedTo?._id || '', clientId: item.clientId?._id || ''
    });
    setEditingId(item._id);
    setEditorOpen(true);
    setNotice('');
    setError('');
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function closeEditor() {
    if (saving) return;
    setEditorOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function field(key, value) { setForm(current => ({ ...current, [key]: value })); }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const date = new Date(form.dueAt);
      if (Number.isNaN(date.getTime())) throw new Error('Selecciona una fecha límite válida.');
      const data = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        dueAt: date.toISOString(),
        clientId: form.clientId || null,
      };
      if (editingId) await updateActivity(token, editingId, data);
      else await createActivity(token, data);
      const wasEditing = Boolean(editingId);
      setEditorOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      setNotice(wasEditing ? 'Actividad actualizada correctamente.' : 'Actividad asignada correctamente.');
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la actividad.');
    } finally { setSaving(false); }
  }

  return <main className="fin-act">
    <Link className="fin-act-back" to={PATHS.dashboard}><ArrowLeft size={17} aria-hidden="true" /> Volver al panel</Link>
    <header className="fin-act-page-heading">
      <div><h1>Gestión de actividades</h1><p>Asigna tareas a tu equipo y revisa resultados por empleado.</p></div>
      <div className="fin-act-header-actions">
        {!editorOpen && <button type="button" className="fin-act-btn fin-act-btn-primary" onClick={startNew} disabled={loading || employees.length === 0}>
          <Plus size={20} aria-hidden="true" /> Nueva actividad
        </button>}
        <button type="button" className="fin-act-btn fin-act-btn-outline" onClick={load} disabled={loading || saving}>
          <RefreshCw size={18} aria-hidden="true" /> {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
    </header>

    {error && <div className="fin-act-feedback fin-act-feedback-error" role="alert">{error}</div>}
    {notice && <div className="fin-act-feedback fin-act-feedback-success" role="status">{notice}</div>}
    {!loading && employees.length === 0 && <div className="fin-act-feedback" role="status">
      Aún no hay empleados activos disponibles. Registra un empleado desde <Link to={PATHS.users}>Empleados</Link> para crear actividades.
    </div>}

    {editorOpen && <section className="fin-act-card fin-act-section" aria-labelledby="editor-heading">
      <div className="fin-act-section-heading"><div>
        <h2 id="editor-heading">{editingId ? 'Editar actividad pendiente' : 'Asignar nueva actividad'}</h2>
        <p>Los empleados y clientes se cargan únicamente desde tu empresa.</p>
      </div><button className="fin-act-btn fin-act-btn-outline fin-act-btn-small" type="button" onClick={closeEditor} disabled={saving}>
        <X size={18} aria-hidden="true" /> Cerrar
      </button></div>
      <form className="fin-act-grid" onSubmit={save}>
        <div className="fin-act-field"><label htmlFor="act-title">Título de la actividad *</label>
          <input id="act-title" required maxLength={120} value={form.title} onChange={e => field('title', e.target.value)} placeholder="Ej. Confirmar reunión con el cliente" /></div>
        <div className="fin-act-field"><label htmlFor="act-assignee">Empleado asignado *</label>
          <select id="act-assignee" required value={form.assignedTo} onChange={e => field('assignedTo', e.target.value)}>
            <option value="">Selecciona un empleado</option>{employees.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}
          </select></div>
        <div className="fin-act-field"><label htmlFor="act-type">Tipo de actividad *</label>
          <select id="act-type" value={form.type} onChange={e => field('type', e.target.value)}>
            {Object.entries(ACTIVITY_TYPES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select></div>
        <div className="fin-act-field"><label htmlFor="act-priority">Prioridad *</label>
          <select id="act-priority" value={form.priority} onChange={e => field('priority', e.target.value)}>
            {Object.entries(ACTIVITY_PRIORITIES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select></div>
        <div className="fin-act-field"><label htmlFor="act-date">Fecha y hora límite *</label>
          <input id="act-date" required type="datetime-local" value={form.dueAt} onChange={e => field('dueAt', e.target.value)} /></div>
        <div className="fin-act-field"><label htmlFor="act-client">Cliente relacionado (opcional)</label>
          <select id="act-client" value={form.clientId} onChange={e => field('clientId', e.target.value)}>
            <option value="">Sin cliente vinculado</option>{clients.map(client => <option value={client._id} key={client._id}>{client.name}{client.documentNumber ? ` · ${client.documentNumber}` : ''}</option>)}
          </select></div>
        <div className="fin-act-field fin-act-grid-full"><label htmlFor="act-description">Descripción o instrucciones</label>
          <textarea id="act-description" rows={3} maxLength={2000} value={form.description} onChange={e => field('description', e.target.value)}
            placeholder="Describe el objetivo de esta actividad para el empleado." />
          <small>Máximo 2.000 caracteres.</small></div>
        <div className="fin-act-grid-full fin-act-form-actions">
          <button type="button" className="fin-act-btn fin-act-btn-outline" disabled={saving} onClick={closeEditor}>Cancelar</button>
          <button type="submit" className="fin-act-btn fin-act-btn-primary" disabled={saving || loading}>
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Asignar actividad'}
          </button>
        </div>
      </form>
    </section>}

    <section className="fin-act-kpi-grid" aria-label="Indicadores de actividades">
      <div className="fin-act-kpi"><span>Total de actividades</span><strong>{loading ? '—' : count.total}</strong></div>
      <div className="fin-act-kpi"><span>Pendientes</span><strong>{loading ? '—' : count.pending}</strong></div>
      <div className="fin-act-kpi"><span>Completadas</span><strong>{loading ? '—' : count.completed}</strong></div>
      <div className="fin-act-kpi"><span>Vencidas</span><strong>{loading ? '—' : count.overdue}</strong></div>
    </section>

    <section className="fin-act-card fin-act-section" aria-labelledby="filters-heading">
      <div className="fin-act-section-heading"><div><h2 id="filters-heading">Buscar actividades</h2><p>Filtra por estado, cliente, título o responsable.</p></div></div>
      <div className="fin-act-filter-grid">
        <div className="fin-act-field"><label htmlFor="act-search">Buscar</label><input id="act-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Actividad, empleado o cliente" /></div>
        <div className="fin-act-field"><label htmlFor="act-filter">Estado</label><select id="act-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="ALL">Todas</option><option value="PENDING">Pendientes</option><option value="COMPLETED">Completadas</option><option value="OVERDUE">Vencidas</option>
        </select></div>
        <button type="button" className="fin-act-btn fin-act-btn-outline" onClick={() => { setSearch(''); setStatusFilter('ALL'); }}>Limpiar filtros</button>
      </div>
    </section>

    <section className="fin-act-card fin-act-section" aria-labelledby="list-heading">
      <div className="fin-act-section-heading"><div><h2 id="list-heading">Supervisión del equipo</h2><p>{loading ? 'Consultando…' : `${visible.length} de ${activities.length} actividades`}</p></div></div>
      {loading ? <div className="fin-act-skeleton" role="status" aria-label="Cargando actividades" /> : visible.length === 0 ? (
        <div className="fin-act-empty">No hay actividades con esos filtros. {activities.length === 0 ? 'Crea una para comenzar.' : 'Puedes limpiar los filtros.'}</div>
      ) : <div className="fin-act-table-scroll"><table className="fin-act-table">
        <thead><tr><th>Actividad</th><th>Empleado</th><th>Cliente</th><th>Fecha límite</th><th>Prioridad</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>{visible.map(item => <tr key={item._id}>
          <td className="fin-act-truncate"><strong>{item.title}</strong><div className="fin-act-meta">{ACTIVITY_TYPES[item.type] || item.type}</div>
            {item.description && <details className="fin-act-details"><summary>Descripción</summary><p>{item.description}</p></details>}
            {item.status === 'COMPLETED' && <details className="fin-act-details"><summary>Ver resultado</summary><p>{item.result}</p><p>Finalizada: {formatActivityDate(item.completedAt)}</p></details>}
          </td>
          <td>{item.assignedTo?.name || 'No disponible'}</td><td>{item.clientId?.name || '—'}</td><td>{formatActivityDate(item.dueAt)}</td>
          <td>{ACTIVITY_PRIORITIES[item.priority] || item.priority}</td><td><StatusBadge activity={item} /></td>
          <td>{item.status === 'PENDING' ? <button className="fin-act-btn fin-act-btn-dark fin-act-btn-small" type="button" onClick={() => startEdit(item)}>
            <Pencil size={16} aria-hidden="true" /> Editar</button> : <span className="fin-act-meta">Finalizada</span>}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </main>;
}
