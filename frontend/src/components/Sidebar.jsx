import { Link, NavLink } from 'react-router-dom';
import logoFullLight from '../assets/branding/axis-logo-full-light.svg';
import logoFullDark from '../assets/branding/axis-logo-full-dark.svg';
import logoMarkLight from '../assets/branding/axis-logo-mark-light.svg';
import logoMarkDark from '../assets/branding/axis-logo-mark-dark.svg';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Target,
  BarChart3,
  Settings,
  MoreVertical,
  LogOut,
  IdCard,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Avatar, CustomMenu } from './ui';
import { useAuth } from '../hooks/useAuth';
import { getInitials, toHumanName } from '../lib/identity';
import { resolveAssetUrl } from '../lib/media';
import { hasAnyPermission } from '../lib/permissions';

const Sidebar = ({ collapsed = false, onToggleCollapse }) => {
  const { user, logout } = useAuth();

  const profile = {
    name: toHumanName(user?.name || 'Usuario AXIS', 'Usuario AXIS'),
    role: user?.role_name || 'Admin de RRHH',
    avatar: getInitials(user?.name, { fallback: 'AX' }),
    photo: resolveAssetUrl(user?.photo_path),
  };

  const canViewEmployees = hasAnyPermission(user, ['view_employees']);
  const canViewAdmin = hasAnyPermission(user, ['view_audit_logs']);
  const canViewProfile = hasAnyPermission(user, ['view_profile_self', 'view_profile_employee']);
  const canViewDocuments = hasAnyPermission(user, ['view_documents', 'manage_documents', 'validate_documents']);
  const canViewCalendar = hasAnyPermission(user, ['view_calendar']);
  const canManageRecruitment = hasAnyPermission(user, ['manage_recruitment']);
  const canViewReports = hasAnyPermission(user, ['view_dashboard']);

  const preferredModuleRoute = canViewReports
    ? '/'
    : canViewEmployees
      ? '/employees'
      : canViewProfile
        ? '/me/profile'
        : canViewDocuments
          ? '/documents'
          : canViewCalendar
            ? '/calendar'
            : canManageRecruitment
              ? '/recruitment'
              : canViewAdmin
                ? '/admin'
                : '/';

  const navItemClass = ({ isActive }) => `nav-item ${isActive ? 'active' : ''}`;

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-header">
        <Link to={preferredModuleRoute} className="sidebar-brand-link" aria-label="Ir al módulo principal">
          <img src={logoFullLight} alt="AXIS by LINHER" className="sidebar-logo sidebar-logo--full sidebar-logo--light" />
          <img src={logoFullDark} alt="AXIS by LINHER" className="sidebar-logo sidebar-logo--full sidebar-logo--dark" />
          <img src={logoMarkLight} alt="AXIS" className="sidebar-logo sidebar-logo--mark sidebar-logo--light" />
          <img src={logoMarkDark} alt="AXIS" className="sidebar-logo sidebar-logo--mark sidebar-logo--dark" />
        </Link>
      </div>

      <button
        type="button"
        className="sidebar-collapse"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>

      <nav className="sidebar-nav">
        <NavLink to="/" className={navItemClass}>
          <LayoutDashboard size={20} />
          <span>Panel de Control</span>
        </NavLink>

        {canViewEmployees ? (
          <NavLink to="/employees" className={navItemClass}>
            <Users size={20} />
            <span>Empleados</span>
          </NavLink>
        ) : null}

        {canViewProfile ? (
          <NavLink to="/me/profile" className={navItemClass}>
            <IdCard size={20} />
            <span>Mi Perfil 360</span>
          </NavLink>
        ) : null}

        {canViewDocuments ? (
          <NavLink to="/documents" className={navItemClass}>
            <FolderOpen size={20} />
            <span>Expediente</span>
          </NavLink>
        ) : null}

        {canViewCalendar ? (
          <NavLink to="/calendar" className={navItemClass}>
            <Calendar size={20} />
            <span>Calendario</span>
          </NavLink>
        ) : null}

        {canManageRecruitment ? (
          <NavLink to="/recruitment" className={navItemClass}>
            <Target size={20} />
            <span>Reclutamiento</span>
          </NavLink>
        ) : null}

        {canViewReports ? (
          <NavLink to="/reports" className={navItemClass}>
            <BarChart3 size={20} />
            <span>Reportes</span>
          </NavLink>
        ) : null}

        {canViewAdmin ? (
          <NavLink to="/admin" className={navItemClass}>
            <Settings size={20} />
            <span>Administración</span>
          </NavLink>
        ) : null}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-panel">
          <div className="user-avatar-small">
            <Avatar
              initials={profile.avatar}
              src={profile.photo}
              name={profile.name}
              size="md"
              className="sidebar-user-avatar"
              aria-hidden="true"
            />
            <div className="status-indicator online" />
          </div>

          <div className="user-meta">
            <span className="user-fullname">{profile.name}</span>
            <span className="user-jobrole">{profile.role}</span>
          </div>

          <CustomMenu
            className="user-options-menu"
            align="right"
            label="Opciones de cuenta"
            ariaLabel="Opciones de cuenta"
            iconOnly
            showChevron={false}
            triggerVariant="ghost"
            triggerClassName="user-options-menu__trigger"
            triggerIcon={<MoreVertical size={16} />}
            items={[
              {
                id: 'logout',
                label: 'Cerrar sesión',
                icon: <LogOut size={14} />,
                onClick: logout,
              },
            ]}
          />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
