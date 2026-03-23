import { NavLink } from 'react-router-dom';
import { cn } from '../lib/cn';
import '../styles/employee-module-nav.css';

const EmployeeModuleNav = () => {
  return (
    <nav aria-label="Vistas del módulo de empleados" className="employee-module-nav">
      <NavLink
        to="/employees"
        end
        className={({ isActive }) => cn('employee-module-nav__item', isActive && 'is-active')}
      >
        Directorio
      </NavLink>

      <NavLink
        to="/employees/organization"
        className={({ isActive }) => cn('employee-module-nav__item', isActive && 'is-active')}
      >
        Estructura organizacional
      </NavLink>
    </nav>
  );
};

export default EmployeeModuleNav;
