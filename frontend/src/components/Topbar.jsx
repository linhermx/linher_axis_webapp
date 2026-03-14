import { useState } from 'react';
import { Search, Bell, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button, InputField } from './ui';

const Topbar = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Panel de Control';
    if (path.startsWith('/employees')) return 'Empleados';
    if (path.startsWith('/calendar')) return 'Calendario';
    if (path.startsWith('/recruitment')) return 'Reclutamiento';
    if (path.startsWith('/reports')) return 'Reportes';
    if (path.startsWith('/settings')) return 'Configuración';
    return 'Panel de Control';
  };

  return (
    <header className="flex h-[var(--header-height)] items-center justify-between px-10">
      <div>
        <h1 className="text-2xl font-extrabold text-ui-dark-navy">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-6">
        <form
          role="search"
          className="w-full max-w-[320px]"
          onSubmit={(e) => e.preventDefault()}
        >
          <InputField
            id="topbar-search"
            name="topbar_search"
            label="Buscar"
            srOnlyLabel
            type="search"
            placeholder="Buscar empleados, cargos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="space-y-0"
            inputClassName="shadow-sm"
            leftIcon={<Search size={18} />}
          />
        </form>

        <Button
          variant="icon"
          aria-label="Ver notificaciones"
          className="relative shadow-sm"
        >
          <Bell size={20} />
          <span
            aria-hidden="true"
            className="absolute right-[0.72rem] top-[0.62rem] h-2 w-2 rounded-full border-2 border-ui-surface bg-brand-primary"
          />
        </Button>

        <Button className="shadow-sm">
          <Plus size={18} />
          <span>Añadir Empleado</span>
        </Button>
      </div>
    </header>
  );
};

export default Topbar;
