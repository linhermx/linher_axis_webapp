import { useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button, InputField, ThemeToggle } from './ui';

const Topbar = () => {
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
    if (path.startsWith('/admin')) return 'Administracion';
    if (path.startsWith('/settings')) return 'Configuracion';
    return 'Panel de control';
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ui-light-slate bg-ui-background/95 backdrop-blur-sm">
      <div className="flex h-[var(--header-height)] items-center justify-between gap-6 px-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ui-text-secondary">AXIS HRIS</p>
          <h1 className="mt-1 truncate text-[1.6rem] font-extrabold leading-tight tracking-[-0.02em] text-ui-dark-navy">
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-ui-light-slate bg-ui-surface p-1.5 shadow-sm">
          <form role="search" className="h-[42px] w-full min-w-[280px] max-w-[360px]" onSubmit={(event) => event.preventDefault()}>
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
              containerClassName="!space-y-0 h-full"
              inputClassName="bg-ui-surface"
              leftIcon={<Search size={17} />}
            />
          </form>

          <Button variant="icon" aria-label="Ver notificaciones" className="relative rounded-lg">
            <Bell size={18} />
            <span
              aria-hidden="true"
              className="absolute right-[0.58rem] top-[0.5rem] h-2 w-2 rounded-full border-2 border-ui-surface bg-brand-primary"
            />
          </Button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Topbar;