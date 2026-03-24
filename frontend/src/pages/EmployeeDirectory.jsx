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
  Pagination,
  StatusBadge,
  StatusView,
} from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/cn';
import { hasAnyPermission } from '../lib/permissions';
import api from '../services/api';

const normalizeText = (value) => String(value || '').trim();
const normalizeKey = (value) => normalizeText(value).toLowerCase();
const normalizeToken = (value) => (
  normalizeText(value)
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
);

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

const getDepartmentName = (employee) => normalizeText(employee?.department_name) || 'Sin departamento';
const getPositionName = (employee) => normalizeText(employee?.position_name) || 'Sin puesto';
const getGenderLabel = (employee) => {
  const normalized = normalizeToken(employee?.gender_label || employee?.gender || employee?.sex_code || '').toUpperCase();

  if (['F', 'FEMENINO', 'FEMALE'].includes(normalized)) {
    return 'Femenino';
  }

  if (['M', 'MASCULINO', 'MALE'].includes(normalized)) {
    return 'Masculino';
  }

  return 'No registrado';
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

const isEmployeeActive = (employee) => getStatusMeta(employee).status === 'approved';

const DEPARTMENT_TONES = ['indigo', 'teal', 'emerald', 'amber', 'violet', 'rose', 'sky'];
const DEPARTMENT_TONE_BY_KEY = {
  administracion: 'indigo',
  ventas: 'emerald',
  produccion: 'amber',
  operaciones: 'teal',
  'post venta': 'sky',
  sistemas: 'violet',
  'recursos humanos': 'rose',
};

const getDepartmentTone = (departmentName) => {
  const key = normalizeToken(departmentName);
  if (!key || key === 'sin departamento' || key === 'todos los departamentos') return 'slate';
  if (DEPARTMENT_TONE_BY_KEY[key]) return DEPARTMENT_TONE_BY_KEY[key];

  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(index);
    hash |= 0;
  }

  return DEPARTMENT_TONES[Math.abs(hash) % DEPARTMENT_TONES.length];
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

const DEFAULT_CARD_PAGE_SIZE = 12;

const EmployeeDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_CARD_PAGE_SIZE);
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

  const positionOptions = useMemo(
    () => buildFilterOptions(employees.map((employee) => getPositionName(employee)), 'Todos los puestos'),
    [employees]
  );

  const directorySummary = useMemo(() => {
    const departments = new Set();
    const positions = new Set();

    employees.forEach((employee) => {
      departments.add(getDepartmentName(employee));
      positions.add(getPositionName(employee));
    });

    return {
      total: employees.length,
      departments: departments.size,
      positions: positions.size,
    };
  }, [employees]);

  const departmentBreakdown = useMemo(() => {
    const groupedDepartments = new Map();
    let activeEmployees = 0;

    employees.forEach((employee) => {
      const departmentName = getDepartmentName(employee);
      const departmentKey = normalizeKey(departmentName);
      const active = isEmployeeActive(employee);

      if (active) {
        activeEmployees += 1;
      }

      if (!groupedDepartments.has(departmentKey)) {
        groupedDepartments.set(departmentKey, {
          value: departmentKey,
          label: toHumanValue(departmentName, 'Sin departamento'),
          total: 0,
          active: 0,
        });
      }

      const current = groupedDepartments.get(departmentKey);
      current.total += 1;
      if (active) {
        current.active += 1;
      }
    });

    const sortedDepartments = Array.from(groupedDepartments.values()).sort((left, right) => (
      left.label.localeCompare(right.label, 'es-MX', { sensitivity: 'base' })
    ));

    return [
      {
        value: 'all',
        label: 'Todos los departamentos',
        total: employees.length,
        active: activeEmployees,
      },
      ...sortedDepartments,
    ];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = normalizeKey(searchTerm);

    return employees.filter((employee) => {
      const matchesDepartment = departmentFilter === 'all'
        || normalizeKey(getDepartmentName(employee)) === departmentFilter;
      const matchesPosition = positionFilter === 'all'
        || getPositionName(employee) === positionFilter;

      const searchFields = [
        getEmployeeName(employee),
        getDepartmentName(employee),
        getPositionName(employee),
      ];

      const matchesSearch = !normalizedSearch
        || searchFields.some((field) => normalizeKey(field).includes(normalizedSearch));

      return matchesDepartment && matchesPosition && matchesSearch;
    });
  }, [employees, departmentFilter, positionFilter, searchTerm]);

  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, departmentFilter, positionFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredEmployees.length, page, pageSize]);

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

    const selectedDepartment = normalizeKey(getDepartmentName(selectedEmployee));
    if (!selectedDepartment) return [];

    return employees
      .filter((employee) => (
        employee.id !== selectedEmployee.id
        && normalizeKey(getDepartmentName(employee)) === selectedDepartment
      ))
      .slice(0, 4);
  }, [employees, selectedEmployee]);

  const shouldShowCardPagination = filteredEmployees.length > pageSize;

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
            title="Departamentos"
            className="employee-directory__panel employee-directory__panel--departments"
            bodyClassName="employee-directory__panel-body employee-directory__panel-body--departments"
            actions={(
              <Badge variant="neutral">{Math.max(departmentBreakdown.length - 1, 0)} áreas</Badge>
            )}
          >
            <div className="employee-directory__department-summary">
              <article className="employee-directory__department-metric">
                <p className="employee-directory__department-metric-label">Colaboradores</p>
                <p className="employee-directory__department-metric-value">{directorySummary.total}</p>
              </article>

              <article className="employee-directory__department-metric">
                <p className="employee-directory__department-metric-label">Activos</p>
                <p className="employee-directory__department-metric-value">
                  {departmentBreakdown[0]?.active ?? 0}
                </p>
              </article>
            </div>

            <div className="employee-directory__department-list-shell">
              <ul className="employee-directory__department-list">
                {departmentBreakdown.map((department) => {
                  const departmentTone = getDepartmentTone(department.label);

                  return (
                    <li key={department.value}>
                      <button
                        type="button"
                        className={cn(
                          'employee-directory__department-item',
                          'ui-list-hoverable',
                          departmentFilter === department.value && 'is-selected'
                        )}
                        onClick={() => setDepartmentFilter(department.value)}
                      >
                        <span className="employee-directory__department-item-main">
                          <span className="employee-directory__department-item-head">
                            <span
                              className={cn(
                                'employee-directory__department-item-dot',
                                `employee-directory__department-tone--${departmentTone}`
                              )}
                              aria-hidden="true"
                            />
                            <span className="employee-directory__department-item-name">{department.label}</span>
                          </span>
                          <span className="employee-directory__department-item-meta">
                            {department.active} activos
                          </span>
                        </span>

                        <span className="employee-directory__department-item-count">{department.total}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>

          <Card
            title="Colaboradores"
            className="employee-directory__panel employee-directory__panel--people"
            bodyClassName="employee-directory__panel-body employee-directory__panel-body--people"
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
                name="position-filter"
                label="Puesto"
                srOnlyLabel
                ariaLabel="Filtrar por puesto"
                value={positionFilter}
                options={positionOptions}
                onChange={(event) => setPositionFilter(event.target.value)}
              />
            </div>

            <div className="employee-directory__cards-shell">
              {filteredEmployees.length === 0 ? (
                <StatusView
                  title="Sin resultados"
                  description="No hay colaboradores que coincidan con los filtros actuales."
                />
              ) : (
                <>
                  <div className="employee-directory__cards-scroll">
                    <ul className="employee-directory__cards-grid">
                      {paginatedEmployees.map((employee) => {
                        const statusMeta = getStatusMeta(employee);
                        const isSelected = selectedEmployeeId === employee.id;
                        const employeeName = getEmployeeName(employee);
                        const employeePosition = toHumanValue(getPositionName(employee), 'Puesto pendiente');
                        const employeeDepartment = toHumanValue(getDepartmentName(employee), 'Sin departamento');

                        return (
                          <li key={employee.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedEmployeeId(employee.id)}
                              className={cn(
                                'employee-directory__person-card',
                                'ui-list-hoverable',
                                isSelected && 'is-selected'
                              )}
                            >
                              <div className="employee-directory__person-card-head">
                                <span className="employee-directory__person-avatar">{getEmployeeInitials(employee)}</span>
                                <StatusBadge
                                  className="employee-directory__person-status"
                                  status={statusMeta.status}
                                  label={statusMeta.label}
                                />
                              </div>

                              <p className="employee-directory__person-name" title={employeeName}>{employeeName}</p>
                              <p className="employee-directory__person-role" title={employeePosition}>
                                {employeePosition}
                              </p>
                              <span
                                className={cn(
                                  'employee-directory__person-chip',
                                  `employee-directory__department-tone--${getDepartmentTone(getDepartmentName(employee))}`
                                )}
                                title={employeeDepartment}
                              >
                                {employeeDepartment}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {shouldShowCardPagination ? (
                    <Pagination
                      className="employee-directory__cards-pagination"
                      page={page}
                      pageSize={pageSize}
                      totalItems={filteredEmployees.length}
                      pageSizeOptions={[8, 12, 16, 24]}
                      onPageChange={setPage}
                      onPageSizeChange={(nextSize) => {
                        setPageSize(nextSize);
                        setPage(1);
                      }}
                    />
                  ) : null}
                </>
              )}
            </div>
          </Card>

          <Card
            title="Perfil rápido"
            className="employee-directory__panel employee-directory__panel--detail"
            bodyClassName="employee-directory__panel-body employee-directory__panel-body--detail"
          >
            {selectedEmployee ? (
              <div className="employee-directory__detail-content">
                <article className="employee-directory__detail-hero">
                  <span className="employee-directory__detail-avatar">{getEmployeeInitials(selectedEmployee)}</span>

                  <div className="employee-directory__detail-headline">
                    <h3 className="employee-directory__detail-name">{getEmployeeName(selectedEmployee)}</h3>
                    <p className="employee-directory__detail-role">
                      {toHumanValue(getPositionName(selectedEmployee), 'Sin puesto')}
                    </p>
                    <span
                      className={cn(
                        'employee-directory__detail-chip',
                        `employee-directory__department-tone--${getDepartmentTone(getDepartmentName(selectedEmployee))}`
                      )}
                    >
                      {toHumanValue(getDepartmentName(selectedEmployee), 'Sin departamento')}
                    </span>
                  </div>

                  <StatusBadge
                    status={getStatusMeta(selectedEmployee).status}
                    label={getStatusMeta(selectedEmployee).label}
                  />
                </article>

                <dl className="employee-directory__detail-grid">
                  <div className="employee-directory__detail-item">
                    <dt>Departamento</dt>
                    <dd>{toHumanValue(getDepartmentName(selectedEmployee), 'Sin departamento')}</dd>
                  </div>

                  <div className="employee-directory__detail-item">
                    <dt>Puesto</dt>
                    <dd>{toHumanValue(getPositionName(selectedEmployee), 'Sin puesto')}</dd>
                  </div>

                  <div className="employee-directory__detail-item">
                    <dt>Género</dt>
                    <dd>{getGenderLabel(selectedEmployee)}</dd>
                  </div>

                  <div className="employee-directory__detail-item">
                    <dt>Estatus laboral</dt>
                    <dd>{toDisplayValue(selectedEmployee.employment_status, 'Activo')}</dd>
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
                  <h3 className="employee-directory__related-title">Equipo del área</h3>

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
                              <span className="employee-directory__related-role">
                                {toHumanValue(getPositionName(employee), 'Sin puesto')}
                              </span>
                              <span
                                className={cn(
                                  'employee-directory__related-chip',
                                  `employee-directory__department-tone--${getDepartmentTone(getDepartmentName(employee))}`
                                )}
                              >
                                {toHumanValue(getDepartmentName(employee), 'Sin departamento')}
                              </span>
                            </span>
                            <StatusBadge
                              status={getStatusMeta(employee).status}
                              label={getStatusMeta(employee).label}
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="employee-directory__related-empty">
                      Este colaborador no tiene compañeros activos dentro de su departamento.
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
