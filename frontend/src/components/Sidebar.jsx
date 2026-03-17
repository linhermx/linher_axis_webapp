import { NavLink } from 'react-router-dom';
import logo from '../assets/linher-axis-horizontal-v1.svg';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Target,
  BarChart3,
  Settings,
  MoreVertical,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { hasAnyPermission } from '../lib/permissions';
import '../styles/sidebar.css';

const Sidebar = () => {
  const { user } = useAuth();

  const profile = {
    name: user?.name || 'Usuario AXIS',
    role: user?.role_name || 'Admin de RRHH',
    avatar: (user?.name?.charAt(0) || 'A').toUpperCase(),
  };
  const canViewEmployees = hasAnyPermission(user, ['VIEW_EMPLOYEES']);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="Linher Axis" className="sidebar-logo" />
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Panel de Control</span>
        </NavLink>

        {canViewEmployees ? (
          <NavLink to="/employees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span>Empleados</span>
          </NavLink>
        ) : null}

        <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={20} />
          <span>Calendario</span>
        </NavLink>

        <NavLink to="/recruitment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Target size={20} />
          <span>Reclutamiento</span>
          <span className="nav-badge">4</span>
        </NavLink>

        <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BarChart3 size={20} />
          <span>Reportes</span>
        </NavLink>

        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Configuración</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-widget">
          <div className="user-avatar-small">
            {profile.avatar}
            <div className="status-indicator online" />
          </div>

          <div className="user-meta">
            <span className="user-fullname">{profile.name}</span>
            <span className="user-jobrole">{profile.role}</span>
          </div>

          <button type="button" className="user-options" aria-label="Opciones de perfil">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
