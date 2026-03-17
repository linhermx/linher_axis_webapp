import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import DataTable from '../components/DataTable';
import { Button, Card, PageHeader } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { hasAnyPermission } from '../lib/permissions';
import api from '../services/api';

const EmployeeDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreateEmployee = hasAnyPermission(user, ['create_employee']);

  const columns = [
    { key: 'internal_id', label: 'ID' },
    { key: 'first_name', label: 'Nombre' },
    { key: 'last_name', label: 'Apellidos' },
    { key: 'department_name', label: 'Departamento' },
    { key: 'position_name', label: 'Puesto' },
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
    <section>
      <PageHeader
        title="Directorio de Empleados"
        subtitle="Consulta, filtra y navega por el personal activo."
        actions={canCreateEmployee ? (
          <Button type="button" onClick={() => navigate('/employees/new')}>
            <UserPlus size={18} />
            <span>Nuevo Empleado</span>
          </Button>
        ) : undefined}
      />

      {loading ? (
        <Card>
          <p className="text-sm text-ui-text-secondary">Cargando empleados...</p>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          onRowClick={(emp) => navigate(`/employees/${emp.id}`)}
        />
      )}
    </section>
  );
};

export default EmployeeDirectory;
