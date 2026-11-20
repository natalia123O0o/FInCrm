import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, UserRoundPlus } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { platformRequest } from '../../plans/services/plans.api.js';
import { colombiaInput, colombiaISO, dateTime, INITIAL_LIMITS, LIMITS, MODULES, money, STATUS_LABELS, userStatus } from '../../plans/plan.utils.js';
import PlanFields from '../../plans/components/PlanFields.jsx';
import UserStatusDialog from '../../plans/components/UserStatusDialog.jsx';
import TenantAdminForm from '../components/TenantAdminForm.jsx';
import Modal from '../../../components/common/Modal.jsx';
import { PATHS } from '../../../routes/paths.js';
import '../../plans/pages/Plans.css';

const ACTIONS = {
  TENANT_SUBSCRIPTION_UPDATED: 'Cambio de suscripción', SUBSCRIPTION_UPDATED: 'Cambio de suscripción',
  SUBSCRIPTION_ASSIGNED: 'Asignación de plan', TENANT_STATUS_CHANGED: 'Cambio de estado de empresa',
  TENANT_STATUS_UPDATED: 'Cambio de estado de empresa', USER_STATUS_CHANGED: 'Cambio de estado de usuario',
  USER_STATUS_UPDATED: 'Cambio de estado de usuario', USER_CREATED: 'Usuario registrado',
  TENANT_CREATED: 'Empresa registrada', TENANT_UPDATED: 'Datos de empresa actualizados',
  ADMIN_CREATED: 'Administrador registrado', USER_STATUS_MIGRATED: 'Actualización de estados',
};

function ChangeSummary({ value }) {
  if (!value) return <p>Sin registro anterior.</p>;
  const data = value.subscription || value;
  return <ul className="fin-plans-change-summary">
    {data.name && <li>Nombre: {data.name}</li>}
    {data.status && <li>Estado: {STATUS_LABELS[data.status] || data.status}</li>}
    {data.planName && <li>Plan: {data.planName}</li>}
    {data.planVersion && <li>Versión contratada: {data.planVersion}</li>}
    {data.monthlyPriceCOP != null && <li>Precio: {money(data.monthlyPriceCOP)} al mes</li>}
    {data.modules && <li>Módulos: {data.modules.map(key => MODULES.find(module => module.key === key)?.label || key).join(', ') || 'Ninguno'}</li>}
    {data.limits && LIMITS.map(limit => data.limits[limit.key] != null && <li key={limit.key}>{limit.label}: {data.limits[limit.key]}</li>)}
    {data.startsAt && <li>Inicio: {dateTime(data.startsAt)}</li>}
    {Object.hasOwn(data, 'endsAt') && <li>Vencimiento: {data.endsAt ? dateTime(data.endsAt) : 'Sin vencimiento'}</li>}
  </ul>;
}

export default function TenantDetailPage() {
  const { tenantId } = useParams();
  const { token, user } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [plans, setPlans] = useState([]);
  const [catalog, setCatalog] = useState({ modules: MODULES, limits: LIMITS });
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState('');
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [statusError, setStatusError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);

  const load = useCallback(async signal => {
    setLoading(true); setError('');
    try {
      const [detail, planData, userData, audit] = await Promise.all([
        platformRequest(token, `/api/tenants/${tenantId}`, { signal }),
        platformRequest(token, '/api/plans', { signal }),
        platformRequest(token, `/api/tenants/${tenantId}/users`, { signal }),
        platformRequest(token, `/api/tenants/${tenantId}/audit?page=1&pageSize=20`, { signal }),
      ]);
      if (signal?.aborted) return;
      setTenant(detail.tenant); setActiveUsers(detail.activeUsers || 0); setPlans(planData.plans || []);
      if (planData.catalog) setCatalog(planData.catalog);
      setUsers(userData.users || []); setEvents(audit.events || []); setAuditTotal(audit.total || 0); setAuditPage(1);
      const subscription = detail.subscription || detail.tenant.subscription;
      setForm({ planId: subscription?.planId || '', modules: subscription?.modules || [],
        limits: { ...(subscription?.limits || INITIAL_LIMITS) }, startsAt: colombiaInput(subscription?.startsAt || new Date()),
        endsAt: colombiaInput(subscription?.endsAt), reason: '' });
    } catch (err) { if (err.name !== 'AbortError') setError(err.message); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [token, tenantId]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);

  function selectPlan(id) {
    const plan = plans.find(item => item._id === id);
    setForm(previous => ({ ...previous, planId: id, modules: plan ? [...plan.modules] : [], limits: { ...(plan?.limits || INITIAL_LIMITS) } }));
  }
  async function saveSubscription(event) {
    event.preventDefault(); setFormError(''); setSuccess('');
    if (form.reason.trim().length < 5) { setFormError('Escribe un motivo de al menos 5 caracteres.'); return; }
    if (form.endsAt && form.endsAt <= form.startsAt) { setFormError('La fecha de vencimiento debe ser posterior al inicio.'); return; }
    setSaving('subscription');
    try {
      await platformRequest(token, `/api/tenants/${tenantId}/subscription`, { method: 'PATCH', body: {
        planId: form.planId, modules: form.modules, limits: form.limits,
        startsAt: colombiaISO(form.startsAt), endsAt: colombiaISO(form.endsAt), reason: form.reason.trim(),
        expectedVersion: tenant.managementVersion ?? 0,
      } });
      setSuccess('Suscripción actualizada. Los módulos y límites ya se validan en las nuevas operaciones de la empresa.');
      await load();
    } catch (err) { setFormError(err.status === 409 ? `${err.message} Actualiza la ficha antes de volver a guardar.` : err.message); }
    finally { setSaving(''); }
  }
  async function changeTenantStatus(event) {
    event.preventDefault(); setStatusError(''); setSuccess('');
    if (statusReason.trim().length < 5) { setStatusError('Escribe un motivo de al menos 5 caracteres.'); return; }
    setSaving('status');
    const status = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await platformRequest(token, `/api/tenants/${tenantId}/status`, { method: 'PATCH', body: {
        status, reason: statusReason.trim(), expectedVersion: tenant.managementVersion ?? 0,
      } });
      setStatusReason(''); setSuccess(status === 'SUSPENDED' ? 'Empresa suspendida. Sus usuarios perdieron el acceso y sus registros se conservaron.' : 'Empresa reactivada. Sus usuarios deben iniciar sesión de nuevo.');
      await load();
    } catch (err) { setStatusError(err.status === 409 ? `${err.message} Actualiza la ficha antes de volver a guardar.` : err.message); }
    finally { setSaving(''); }
  }
  async function moreAudit() {
    setAuditLoading(true);
    try {
      const nextPage = auditPage + 1;
      const result = await platformRequest(token, `/api/tenants/${tenantId}/audit?page=${nextPage}&pageSize=20`);
      setEvents(previous => [...previous, ...(result.events || [])]); setAuditPage(nextPage); setAuditTotal(result.total || 0);
    } catch (err) { setError(err.message); }
    finally { setAuditLoading(false); }
  }
  const selectedPlan = plans.find(plan => plan._id === form?.planId);
  return <main className="fin-plans-page">
    <Link className="fin-plans-back" to={PATHS.superAdminDashboard}><ArrowLeft size={17} /> Todas las empresas</Link>
    <header className="fin-plans-header"><div><p className="fin-plans-eyebrow">SUPER_ADMIN · EMPRESA</p><h1>{tenant?.name || 'Configuración de empresa'}</h1><p>Plan, funcionalidades y acceso de los usuarios.</p></div><button className="fin-plans-button fin-plans-button--secondary" disabled={loading || Boolean(saving)} onClick={() => load()}><RefreshCw size={17} /> Actualizar ficha</button></header>
    {success && <p className="fin-plans-success" role="status">{success}</p>}
    {error && <p className="fin-plans-error" role="alert">{error}</p>}
    {loading && <p role="status">Cargando empresa...</p>}
    {!loading && tenant && <>
      <section className="fin-plans-card fin-plans-contract"><div><span className={`fin-plans-badge fin-plans-badge--${tenant.status}`}>{tenant.status === 'ACTIVE' ? 'Empresa activa' : 'Empresa suspendida'}</span><h2>{tenant.subscription?.planName || 'Sin plan asignado'}</h2><p>{tenant.subdomain}{tenant.nit ? ` · NIT ${tenant.nit}` : ''}</p></div><dl><div><dt>Usuarios activos</dt><dd>{activeUsers} / {tenant.subscription?.limits?.maxActiveUsers ?? 'sin cupo asignado'}</dd></div><div><dt>Vigencia</dt><dd>{tenant.subscription?.endsAt ? dateTime(tenant.subscription.endsAt) : 'Sin vencimiento definido'}</dd></div></dl></section>
      <section className="fin-plans-card"><h2>Plan y funcionalidades de la empresa</h2><p className="fin-plans-hint">Seleccionar un plan carga sus condiciones actuales. Puedes ajustar módulos y límites para esta empresa; el motivo quedará en el historial.</p>
        {plans.length === 0 ? <p>Primero <Link to={PATHS.superAdminPlans}>crea un plan en el catálogo</Link>.</p> : <form className="fin-plans-form" onSubmit={saveSubscription}>
          <label>Plan contratado<select value={form.planId} required disabled={Boolean(saving)} onChange={event => selectPlan(event.target.value)}><option value="">Selecciona un plan</option>{plans.filter(plan => plan.isActive || plan._id === form.planId).map(plan => <option value={plan._id} key={plan._id} disabled={!plan.isActive}>{plan.name} · {money(plan.monthlyPriceCOP)} al mes · v{plan.version}{!plan.isActive ? ' (inactivo)' : ''}</option>)}</select></label>
          {tenant.subscription && selectedPlan && tenant.subscription.planVersion !== selectedPlan.version && tenant.subscription.planId === selectedPlan._id && <p className="fin-plans-note">La empresa tiene la versión {tenant.subscription.planVersion}; el catálogo está en la versión {selectedPlan.version}. <button type="button" className="fin-plans-text-button" onClick={() => selectPlan(selectedPlan._id)}>Cargar condiciones de la versión actual</button></p>}
          <div className="fin-plans-form-grid"><label>Inicio (hora Colombia)<input type="datetime-local" value={form.startsAt} required disabled={Boolean(saving)} onChange={event => setForm({ ...form, startsAt: event.target.value })} /></label><label>Vencimiento (hora Colombia, opcional)<input type="datetime-local" value={form.endsAt} disabled={Boolean(saving)} onChange={event => setForm({ ...form, endsAt: event.target.value })} /></label></div>
          <PlanFields value={form} onChange={setForm} catalog={catalog} disabled={Boolean(saving) || !form.planId} />
          <label>Motivo del cambio<textarea required minLength={5} maxLength={500} value={form.reason} disabled={Boolean(saving)} onChange={event => setForm({ ...form, reason: event.target.value })} placeholder="Ejemplo: empresa contrata el plan Negocio con 12 usuarios" /></label>
          {formError && <p className="fin-plans-error" role="alert">{formError}</p>}
          <button type="submit" className="fin-plans-button" disabled={Boolean(saving) || !selectedPlan?.isActive}>{saving === 'subscription' ? 'Aplicando...' : 'Aplicar plan y funcionalidades'}</button>
        </form>}
      </section>
      <section className="fin-plans-card"><div className="fin-plans-section-heading"><div><h2>Usuarios de la empresa</h2><p className="fin-plans-hint">Activa, inactiva o bloquea cuentas conservando su historial.</p></div><button className="fin-plans-button fin-plans-button--secondary" disabled={!tenant.subscription || tenant.status !== 'ACTIVE'} onClick={() => setShowAdmin(true)}><UserRoundPlus size={17} /> Nuevo administrador</button></div>
        {users.length === 0 ? <p>La empresa aún no tiene usuarios.</p> : <div className="fin-plans-table-scroll"><table className="fin-plans-table"><thead><tr><th>Nombre y correo</th><th>Rol</th><th>Estado</th><th>Último ingreso</th><th>Acciones</th></tr></thead><tbody>{users.map(item => <tr key={item._id}><td><strong>{item.name}</strong><small>{item.email}</small></td><td>{item.role}</td><td><span className={`fin-plans-badge fin-plans-badge--${userStatus(item)}`}>{STATUS_LABELS[userStatus(item)]}</span></td><td>{item.lastLoginAt ? dateTime(item.lastLoginAt) : 'Sin ingresos'}</td><td><button className="fin-plans-button fin-plans-button--small fin-plans-button--secondary" disabled={item.role === 'SUPER_ADMIN' || (item._id === (user?.id || user?._id))} onClick={() => setSelectedUser(item)}>Cambiar estado de {item.name}</button></td></tr>)}</tbody></table></div>}
      </section>
      <section className="fin-plans-card"><h2>{tenant.status === 'ACTIVE' ? 'Suspender el acceso a la empresa' : 'Reactivar el acceso a la empresa'}</h2><p className="fin-plans-hint">{tenant.status === 'ACTIVE' ? 'La suspensión impide el acceso de todos sus usuarios. La información de la empresa se conserva.' : 'La reactivación permite iniciar nuevas sesiones; la vigencia del plan sigue aplicando.'}</p><form className="fin-plans-form" onSubmit={changeTenantStatus}><label>Motivo de {tenant.status === 'ACTIVE' ? 'suspensión' : 'reactivación'}<textarea value={statusReason} required minLength={5} maxLength={500} disabled={Boolean(saving)} onChange={event => setStatusReason(event.target.value)} /></label>{statusError && <p className="fin-plans-error" role="alert">{statusError}</p>}<button type="submit" className={`fin-plans-button ${tenant.status === 'ACTIVE' ? 'fin-plans-button--danger' : ''}`} disabled={Boolean(saving)}>{saving === 'status' ? 'Guardando...' : tenant.status === 'ACTIVE' ? 'Suspender empresa' : 'Reactivar empresa'}</button></form></section>
      <section className="fin-plans-card"><h2>Historial de cambios</h2><p className="fin-plans-hint">Responsable, fecha, motivo y condiciones anteriores y nuevas.</p>{events.length === 0 ? <p>Todavía no hay cambios registrados.</p> : <ol className="fin-plans-audit">{events.map(item => <li key={item._id}><div className="fin-plans-section-heading"><strong>{ACTIONS[item.action] || 'Actualización administrativa'}</strong><time dateTime={item.createdAt}>{dateTime(item.createdAt)}</time></div><p>{item.actorName || 'Usuario registrado'} · {item.reason || 'Sin motivo adicional'}</p><details><summary>Ver condiciones anteriores y nuevas</summary><div className="fin-plans-form-grid"><section><h3>Antes</h3><ChangeSummary value={item.before} /></section><section><h3>Después</h3><ChangeSummary value={item.after} /></section></div></details></li>)}</ol>}{events.length < auditTotal && <button className="fin-plans-button fin-plans-button--secondary" disabled={auditLoading} onClick={moreAudit}>{auditLoading ? 'Cargando...' : 'Ver más cambios'}</button>}</section>
    </>}
    {selectedUser && <UserStatusDialog key={selectedUser._id} user={selectedUser} token={token} tenantId={tenantId} onClose={() => setSelectedUser(null)} onSaved={async () => { setSuccess('Estado de usuario actualizado. Sus registros se conservaron.'); await load(); }} />}
    <Modal open={showAdmin} onClose={() => setShowAdmin(false)} title="Registrar administrador" label={tenant?.name}>{tenant && <TenantAdminForm tenant={tenant} onCancel={() => setShowAdmin(false)} onCreated={async () => { setShowAdmin(false); setSuccess('Administrador registrado correctamente.'); await load(); }} />}</Modal>
  </main>;
}
