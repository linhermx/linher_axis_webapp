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
  IdCard,
  FolderOpen,
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
  const canViewEmployees = hasAnyPermission(user, ['view_employees']);
  const canViewAdmin = hasAnyPermission(user, ['view_audit_logs']);
  const canViewProfile = hasAnyPermission(user, ['view_profile_self', 'view_profile_employee']);
  const canViewDocuments = hasAnyPermission(user, ['view_documents', 'manage_documents', 'validate_documents']);
  const canViewCalendar = hasAnyPermission(user, ['view_calendar']);
  const canManageRecruitment = hasAnyPermission(user, ['manage_recruitment']);
  const canViewReports = hasAnyPermission(user, ['view_dashboard']);

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

        {canViewProfile ? (
          <NavLink to="/me/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IdCard size={20} />
            <span>Mi Perfil 360</span>
          </NavLink>
        ) : null}

        {canViewDocuments ? (
          <NavLink to="/documents" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FolderOpen size={20} />
            <span>Expediente</span>
          </NavLink>
        ) : null}

        {canViewCalendar ? (
          <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Calendar size={20} />
            <span>Calendario</span>
          </NavLink>
        ) : null}

        {canManageRecruitment ? (
          <NavLink to="/recruitment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Target size={20} />
            <span>Reclutamiento</span>
          </NavLink>
        ) : null}

        {canViewReports ? (
          <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={20} />
            <span>Reportes</span>
          </NavLink>
        ) : null}

        {canViewAdmin ? (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Administración</span>
          </NavLink>
        ) : null}
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
