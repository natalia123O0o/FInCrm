import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Clock3, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import './NotificationBell.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function api(token, path, options = {}) {
  const response = await fetch(`${BASE_URL}/api/notifications${path}`, {
    method: options.method || 'GET',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Error al consultar las notificaciones.');
  return data;
}

function dateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota'
  }).format(date);
}

export default function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const container = useRef(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api(token, '');
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnread(Number(data.unreadCount) || 0);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible cargar las notificaciones.');
    }
  }, [token]);

  useEffect(() => {
    load();
    // Consultar periódicamente sin interrumpir el trabajo del empleado.
    const timer = window.setInterval(load, 60_000);
    const onFocus = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (!container.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  async function toggle() {
    if (!open) {
      setLoading(true);
      try { await load(); } finally { setLoading(false); }
    }
    setOpen(current => !current);
  }

  async function markRead(notification) {
    try {
      await api(token, `/${notification._id}/read`, { method: 'PATCH' });
      setItems(current => current.map(item => item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item));
      if (!notification.readAt) setUnread(current => Math.max(0, current - 1));
    } catch (requestError) { setError(requestError.message); }
    setOpen(false);
  }

  async function markAllRead() {
    setLoading(true);
    try {
      await api(token, '/read-all', { method: 'PATCH' });
      setItems(current => current.map(item => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnread(0);
      setError('');
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fin-notifications" ref={container}>
      <button type="button" className="fin-notifications-trigger"
        aria-label={`Notificaciones: ${unread} sin leer`}
        title="Notificaciones"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}>
        <Bell size={21} aria-hidden="true" />
        {unread > 0 && <span className="fin-notifications-count">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && <section className="fin-notifications-popover" role="dialog" aria-label="Mis notificaciones">
        <div className="fin-notifications-heading">
          <div><h2>Notificaciones</h2><p>{unread} sin leer</p></div>
          <div className="fin-notifications-heading-actions">
            <button type="button" title="Actualizar" aria-label="Actualizar notificaciones" onClick={load}><RefreshCw size={18}/></button>
            <button type="button" title="Marcar todas como leídas" aria-label="Marcar todas como leídas" onClick={markAllRead} disabled={!unread || loading}><CheckCheck size={18}/></button>
          </div>
        </div>
        {error && <p className="fin-notifications-error" role="alert">{error}</p>}
        <div className="fin-notifications-list">
          {loading && items.length === 0 ? <p className="fin-notifications-empty">Cargando notificaciones…</p>
            : items.length === 0 ? <p className="fin-notifications-empty">Estás al día. No tienes notificaciones.</p>
            : items.map(item => (
              <Link to={item.link || '/user/activities'} key={item._id}
                className={`fin-notifications-item${!item.readAt ? ' fin-notifications-item-unread' : ''}`}
                onClick={() => { void markRead(item); }}>
                <span className={`fin-notifications-type fin-notifications-type-${item.type}`} aria-hidden="true"><Clock3 size={18}/></span>
                <span className="fin-notifications-item-text">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                  <small>{dateLabel(item.createdAt)}</small>
                </span>
                {!item.readAt && <span className="fin-notifications-dot" aria-label="Sin leer" />}
              </Link>
            ))}
        </div>
      </section>}
    </div>
  );
}
