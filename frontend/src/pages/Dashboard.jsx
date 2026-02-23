import {
    Users,
    ArrowRight,
    TrendingDown,
    TrendingUp,
    Briefcase,
    Umbrella,
    ChevronRight,
    Search,
    MoreVertical
} from 'lucide-react';
import '../styles/dashboard.css';

const Dashboard = () => {
    // Datos de ejemplo para fidelidad NexusHR
    const stats = [
        { label: 'Total Empleados', value: '1,248', icon: <Users size={20} />, trend: <TrendingUp size={16} />, trendText: 'vs mes anterior', color: 'blue' },
        { label: 'De Licencia Hoy', value: '12', icon: <Umbrella size={20} />, trend: <TrendingDown size={16} />, trendText: '4% menos que ayer', color: 'orange', trendColor: 'green' },
        { label: 'Vacantes Abiertas', value: '45', icon: <Briefcase size={20} />, subtitle: '8 roles urgentes', color: 'purple' },
    ];

    const requests = [
        { id: 1, name: 'Teresa Jenkins', role: 'Especialista de Ventas', type: 'Vacaciones', period: '01 Ene - 10 Ene', status: 'Pendiente', statusKey: 'pending', avatar: 'T' },
        { id: 2, name: 'Salamon Newman', role: 'Senior Dev', type: 'Licencia Médica', period: 'Hoy', status: 'Aprobado', statusKey: 'approved', avatar: 'S' },
        { id: 3, name: 'Monica Cutcher', role: 'Diseñadora', type: 'Día Libre', period: '29 Dic - 31 Dic', status: 'Rechazado', statusKey: 'declined', avatar: 'M' },
    ];

    return (
        <div className="dashboard-root">
            <section className="dashboard-stats-row">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-card">
                        <div className="stat-card-header">
                            <div className={`stat-card-icon ${stat.color}`}>{stat.icon}</div>
                            <div className="stat-card-value">{stat.value}</div>
                        </div>
                        <div className="stat-card-label">{stat.label}</div>
                        <div className="stat-card-footer">
                            {stat.trend && <span className={`stat-trend ${stat.trendColor || ''}`}>{stat.trend}</span>}
                            {stat.trendText && <span className="stat-trend-text">{stat.trendText}</span>}
                            {stat.subtitle && <span className="stat-subtitle">{stat.subtitle}</span>}
                        </div>
                    </div>
                ))}

                {/* Tarjeta de Acción Rápida: Nómina */}
                <div className="stat-card payroll-widget">
                    <div className="payroll-content">
                        <div className="payroll-info">
                            <span className="payroll-label">Acción Rápida</span>
                            <h3 className="payroll-title">Ejecutar Nómina</h3>
                            <span className="payroll-due">Ciclo vence en 3 días</span>
                        </div>
                        <button className="payroll-btn">
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </section>

            <div className="dashboard-main-grid">
                <section className="dashboard-left-col">
                    <div className="card requests-card">
                        <div className="card-header-row">
                            <h2 className="card-title">Solicitudes</h2>
                            <button className="view-all-link">Ver todo</button>
                        </div>
                        <table className="requests-table">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    <th>Tipo</th>
                                    <th>Periodo</th>
                                    <th>Estado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id}>
                                        <td>
                                            <div className="employee-cell">
                                                <div className="avatar-small">{req.avatar}</div>
                                                <div className="employee-meta">
                                                    <div className="emp-name">{req.name}</div>
                                                    <div className="emp-role">{req.role}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{req.type}</td>
                                        <td>{req.period}</td>
                                        <td>
                                            <span className={`pill pill-${req.statusKey}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="row-options"><ChevronRight size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="card applicants-card">
                        <div className="card-header-row">
                            <h2 className="card-title">Nuevos Postulantes</h2>
                            <div className="pagination-arrows">
                                <button className="arrow-btn">{'<'}</button>
                                <button className="arrow-btn active">{'>'}</button>
                            </div>
                        </div>
                        <div className="applicant-item">
                            <div className="avatar-medium">JD</div>
                            <div className="applicant-meta">
                                <div className="applicant-name">Jensen Duane</div>
                                <div className="applicant-apply">Postuló para <span className="strong">Diseñador Gráfico Senior</span></div>
                            </div>
                            <span className="apply-time">Hace 2h</span>
                            <button className="view-applicant-btn icon-btn"><Search size={16} /></button>
                        </div>
                    </div>
                </section>

                <section className="dashboard-right-col">
                    <div className="card mood-card">
                        <div className="card-header-row">
                            <h2 className="card-title">Clima Laboral</h2>
                            <button className="view-all-link">Detalles</button>
                        </div>
                        <div className="mood-chart-container">
                            <div className="mood-doughnut">
                                <svg viewBox="0 0 36 36" className="circular-chart">
                                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path className="circle" strokeDasharray="30, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ stroke: '#4A90E2' }} />
                                    <path className="circle" strokeDasharray="20, 100" strokeDashoffset="-30" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ stroke: '#FFD43B' }} />
                                    <path className="circle" strokeDasharray="15, 100" strokeDashoffset="-50" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ stroke: '#FF6B6B' }} />
                                </svg>
                                <div className="doughnut-center">
                                    <span className="mood-score">Bueno</span>
                                    <span className="mood-label">Promedio</span>
                                </div>
                            </div>
                        </div>
                        <ul className="mood-legend">
                            <li><span className="dot" style={{ background: '#4A90E2' }}></span> Feliz (53%)</li>
                            <li><span className="dot" style={{ background: '#22C55E' }}></span> Neutral (23%)</li>
                            <li><span className="dot" style={{ background: '#FFD43B' }}></span> Entusiasmado (14%)</li>
                            <li><span className="dot" style={{ background: '#8B5CF6' }}></span> Molesto (6%)</li>
                        </ul>
                    </div>

                    <div className="card events-card">
                        <div className="card-header-row">
                            <h2 className="card-title">Próximos Eventos</h2>
                            <button className="row-options"><MoreVertical size={16} /></button>
                        </div>
                        <div className="event-item">
                            <div className="event-content">
                                <div className="event-title">¡Cumpleaños de Shane Wiggins!</div>
                                <div className="event-tag">Feriado</div>
                            </div>
                            <div className="event-time">Todo el día</div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
