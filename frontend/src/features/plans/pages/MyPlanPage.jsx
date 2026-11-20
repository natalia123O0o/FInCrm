import { useState } from 'react';
import { Check, LockKeyhole, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { dateTime, MODULES, money, subscriptionProblem } from '../plan.utils.js';
import './Plans.css';

const USAGE = [
  { key: 'aiRequests', limit: 'aiRequestsPerMonth', label: 'Consultas de IA', note: 'Cada análisis nuevo consume una consulta. Las respuestas reutilizadas y las consultas resueltas sin IA no consumen cuota; los intentos al proveedor cuentan aunque fallen.' },
  { key: 'quotes', limit: 'quotesPerMonth', label: 'Cotizaciones creadas' },
  { key: 'campaigns', limit: 'campaignsPerMonth', label: 'Campañas creadas' },
  { key: 'emails', limit: 'emailsPerMonth', label: 'Envíos de correo', note: 'Se cuentan los intentos de envío, incluidos los recordatorios internos, aunque fallen. Los códigos de verificación no consumen esta cuota.' },
];

export default function MyPlanPage() {
  const { subscription, subscriptionLoading, activeUsers, usage, tenant, sessionError, refreshSession } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() { setRefreshing(true); try { await refreshSession(); } finally { setRefreshing(false); } }
  const problem = subscriptionProblem(subscription);
  return <main className="fin-plans-page">
    <header className="fin-plans-header"><div><p className="fin-plans-eyebrow">SUSCRIPCIÓN DE MI EMPRESA</p><h1>Mi plan</h1><p>{tenant?.name || 'Consulta tus módulos, cupos y vigencia.'}</p></div><button className="fin-plans-button fin-plans-button--secondary" onClick={refresh} disabled={refreshing || subscriptionLoading}><RefreshCw size={17} />{refreshing ? 'Actualizando...' : 'Actualizar'}</button></header>
    {sessionError && <p className="fin-plans-error" role="alert">{sessionError}</p>}
    {subscriptionLoading ? <p role="status">Consultando tu suscripción...</p> : !subscription ? <section className="fin-plans-empty"><LockKeyhole size={32} /><h2>Plan pendiente de asignación</h2><p>El SUPER_ADMIN debe asignar un plan a tu empresa para habilitar sus funcionalidades.</p></section> : <>
      {problem && <p className="fin-plans-error" role="alert">{problem} Comunícate con el administrador de la plataforma.</p>}
      <section className="fin-plans-card fin-plans-contract">
        <div><p className="fin-plans-eyebrow">PLAN CONTRATADO</p><h2>{subscription.planName}</h2><p>{money(subscription.monthlyPriceCOP)} COP / mes</p></div>
        <dl><div><dt>Inicio</dt><dd>{dateTime(subscription.startsAt)}</dd></div><div><dt>Vencimiento</dt><dd>{subscription.endsAt ? dateTime(subscription.endsAt) : 'Sin vencimiento definido'}</dd></div><div><dt>Usuarios activos</dt><dd>{activeUsers ?? '—'} / {subscription.limits?.maxActiveUsers}</dd></div></dl>
      </section>
      <section className="fin-plans-card"><h2>Funcionalidades contratadas</h2><div className="fin-plans-module-list">{MODULES.map(module => {
        const included = subscription.modules?.includes(module.key);
        return <div key={module.key} className={included ? 'fin-plans-module-included' : ''}>{included ? <Check size={19} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}<span>{module.label}</span><small>{module.available === false ? 'Pendiente de desarrollo' : included ? 'Incluido' : 'No incluido'}</small></div>;
      })}</div></section>
      <section className="fin-plans-card"><h2>Uso del mes</h2><p className="fin-plans-hint">{usage?.period ? `Periodo: ${usage.period}. ` : ''}Las cuotas se comparten entre todos los usuarios de la empresa y se reinician cada mes, según hora Colombia.</p>
        <div className="fin-plans-usage-grid">{USAGE.map(item => {
          const limit = Number(subscription.limits?.[item.limit] || 0);
          const used = Number(usage?.[item.key] || 0);
          return <div className="fin-plans-usage" key={item.key}><h3>{item.label}</h3><p><strong>{used}</strong> / {limit}</p><progress max={Math.max(1, limit)} value={Math.min(used, Math.max(1, limit))} aria-label={`${item.label}: ${used} de ${limit}`} />{item.note && <small>{item.note}</small>}</div>;
        })}</div>
        <p className="fin-plans-hint">El cupo de usuarios activos incluye las cuentas ADMIN. Los usuarios bloqueados o inactivos conservan sus datos y no consumen un cupo activo.</p>
      </section>
      <div className="fin-plans-note">Los cambios de plan, módulos, cupos y vigencia los realiza el <strong>SUPER_ADMIN</strong>. Aquí puedes consultar la configuración vigente de tu empresa.</div>
    </>}
  </main>;
}
