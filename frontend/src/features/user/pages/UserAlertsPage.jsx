import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CalendarClock, RefreshCw } from 'lucide-react';
import UserWorkspaceLayout from '../components/UserWorkspaceLayout.jsx';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { PATHS } from '../../../routes/paths.js';
import { getActivities } from '../../activities/services/activities.api.js';
import { isOverdue, isUpcoming, formatActivityDate } from '../../activities/activity.utils.js';
import '../../activities/pages/ActivitiesPage.css';

export default function UserAlertsPage() {
  const { token } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try { setActivities(await getActivities(token)); }
    catch (e) { setError(e.message || 'No se pudieron consultar las alertas.'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  const alerts = useMemo(() => activities.filter(item => isOverdue(item) || isUpcoming(item))
    .sort((a,b) => new Date(a.dueAt) - new Date(b.dueAt)), [activities]);

  return <UserWorkspaceLayout><main className="fin-act">
    <Link className="fin-act-back" to={PATHS.userDashboard}><ArrowLeft size={18}/> Volver a mi panel</Link>
    <header className="fin-act-page-heading"><div><h1>Mis alertas</h1><p>Actividades vencidas o próximas a vencer en siete días.</p></div>
      <button type="button" className="fin-act-btn fin-act-btn-outline" disabled={loading} onClick={load}><RefreshCw size={18}/> {loading?'Actualizando…':'Actualizar'}</button></header>
    {error && <div className="fin-act-feedback fin-act-feedback-error" role="alert">{error}</div>}
    <section className="fin-act-card fin-act-section" aria-labelledby="alerts-list-title">
      <div className="fin-act-section-heading"><div><h2 id="alerts-list-title">Recordatorios internos</h2><p>Se calculan a partir de tus actividades, sin enviar mensajes externos.</p></div></div>
      {loading ? <div className="fin-act-skeleton" role="status" aria-label="Cargando alertas"/> : alerts.length === 0 ?
        <div className="fin-act-empty">No tienes actividades vencidas ni próximas a vencer.</div> :
        <div className="fin-act-activity-list">{alerts.map(item=><article className="fin-act-item" key={item._id}>
          <div className="fin-act-item-header"><div>
            {isOverdue(item) ? <AlertTriangle size={20} aria-hidden="true"/> : <CalendarClock size={20} aria-hidden="true"/>}
            <h3>{item.title}</h3><p className="fin-act-item-meta">Vence: {formatActivityDate(item.dueAt)} · Cliente: {item.clientId?.name || 'Sin cliente'}</p></div>
            <span className={`fin-act-badge fin-act-badge-${isOverdue(item)?'danger':'warning'}`}>{isOverdue(item)?'Vencida':'Próxima'}</span></div>
          <Link className="fin-act-inline-link" to={PATHS.userActivities}>Ver en mis actividades</Link>
        </article>)}</div>}
    </section>
  </main></UserWorkspaceLayout>;
}
