import { useState } from 'react';
import { Search, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button, InputField, ThemeToggle } from './ui';

const Topbar = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Panel de Control';
    if (path === '/me/profile') return 'Mi Perfil 360';
    if (/^\/employees\/\d+\/profile-360$/.test(path)) return 'Perfil de Colaborador';
    if (path.startsWith('/employees')) return 'Empleados';
    if (path.startsWith('/calendar')) return 'Calendario';
    if (path.startsWith('/recruitment')) return 'Reclutamiento';
    if (path.startsWith('/reports')) return 'Reportes';
    if (path.startsWith('/admin')) return 'Administración';
    if (path.startsWith('/settings')) return 'Configuración';
    return 'Panel de Control';
  };

  return (
    <header className="flex h-[var(--header-height)] items-center justify-between gap-6 border-b border-ui-light-slate bg-ui-background px-10">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] text-ui-dark-navy">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <form role="search" className="h-[42px] w-full max-w-[360px]" onSubmit={(e) => e.preventDefault()}>
          <InputField
            id="topbar-search"
            name="topbar_search"
            label="Buscar"
            srOnlyLabel
            type="search"
            variant="toolbar"
            placeholder="Buscar empleados, cargos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="!space-y-0 h-full"
            inputClassName="bg-ui-background focus:bg-ui-surface"
            leftIcon={<Search size={17} />}
          />
        </form>

        <Button
          variant="icon"
          aria-label="Ver notificaciones"
          className="relative rounded-md"
        >
          <Bell size={18} />
          <span
            aria-hidden="true"
            className="absolute right-[0.58rem] top-[0.5rem] h-2 w-2 rounded-full border-2 border-ui-surface bg-brand-primary"
          />
        </Button>

        <ThemeToggle />
      </div>
    </header>
  );
};

export default Topbar;
