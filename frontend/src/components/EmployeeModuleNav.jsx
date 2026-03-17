import { NavLink } from 'react-router-dom';
import { cn } from '../lib/cn';

const EmployeeModuleNav = () => {
  return (
    <nav
      aria-label="Vistas del módulo de empleados"
      className="mt-4 inline-flex rounded-lg border border-ui-light-slate bg-ui-surface-subtle p-1"
    >
      <NavLink
        to="/employees"
        end
        className={({ isActive }) => cn(
          'rounded-md px-3 py-2 text-sm font-semibold transition-colors',
          isActive
            ? 'bg-ui-surface text-ui-dark-navy shadow-sm'
            : 'text-ui-text-secondary hover:text-ui-dark-navy'
        )}
      >
        Directorio
      </NavLink>

      <NavLink
        to="/employees/organization"
        className={({ isActive }) => cn(
          'rounded-md px-3 py-2 text-sm font-semibold transition-colors',
          isActive
            ? 'bg-ui-surface text-ui-dark-navy shadow-sm'
            : 'text-ui-text-secondary hover:text-ui-dark-navy'
        )}
      >
        Estructura Organizacional
      </NavLink>
    </nav>
  );
};

export default EmployeeModuleNav;
