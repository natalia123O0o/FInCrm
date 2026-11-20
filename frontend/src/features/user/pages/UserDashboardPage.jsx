import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Target, Sparkles, ArrowRight, RefreshCw, UserRound } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { PATHS } from '../../../routes/paths.js';
import { getActivities } from '../../activities/services/activities.api.js';
import { isOverdue, isUpcoming } from '../../activities/activity.utils.js';
import UserWorkspaceLayout from '../components/UserWorkspaceLayout.jsx';
import './UserDashboardPage.css';
import '../../activities/pages/ActivitiesPage.css';

export default function UserDashboardPage() {
  const { user, token, subscription, subscriptionLoading, hasFeature } = useAuth();
  const activitiesEnabled = hasFeature("activities");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    if (!activitiesEnabled) { setActivities([]); setLoading(false); setError(''); return; }
    try {
      setLoading(true);
      setError('');
      setActivities(await getActivities(token));
    } catch (requestError) {
      setError(requestError.message || 'No fue posible cargar las actividades.');
    } finally {
      setLoading(false);
    }
  }, [token, activitiesEnabled]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    const pending = activities.filter(item => item.status === 'PENDING');
    return {
      pending: pending.length,
      completed: activities.filter(item => item.status === 'COMPLETED').length,
      upcoming: pending.filter(item => isUpcoming(item)).length,
      overdue: pending.filter(item => isOverdue(item)),
    };
  }, [activities]);

  return (
    <UserWorkspaceLayout>
      <main className="fin-act fin-user-dashboard">
        <header className="fin-act-page-heading">
          <div>
            <span className="fin-act-eyebrow">Espacio del colaborador</span>
            <h1>Hola, {user?.name || 'colaborador'}</h1>
            <p>Consulta tus actividades y mantén al día tus seguimientos comerciales.</p>
          </div>
          <button type="button" className="fin-act-btn fin-act-btn-outline" onClick={load} disabled={loading}>
            <RefreshCw size={18} aria-hidden="true" /> {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        </header>

        {error && <div className="fin-act-feedback fin-act-feedback-error" role="alert">{error}</div>}

        {!subscriptionLoading && !subscription && <p className="fin-act-feedback">Tu empresa todavía no tiene un plan asignado. Comunícate con su administrador.</p>}

        {activitiesEnabled && <section className="fin-act-kpi-grid" aria-label="Resumen de mis actividades">
          <div className="fin-act-kpi"><span>Pendientes</span><strong>{loading ? '—' : summary.pending}</strong></div>
          <div className="fin-act-kpi"><span>Próximos 7 días</span><strong>{loading ? '—' : summary.upcoming}</strong></div>
          <div className="fin-act-kpi"><span>Completadas</span><strong>{loading ? '—' : summary.completed}</strong></div>
          <div className="fin-act-kpi"><span>Vencidas</span><strong>{loading ? '—' : summary.overdue.length}</strong></div>
        </section>}

        <section className="fin-act-section" aria-labelledby="tools-heading">
          <div className="fin-act-section-heading"><div><h2 id="tools-heading">Mis herramientas</h2><p>Accesos rápidos a tus funciones de trabajo.</p></div></div>
          <div className="fin-user-tools-grid">
            {hasFeature("opportunities") && <article className="fin-act-card fin-user-tool">
              <Target aria-hidden="true" size={23} />
              <h3>Mis oportunidades</h3>
              <p>Negocios y prospectos comerciales asignados a tu cuenta.</p>
              <Link className="fin-act-inline-link" to={PATHS.userOpportunities}>Ver mis oportunidades <ArrowRight size={17} aria-hidden="true" /></Link>
            </article>}
            {activitiesEnabled && <article className="fin-act-card fin-user-tool">
              <CalendarDays aria-hidden="true" size={23} />
              <h3>Mis actividades</h3>
              <p>Consulta tus llamadas, reuniones y tareas; registra sus resultados.</p>
              <Link className="fin-act-inline-link" to={PATHS.userActivities}>Ver mis actividades <ArrowRight size={17} aria-hidden="true" /></Link>
            </article>}
            {hasFeature("ai") && <article className="fin-act-card fin-user-tool">
              <Sparkles aria-hidden="true" className="fin-user-ai-icon" size={23} />
              <h3>Asistente inteligente</h3>
              <p>Consulta el asistente de FinCRM con los permisos de tu sesión.</p>
              <Link className="fin-act-inline-link" to={PATHS.userAssistant}>Abrir asistente <ArrowRight size={17} aria-hidden="true" /></Link>
            </article>}
          </div>
        </section>

        <section className="fin-act-card fin-user-profile" aria-labelledby="profile-heading">
          <UserRound size={24} aria-hidden="true" />
          <div><h2 id="profile-heading">Mi información</h2><p><strong>Correo:</strong> {user?.email || 'No disponible'} · <strong>Rol:</strong> USER</p></div>
        </section>
      </main>
    </UserWorkspaceLayout>
  );
}
