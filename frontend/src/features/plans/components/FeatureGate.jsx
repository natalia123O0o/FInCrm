import { Link } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { canUseFeature, MODULES, subscriptionProblem } from '../plan.utils.js';
import { PATHS } from '../../../routes/paths.js';
import '../pages/Plans.css';

export default function FeatureGate({ feature, children }) {
  const { subscription, subscriptionLoading, sessionError, user, refreshSession } = useAuth();
  if (subscriptionLoading) return <main className="fin-plans-page"><p role="status">Consultando las funcionalidades de tu empresa...</p></main>;
  if (canUseFeature(subscription, feature)) return children;
  return <main className="fin-plans-page">
    <section className="fin-plans-empty">
      <LockKeyhole size={32} aria-hidden="true" />
      <h1>{sessionError ? 'No pudimos consultar tu plan' : 'Funcionalidad no disponible'}</h1>
      <p>{sessionError || subscriptionProblem(subscription) || `${MODULES.find(item => item.key === feature)?.label || 'Este módulo'} no está incluido en el plan de tu empresa.`}</p>
      <p>El SUPER_ADMIN puede revisar la suscripción y los módulos contratados.</p>
      <div className="fin-plans-actions">
        <Link className="fin-plans-button" to={user?.role === 'ADMIN' ? PATHS.myPlan : PATHS.userDashboard}>
          {user?.role === 'ADMIN' ? 'Ver mi plan' : 'Volver a mi panel'}
        </Link>
        {sessionError && <button className="fin-plans-button fin-plans-button--secondary" onClick={() => refreshSession()}>Reintentar</button>}
      </div>
    </section>
  </main>;
}
