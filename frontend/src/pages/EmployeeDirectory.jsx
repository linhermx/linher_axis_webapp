import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Search,
  Users,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CustomSelect,
  InputField,
  StatusBadge,
  StatusView,
} from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/cn';
import { hasAnyPermission } from '../lib/permissions';
import api from '../services/api';

const normalizeText = (value) => String(value || '').trim();
const normalizeKey = (value) => normalizeText(value).toLowerCase();

const toTitleCase = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return '';

  return normalized
    .toLocaleLowerCase('es-MX')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toLocaleUpperCase('es-MX')}${word.slice(1)}`)
    .join(' ');
};

const getEmployeeName = (employee) => (
  `${toTitleCase(employee?.first_name)} ${toTitleCase(employee?.last_name)}`.trim() || 'Sin nombre'
);

const getEmployeeInitials = (employee) => {
  const parts = getEmployeeName(employee).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const toDisplayValue = (value, fallback = 'Sin información') => normalizeText(value) || fallback;
const toHumanValue = (value, fallback = 'Sin información') => {
  const normalized = normalizeText(value);
  return normalized ? toTitleCase(normalized) : fallback;
};

const getStatusMeta = (employee) => {
  const statusFlag = normalizeKey(employee?.status || employee?.employment_status || '');
  const activeFlag = employee?.is_active;

  const isInactive = statusFlag.includes('inactive')
    || statusFlag.includes('inactivo')
    || activeFlag === 0
    || activeFlag === false;

  if (isInactive) {
    return { status: 'inactive', label: 'Inactivo' };
  }

  return { status: 'approved', label: 'Activo' };
};

const buildFilterOptions = (values = [], defaultLabel = 'Todos') => {
  const normalizedValues = Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, 'es', { sensitivity: 'base' }));

  return [
    { value: 'all', label: defaultLabel },
    ...normalizedValues.map((value) => ({ value, label: toTitleCase(value) })),
  ];
};

const EmployeeDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const canViewEmployeeProfile = hasAnyPermission(user, ['view_profile_employee']);

  useEffect(() => {
    let active = true;

    const fetchEmployees = async () => {
      try {
        setError('');
        const { data } = await api.get('/employees');
        if (!active) return;

        const employeeList = Array.isArray(data) ? data : [];
        setEmployees(employeeList);

        if (employeeList.length > 0) {
          setSelectedEmployeeId(employeeList[0].id);
        }
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError?.response?.data?.message || 'No fue posible cargar el directorio de empleados.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchEmployees();

    return () => {
      active = false;
    };
  }, []);

  const departmentOptions = useMemo(
    () => buildFilterOptions(employees.map((employee) => employee.department_name), 'Todos los departamentos'),
    [employees]
  );

  const positionOptions = useMemo(
    () => buildFilterOptions(employees.map((employee) => employee.position_name), 'Todos los puestos'),
    [employees]
  );

  const directorySummary = useMemo(() => {
    const departments = new Set();
    const positions = new Set();

    employees.forEach((employee) => {
      const department = normalizeText(employee.department_name);
      const position = normalizeText(employee.position_name);
      if (department) departments.add(department);
      if (position) positions.add(position);
    });

    return {
      total: employees.length,
      departments: departments.size,
      positions: positions.size,
    };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = normalizeKey(searchTerm);

    return employees.filter((employee) => {
      const matchesDepartment = departmentFilter === 'all'
        || normalizeText(employee.department_name) === departmentFilter;
      const matchesPosition = positionFilter === 'all'
        || normalizeText(employee.position_name) === positionFilter;

      const searchFields = [
        getEmployeeName(employee),
        employee.internal_id,
        employee.department_name,
        employee.position_name,
      ];

      const matchesSearch = !normalizedSearch
        || searchFields.some((field) => normalizeKey(field).includes(normalizedSearch));

      return matchesDepartment && matchesPosition && matchesSearch;
    });
  }, [employees, departmentFilter, positionFilter, searchTerm]);

  useEffect(() => {
    if (!filteredEmployees.length) {
      setSelectedEmployeeId(null);
      return;
    }

    const selectedStillVisible = filteredEmployees.some((employee) => employee.id === selectedEmployeeId);
    if (!selectedStillVisible) {
      setSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [filteredEmployees, selectedEmployeeId]);

  const selectedEmployee = useMemo(
    () => filteredEmployees.find((employee) => employee.id === selectedEmployeeId) || null,
    [filteredEmployees, selectedEmployeeId]
  );

  const relatedEmployees = useMemo(() => {
    if (!selectedEmployee) return [];

    const selectedDepartment = normalizeKey(selectedEmployee.department_name);
    if (!selectedDepartment) return [];

    return employees
      .filter((employee) => (
        employee.id !== selectedEmployee.id
        && normalizeKey(employee.department_name) === selectedDepartment
      ))
      .slice(0, 4);
  }, [employees, selectedEmployee]);

  return (
    <section className="employee-directory">
      {loading ? (
        <Card>
          <p className="employee-directory__loading">Cargando empleados...</p>
        </Card>
      ) : null}

      {!loading && error ? (
        <Alert variant="error" title="No se pudo cargar el directorio">
          {error}
        </Alert>
      ) : null}

      {!loading && !error ? (
        <div className="employee-directory__workspace">
          <Card
            title="Personas"
            className="employee-directory__panel employee-directory__panel--people"
            actions={(
              <Badge variant="neutral">{filteredEmployees.length} visibles</Badge>
            )}
          >
            <div className="employee-directory__summary">
              <article className="employee-directory__summary-item">
                <div className="employee-directory__summary-icon">
                  <Users size={15} />
                </div>
                <div>
                  <p className="employee-directory__summary-label">Colaboradores</p>
                  <p className="employee-directory__summary-value">{directorySummary.total}</p>
                </div>
              </article>

              <article className="employee-directory__summary-item">
                <div className="employee-directory__summary-icon">
                  <Building2 size={15} />
                </div>
                <div>
                  <p className="employee-directory__summary-label">Departamentos</p>
                  <p className="employee-directory__summary-value">{directorySummary.departments}</p>
                </div>
              </article>

              <article className="employee-directory__summary-item">
                <div className="employee-directory__summary-icon">
                  <Briefcase size={15} />
                </div>
                <div>
                  <p className="employee-directory__summary-label">Puestos</p>
                  <p className="employee-directory__summary-value">{directorySummary.positions}</p>
                </div>
              </article>
            </div>

            <div className="employee-directory__toolbar">
              <InputField
                name="employee-search"
                label="Buscar colaborador"
                srOnlyLabel
                type="search"
                placeholder="Buscar por nombre o puesto"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                leftIcon={<Search size={16} />}
              />

              <CustomSelect
                name="department-filter"
                label="Departamento"
                srOnlyLabel
                ariaLabel="Filtrar por departamento"
                value={departmentFilter}
                options={departmentOptions}
                onChange={(event) => setDepartmentFilter(event.target.value)}
              />

              <CustomSelect
                name="position-filter"
                label="Puesto"
                srOnlyLabel
                ariaLabel="Filtrar por puesto"
                value={positionFilter}
                options={positionOptions}
                onChange={(event) => setPositionFilter(event.target.value)}
              />
            </div>

            <div className="employee-directory__list-shell">
              {filteredEmployees.length === 0 ? (
                <StatusView
                  title="Sin resultados"
                  description="No hay colaboradores que coincidan con los filtros actuales."
                />
              ) : (
                <ul className="employee-directory__people-list">
                  {filteredEmployees.map((employee) => {
                    const statusMeta = getStatusMeta(employee);
                    const isSelected = selectedEmployeeId === employee.id;

                    return (
                      <li key={employee.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeId(employee.id)}
                          className={cn(
                            'employee-directory__person-row',
                            'ui-list-hoverable',
                            isSelected && 'is-selected'
                          )}
                        >
                          <span className="employee-directory__person-avatar">{getEmployeeInitials(employee)}</span>

                          <span className="employee-directory__person-main">
                            <span className="employee-directory__person-name">{getEmployeeName(employee)}</span>
                            <span className="employee-directory__person-tags">
                              <span className="employee-directory__tag employee-directory__tag--position">
                                {toHumanValue(employee.position_name, 'Puesto pendiente')}
                              </span>
                              <span className="employee-directory__tag employee-directory__tag--department">
                                {toHumanValue(employee.department_name, 'Sin departamento')}
                              </span>
                            </span>
                          </span>

                          <StatusBadge
                            className="employee-directory__person-status"
                            status={statusMeta.status}
                            label={statusMeta.label}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          <Card
            title="Detalle"
            className="employee-directory__panel employee-directory__panel--detail"
          >
            {selectedEmployee ? (
              <div className="employee-directory__detail-content">
                <article className="employee-directory__detail-hero">
                  <span className="employee-directory__detail-avatar">{getEmployeeInitials(selectedEmployee)}</span>

                  <div className="employee-directory__detail-headline">
                    <h3 className="employee-directory__detail-name">{getEmployeeName(selectedEmployee)}</h3>
                    <div className="employee-directory__detail-tags">
                      <span className="employee-directory__tag employee-directory__tag--position">
                        {toHumanValue(selectedEmployee.position_name, 'Puesto pendiente')}
                      </span>
                      <span className="employee-directory__tag employee-directory__tag--department">
                        {toHumanValue(selectedEmployee.department_name, 'Sin departamento')}
                      </span>
                    </div>
                  </div>

                  <StatusBadge
                    status={getStatusMeta(selectedEmployee).status}
                    label={getStatusMeta(selectedEmployee).label}
                  />
                </article>

                <dl className="employee-directory__detail-grid">
                  <div className="employee-directory__detail-item">
                    <dt>Departamento</dt>
                    <dd>{toHumanValue(selectedEmployee.department_name, 'Sin departamento')}</dd>
                  </div>

                  <div className="employee-directory__detail-item">
                    <dt>Puesto</dt>
                    <dd>{toHumanValue(selectedEmployee.position_name, 'Sin puesto')}</dd>
                  </div>

                  <div className="employee-directory__detail-item">
                    <dt>Género</dt>
                    <dd>{toDisplayValue(selectedEmployee.gender, 'No registrado')}</dd>
                  </div>
                </dl>

                <div className="employee-directory__detail-actions">
                  {canViewEmployeeProfile ? (
                    <Button
                      type="button"
                      onClick={() => navigate(`/employees/${selectedEmployee.id}/profile-360`)}
                    >
                      <span>Abrir Perfil 360</span>
                      <ArrowUpRight size={16} />
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate('/employees/organization')}
                  >
                    <Building2 size={16} />
                    <span>Ver estructura</span>
                  </Button>
                </div>

                <section className="employee-directory__related">
                  <h3 className="employee-directory__related-title">Equipo inmediato</h3>

                  {relatedEmployees.length > 0 ? (
                    <ul className="employee-directory__related-list">
                      {relatedEmployees.map((employee) => (
                        <li key={employee.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedEmployeeId(employee.id)}
                            className="employee-directory__related-item ui-list-hoverable"
                          >
                            <span className="employee-directory__related-avatar">{getEmployeeInitials(employee)}</span>
                            <span className="employee-directory__related-meta">
                              <span className="employee-directory__related-name">{getEmployeeName(employee)}</span>
                              <span className="employee-directory__related-tags">
                                <span className="employee-directory__tag employee-directory__tag--position">
                                  {toHumanValue(employee.position_name, 'Sin puesto')}
                                </span>
                                <span className="employee-directory__tag employee-directory__tag--department">
                                  {toHumanValue(employee.department_name, 'Sin departamento')}
                                </span>
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="employee-directory__related-empty">
                      Este colaborador no tiene compañeros registrados en el mismo departamento.
                    </p>
                  )}
                </section>
              </div>
            ) : (
              <StatusView
                title="Selecciona un colaborador"
                description="El detalle aparecerá aquí con acciones rápidas de seguimiento."
              />
            )}
          </Card>
        </div>
      ) : null}
    </section>
  );
};

export default EmployeeDirectory;
