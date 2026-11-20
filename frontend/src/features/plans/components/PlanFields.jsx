import { LIMITS, MODULES } from '../plan.utils.js';

export default function PlanFields({ value, onChange, catalog, disabled = false }) {
  const modules = catalog?.modules || MODULES;
  const limits = catalog?.limits || LIMITS;
  function toggleModule(key, checked) {
    const current = value.modules || [];
    const added = checked && ['quotes', 'campaigns'].includes(key) ? [key, 'opportunities'] : [key];
    onChange({ ...value, modules: checked ? [...new Set([...current, ...added])] : current.filter(item => item !== key) });
  }
  return <>
    <fieldset className="fin-plans-fieldset" disabled={disabled}>
      <legend>Módulos incluidos</legend>
      <div className="fin-plans-modules">
        {modules.map(module => <label className="fin-plans-check" key={module.key}>
          <input type="checkbox" checked={Boolean(value.modules?.includes(module.key))}
            disabled={module.available === false || module.key === 'crm' || (module.key === 'opportunities' && (value.modules?.includes('quotes') || value.modules?.includes('campaigns')))}
            onChange={event => toggleModule(module.key, event.target.checked)} />
          <span>{module.label}{module.available === false && <small>Pendiente de desarrollo</small>}</span>
        </label>)}
      </div>
      <p className="fin-plans-hint">El CRM está incluido en todos los planes. Cotizaciones y Campañas requieren Oportunidades comerciales.</p>
    </fieldset>
    <fieldset className="fin-plans-fieldset" disabled={disabled}>
      <legend>Límites del plan</legend>
      <div className="fin-plans-form-grid">
        {limits.map(limit => <label key={limit.key}>{limit.label}
          <input type="number" min={limit.min ?? 0} max={1000000000} step="1" required
            value={value.limits?.[limit.key] ?? 0}
            onChange={event => onChange({ ...value, limits: { ...value.limits, [limit.key]: event.target.value === '' ? '' : Number(event.target.value) } })} />
        </label>)}
      </div>
      <p className="fin-plans-hint">Los usuarios inactivos o bloqueados conservan su historial y no ocupan un cupo activo. Las cuotas mensuales se comparten entre los usuarios de la empresa.</p>
    </fieldset>
  </>;
}
