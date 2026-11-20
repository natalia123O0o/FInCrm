import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Target, Sparkles, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { PATHS } from '../../../routes/paths.js';
import NotificationBell from '../../notifications/components/NotificationBell.jsx';
import './UserWorkspaceLayout.css';

// Estructura exclusiva del USER; no cambia el AdminLayout existente.
export default function UserWorkspaceLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate(PATHS.login, { replace: true });
  }

  const links = [
    { to: PATHS.userDashboard, label: 'Mi panel', icon: LayoutDashboard, end: true },
    { to: PATHS.userOpportunities, label: 'Mis oportunidades', icon: Target },
    { to: PATHS.userActivities, label: 'Mis actividades', icon: CalendarDays },
    { to: PATHS.userAssistant, label: 'Asistente IA', icon: Sparkles, ai: true },
  ];

  return (
    <div className="fin-user-layout">
      <header className="fin-user-mobile-header">
        <Link to={PATHS.userDashboard} className="fin-user-logo">Fin<span>CRM</span></Link>
        <button type="button" className="fin-user-menu-toggle"
          onClick={() => setMenuOpen(value => !value)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-controls="fin-user-sidebar" aria-expanded={menuOpen}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {menuOpen && <button type="button" className="fin-user-backdrop"
        aria-label="Cerrar navegación" onClick={() => setMenuOpen(false)} />}

      <aside id="fin-user-sidebar" className={`fin-user-sidebar ${menuOpen ? 'fin-user-sidebar--open' : ''}`}>
        <div className="fin-user-sidebar-brand">
          <Link to={PATHS.userDashboard} className="fin-user-logo" onClick={() => setMenuOpen(false)}>
            Fin<span>CRM</span>
          </Link>
          <small>Espacio del colaborador</small>
        </div>
        <nav aria-label="Menú del colaborador" className="fin-user-sidebar-nav">
          {links.map(({ to, label, icon: Icon, end, ai }) => (
            <NavLink key={to} to={to} end={end} title={label}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `fin-user-nav-link${isActive ? ' fin-user-nav-link--active' : ''}`}>
              {({ isActive }) => <>
                <Icon aria-hidden="true" size={20}
                  color={isActive ? '#F97316' : ai ? '#06B6D4' : '#F8FAFC'} />
                <span>{label}</span>
              </>}
            </NavLink>
          ))}
        </nav>
        <div className="fin-user-sidebar-footer">
          <div className="fin-user-account-name" title={user?.email || ''}>{user?.name || 'Colaborador'}</div>
          <span className="fin-user-account-role">USER</span>
          <button type="button" className="fin-user-logout" onClick={signOut}>
            <LogOut size={18} aria-hidden="true" /><span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
      <div className="fin-user-content">
        <div className="fin-user-topbar" aria-label="Barra superior del colaborador">
          <span className="fin-user-topbar-caption">Espacio del colaborador</span>
          <NotificationBell />
        </div>
        {children}
      </div>
    </div>
  );
}
