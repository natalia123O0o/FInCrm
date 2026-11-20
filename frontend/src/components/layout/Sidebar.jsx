import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext.jsx';
import { PATHS } from '../../routes/paths.js';
import {
  LayoutDashboard, Users, Wallet, Sparkles, Menu, X,
  UserRoundPlus, Mail, ShoppingCart, Mic,
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
  const { user } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const enlaces = [
    { nombre:'Inicio', ruta:PATHS.dashboard, icono:LayoutDashboard, roles:['ADMIN'] },
    { nombre:'Clientes', ruta:PATHS.clients, icono:Users, roles:['ADMIN'] },
    { nombre:'Empleados', ruta:PATHS.users, icono:UserRoundPlus, roles:['ADMIN'] },
    { nombre:'Deudas', ruta:PATHS.debts, icono:Wallet, roles:['ADMIN'] },
    { nombre:'Mensajería', ruta:PATHS.messaging, icono:Mail, roles:['ADMIN'] },
    { nombre:'FinPOS', ruta:'/pos', icono:ShoppingCart, roles:['ADMIN'] },
    { nombre:'FinVoice', ruta:'/finvoice', icono:Mic, roles:['ADMIN','USER'] },
    { nombre:'Asistente inteligente', ruta:PATHS.aiChat, icono:Sparkles,
      roles:['ADMIN','USER'], ia:true },
  ];
  const enlacesVisibles = enlaces.filter(item => item.roles.includes(user?.role));
  return (<>
    <header className="fincrm-mobile-header">
      <span className="fincrm-brand">Fin<span>CRM</span></span>
      <button type="button" className="fincrm-menu-button" onClick={()=>setMenuAbierto(v=>!v)}
        aria-label={menuAbierto?'Cerrar menú':'Abrir menú'} aria-expanded={menuAbierto}
        aria-controls="fincrm-sidebar">{menuAbierto?<X size={22}/>:<Menu size={22}/>}</button>
    </header>
    {menuAbierto && <button type="button" className="fincrm-sidebar-backdrop"
      aria-label="Cerrar menú de navegación" onClick={()=>setMenuAbierto(false)}/>}
    <aside id="fincrm-sidebar" className={`fincrm-sidebar ${menuAbierto?'fincrm-sidebar--open':''}`}>
      <div className="fincrm-sidebar-brand"><span className="fincrm-brand">Fin<span>CRM</span></span>
        <small>Gestión empresarial</small></div>
      <nav className="fincrm-sidebar-nav" aria-label="Navegación principal">
        {enlacesVisibles.map(item => {
          const Icon = item.icono;
          return <NavLink key={item.ruta} to={item.ruta} title={item.nombre}
            onClick={()=>setMenuAbierto(false)}
            className={({isActive})=>`fincrm-sidebar-link ${isActive?'fincrm-sidebar-link--active':''}`}>
            {({isActive})=><><Icon size={20} className={item.ia?'fincrm-sidebar-icon-ia':''}
              color={isActive?'#F97316':item.ia?'#06B6D4':'#F8FAFC'}/><span>{item.nombre}</span></>}
          </NavLink>;
        })}
      </nav>
    </aside>
  </>);
}
