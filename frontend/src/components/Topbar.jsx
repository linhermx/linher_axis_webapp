import { Search, Bell, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import '../styles/topbar.css';

const Topbar = () => {
    const location = useLocation();

    // Simple logic to set page title based on path
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Panel de Control';
        if (path.startsWith('/employees')) return 'Empleados';
        if (path.startsWith('/calendar')) return 'Calendario';
        if (path.startsWith('/recruitment')) return 'Reclutamiento';
        if (path.startsWith('/reports')) return 'Reportes';
        if (path.startsWith('/settings')) return 'Configuración';
        return 'Panel de Control';
    }

    return (
        <header className="topbar">
            <div className="topbar-left">
                <h1 className="page-title">{getPageTitle()}</h1>
            </div>

            <div className="topbar-right">
                <div className="topbar-search">
                    <Search size={18} className="search-icon" />
                    <input type="text" placeholder="Buscar empleados, cargos..." />
                </div>

                <button className="icon-btn">
                    <Bell size={20} />
                    <span className="dot-badge"></span>
                </button>

                <button className="btn btn-primary add-employee-btn">
                    <Plus size={18} />
                    <span>Añadir Empleado</span>
                </button>
            </div>
        </header>
    );
};

export default Topbar;
