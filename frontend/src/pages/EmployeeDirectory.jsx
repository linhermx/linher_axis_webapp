import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import DataTable from '../components/DataTable';
import { UserPlus } from 'lucide-react';
import '../styles/pages.css';

const EmployeeDirectory = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const columns = [
        { key: 'internal_id', label: 'ID' },
        { key: 'first_name', label: 'Nombre' },
        { key: 'last_name', label: 'Apellidos' },
        { key: 'department_name', label: 'Departamento' },
        { key: 'position_name', label: 'Puesto' }
    ];

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const { data } = await api.get('/employees');
                setEmployees(data);
            } catch (error) {
                console.error('Error fetching employees', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, []);

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Directorio de Empleados</h1>
                <button className="primary-btn" onClick={() => navigate('/employees/new')}>
                    <UserPlus size={18} /> Nuevo Empleado
                </button>
            </div>

            {loading ? (
                <p>Cargando empleados...</p>
            ) : (
                <DataTable
                    columns={columns}
                    data={employees}
                    onRowClick={(emp) => navigate(`/employees/${emp.id}`)}
                />
            )}
        </div>
    );
};

export default EmployeeDirectory;
