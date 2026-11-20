import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { PATHS } from '../../../routes/paths.js';
import UserWorkspaceLayout from '../../user/components/UserWorkspaceLayout.jsx';
import { getActivities, completeActivity } from '../services/activities.api.js';
import { ACTIVITY_TYPES, ACTIVITY_PRIORITIES, isOverdue, isUpcoming, activityStatus, formatActivityDate } from '../activity.utils.js';
import './ActivitiesPage.css';

export default function UserActivitiesPage() {
  const { token } = useAuth();
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [activeResult, setActiveResult] = useState(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      setActivities(await getActivities(token));
    } catch (err) { setError(err.message || 'No se pudieron consultar tus actividades.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => ({
    total: activities.length,
    pending: activities.filter(a => a.status === 'PENDING').length,
    completed: activities.filter(a => a.status === 'COMPLETED').length,
    overdue: activities.filter(activity => isOverdue(activity)).length,
  }), [activities]);

  const visible = useMemo(() => activities.filter(a => {
    if (filter === 'ALL') return true;
    if (filter === 'OVERDUE') return isOverdue(a);
    if (filter === 'UPCOMING') return isUpcoming(a);
    return a.status === filter;
  }), [activities, filter]);

  function openResult(id) {
    setActiveResult(id);
    setResult('');
    setError('');
    setNotice('');
  }

  async function finish(event, id) {
    event.preventDefault();
    if (!result.trim()) { setError('Debes escribir el resultado de la actividad.'); return; }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await completeActivity(token, id, result.trim());
      setActiveResult(null);
      setResult('');
      setNotice('Resultado registrado. La actividad quedó completada.');
      await load();
    } catch (err) { setError(err.message || 'No se pudo completar esta actividad.'); }
    finally { setSaving(false); }
  }

  return <UserWorkspaceLayout>
    <main className="fin-act">
      <Link className="fin-act-back" to={PATHS.userDashboard}><ArrowLeft size={17} aria-hidden="true" /> Volver al panel</Link>
      <header className="fin-act-page-heading">
        <div><h1>Mis actividades</h1><p>Consulta tus asignaciones, registra resultados y da seguimiento a tus fechas.</p></div>
        <div className="fin-act-header-actions">
          <button type="button" className="fin-act-btn fin-act-btn-outline" disabled={loading || saving} onClick={load}>
            <RefreshCw size={18} aria-hidden="true" /> {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </header>
      {error && <div className="fin-act-feedback fin-act-feedback-error" role="alert">{error}</div>}
      {notice && <div className="fin-act-feedback fin-act-feedback-success" role="status">{notice}</div>}

      <section className="fin-act-kpi-grid" aria-label="Resumen de mis actividades">
        <div className="fin-act-kpi"><span>Total asignadas</span><strong>{loading ? '—' : summary.total}</strong></div>
        <div className="fin-act-kpi"><span>Pendientes</span><strong>{loading ? '—' : summary.pending}</strong></div>
        <div className="fin-act-kpi"><span>Completadas</span><strong>{loading ? '—' : summary.completed}</strong></div>
        <div className="fin-act-kpi"><span>Vencidas</span><strong>{loading ? '—' : summary.overdue}</strong></div>
      </section>

      <section className="fin-act-card fin-act-section" aria-labelledby="myfilters-heading">
        <div className="fin-act-section-heading"><div><h2 id="myfilters-heading">Consultar actividades</h2><p>Filtra por estado o revisa las que vencen en los próximos siete días.</p></div></div>
        <div className="fin-act-filter-grid">
          <div className="fin-act-field"><label htmlFor="my-activities-filter">Mostrar</label>
            <select id="my-activities-filter" value={filter} onChange={event => setFilter(event.target.value)}>
              <option value="ALL">Todas mis actividades</option>
              <option value="PENDING">Pendientes</option>
              <option value="UPCOMING">Próximos 7 días</option>
              <option value="OVERDUE">Vencidas</option>
              <option value="COMPLETED">Completadas</option>
            </select></div>
          <div className="fin-act-field"><label>Resultado</label><p className="fin-act-meta">{loading ? 'Consultando…' : `${visible.length} de ${activities.length} actividades`}</p></div>
          <button type="button" className="fin-act-btn fin-act-btn-outline" onClick={() => setFilter('ALL')}>Limpiar filtros</button>
        </div>
      </section>

      <section className="fin-act-section" aria-labelledby="mylist-heading">
        <div className="fin-act-section-heading"><div><h2 id="mylist-heading">Actividades asignadas</h2><p>Solo se muestran las actividades que el ADMIN te asignó.</p></div></div>
        {loading ? <div className="fin-act-card"><div className="fin-act-skeleton" role="status" aria-label="Cargando actividades" /></div> : visible.length === 0 ? (
          <div className="fin-act-card fin-act-empty">No tienes actividades con este filtro. {activities.length === 0 ? 'Tu administrador podrá asignarte nuevas tareas.' : 'Selecciona otro estado para consultarlas.'}</div>
        ) : <div className="fin-act-activity-list">{visible.map(item => {
          const status = activityStatus(item);
          const recording = activeResult === item._id;
          return <article className="fin-act-item" key={item._id}>
            <div className="fin-act-item-header"><div><h3>{item.title}</h3>
              <p className="fin-act-item-meta">{ACTIVITY_TYPES[item.type] || 'Tarea'} · Prioridad: {ACTIVITY_PRIORITIES[item.priority] || item.priority} · Cliente: {item.clientId?.name || 'Sin cliente'}</p>
              <p className="fin-act-item-meta">Fecha límite: {formatActivityDate(item.dueAt)}</p>
            </div><span className={`fin-act-badge fin-act-badge-${status.kind}`}>{status.label}</span></div>
            {item.description && <p className="fin-act-item-description">{item.description}</p>}
            {item.status === 'COMPLETED' ? <div className="fin-act-result-box">
              <p><strong>Resultado registrado:</strong> {item.result}</p>
              <p className="fin-act-meta">Completada: {formatActivityDate(item.completedAt)}</p>
            </div> : <div className="fin-act-result-box">
              {!recording && <button type="button" className="fin-act-btn fin-act-btn-dark" disabled={saving}
                onClick={() => openResult(item._id)}>Registrar resultado</button>}
              {recording && <form className="fin-act-result-form" onSubmit={event => finish(event, item._id)}>
                <div className="fin-act-field"><label htmlFor={`act-result-${item._id}`}>Resultado de la gestión *</label>
                  <textarea id={`act-result-${item._id}`} required maxLength={3000} rows={4} value={result}
                    onChange={event => setResult(event.target.value)}
                    placeholder="Ej. Llamé al cliente y confirmó la reunión para el jueves." />
                  <small>Al guardar, la actividad se marcará como completada y el ADMIN podrá ver tu resultado.</small>
                </div>
                <div className="fin-act-result-actions">
                  <button type="button" className="fin-act-btn fin-act-btn-outline" disabled={saving}
                    onClick={() => { setActiveResult(null); setResult(''); }}>Cancelar</button>
                  <button type="submit" className="fin-act-btn fin-act-btn-primary" disabled={saving || !result.trim()}>
                    <CheckCircle2 size={20} aria-hidden="true" /> {saving ? 'Guardando…' : 'Registrar y completar'}
                  </button>
                </div>
              </form>}
            </div>}
          </article>;
        })}</div>}
      </section>
    </main>
  </UserWorkspaceLayout>;
}
