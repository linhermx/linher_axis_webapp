import { useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button, InputField, ThemeToggle } from './ui';
import EmployeeModuleNav from './EmployeeModuleNav';

const Topbar = ({ hasTabs = false }) => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Panel de control';
    if (path === '/me/profile') return 'Mi perfil 360';
    if (/^\/employees\/\d+\/profile-360$/.test(path)) return 'Perfil de colaborador';
    if (path.startsWith('/employees')) return 'Empleados';
    if (path.startsWith('/calendar')) return 'Calendario';
    if (path.startsWith('/recruitment')) return 'Reclutamiento';
    if (path.startsWith('/reports')) return 'Reportes';
    if (path.startsWith('/documents')) return 'Expediente';
    if (path.startsWith('/admin')) return 'Administración';
    if (path.startsWith('/settings')) return 'Configuración';
    return 'Panel de control';
  };

  return (
    <header className={`topbar ${hasTabs ? 'has-tabs' : ''}`}>
      <div className="topbar__content">
        <div className="topbar__main-row">
          <div className="topbar__meta">
            <h1 className="topbar__title">{getPageTitle()}</h1>
          </div>

          <div className="topbar__actions">
            <form role="search" className="topbar__search" onSubmit={(event) => event.preventDefault()}>
              <InputField
                id="topbar-search"
                name="topbar_search"
                label="Buscar"
                srOnlyLabel
                type="search"
                variant="toolbar"
                placeholder="Buscar empleados, cargos..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                leftIcon={<Search size={17} />}
              />
            </form>

            <Button variant="icon" aria-label="Ver notificaciones" className="topbar__notif">
              <Bell size={18} />
              <span aria-hidden="true" className="topbar__notif-dot" />
            </Button>

            <ThemeToggle />
          </div>
        </div>

        {hasTabs ? (
          <div className="topbar__tabs-row">
            <EmployeeModuleNav />
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default Topbar;
