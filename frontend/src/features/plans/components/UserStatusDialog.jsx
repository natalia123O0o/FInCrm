import { useCallback, useState } from 'react';
import Modal from '../../../components/common/Modal.jsx';
import { platformRequest } from '../services/plans.api.js';
import { STATUS_LABELS, userStatus } from '../plan.utils.js';
import '../pages/Plans.css';

export default function UserStatusDialog({ user, token, tenantId, onClose, onSaved }) {
  const [status, setStatus] = useState(userStatus(user));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  async function submit(event) {
    event.preventDefault();
    if (reason.trim().length < 5) { setError('Escribe un motivo de al menos 5 caracteres.'); return; }
    setBusy(true); setError('');
    try {
      const id = user._id || user.id;
      const path = tenantId ? `/api/tenants/${tenantId}/users/${id}/status` : `/api/users/${id}/status`;
      const data = await platformRequest(token, path, { method: 'PATCH', body: { status, reason: reason.trim(), expectedVersion: user.__v ?? 0 } });
      await onSaved(data.user);
      onClose();
    } catch (err) { setError(err.status === 409 ? `${err.message} Cierra este formulario y actualiza la lista antes de intentarlo de nuevo.` : err.message); }
    finally { setBusy(false); }
  }
  return <Modal open onClose={close} title="Cambiar estado de usuario" label="TRAZABILIDAD DE LA EMPRESA">
    <form className="fin-plans-form" onSubmit={submit}>
      <p><strong>{user.name}</strong><br />{user.email}</p>
      <label>Nuevo estado<select value={status} disabled={busy} onChange={event => setStatus(event.target.value)}>
        {['ACTIVE', 'INACTIVE', 'BLOCKED'].map(value => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
      </select></label>
      <p className="fin-plans-hint">{status === 'ACTIVE' ? 'Podrá iniciar una nueva sesión si la empresa está activa y hay cupos disponibles.' : 'Perderá el acceso. Sus pagos, actividades y demás registros conservarán su autoría.'}</p>
      <label>Motivo del cambio<textarea value={reason} minLength={5} maxLength={500} required disabled={busy}
        onChange={event => setReason(event.target.value)} placeholder="Ejemplo: finalización de contrato" /></label>
      {error && <p className="fin-plans-error" role="alert">{error}</p>}
      <div className="fin-plans-actions">
        <button type="button" className="fin-plans-button fin-plans-button--secondary" onClick={close} disabled={busy}>Cancelar</button>
        <button className="fin-plans-button" disabled={busy || status === userStatus(user)}>{busy ? 'Guardando...' : 'Guardar estado'}</button>
      </div>
    </form>
  </Modal>;
}
