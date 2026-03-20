import { NavLink } from 'react-router-dom';
import { cn } from '../lib/cn';

const EmployeeModuleNav = () => {
  return (
    <nav
      aria-label="Vistas del modulo de empleados"
      className="mt-4 inline-flex rounded-xl border border-ui-light-slate bg-ui-surface-subtle p-1"
    >
      <NavLink
        to="/employees"
        end
        className={({ isActive }) => cn(
          'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
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
          'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
          isActive
            ? 'bg-ui-surface text-ui-dark-navy shadow-sm'
            : 'text-ui-text-secondary hover:text-ui-dark-navy'
        )}
      >
        Estructura organizacional
      </NavLink>
    </nav>
  );
};

export default EmployeeModuleNav;