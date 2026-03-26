import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, Shield, UserPlus2, Users } from 'lucide-react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CustomSelect,
  InputField,
  Pagination,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from '../ui';
import {
  ACCOUNT_STATUS_OPTIONS,
  formatLastSession,
  getAccountStatusMeta,
  getRoleBadgeVariant,
  getRoleFilterOptions,
  toRoleLabel,
} from '../../lib/axisAccounts';
import { getInitials, normalizeText, toHumanName } from '../../lib/identity';
import api from '../../services/api';
import AccountDrawer from './AccountDrawer';

const DEFAULT_PAGE_SIZE = 8;

const AccountsManager = () => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [roleCatalog, setRoleCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const tableHostRef = useRef(null);

  const roleOptions = useMemo(
    () => getRoleFilterOptions(roleCatalog),
    [roleCatalog]
  );

  const loadAccounts = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const { data } = await api.get('/admin/axis-accounts');
      setRecords(Array.isArray(data?.data) ? data.data : []);
      setSummary(data?.summary || null);
      setRoleCatalog(Array.isArray(data?.role_catalog) ? data.role_catalog : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No fue posible cargar las cuentas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm).toLocaleLowerCase('es-MX');
    const normalizedRole = normalizeText(roleFilter).toUpperCase();

    return records.filter((record) => {
      const hasAccount = Boolean(record?.account);
      const accountStatus = normalizeText(record?.account?.status).toLowerCase();

      if (statusFilter === 'with_account' && !hasAccount) return false;
      if (statusFilter === 'without_account' && hasAccount) return false;
      if (statusFilter === 'active' && accountStatus !== 'active') return false;
      if (statusFilter === 'inactive' && accountStatus !== 'inactive') return false;

      if (normalizedRole && normalizedRole !== 'ALL') {
        const roleList = Array.isArray(record?.account?.roles) ? record.account.roles : [];
        if (!roleList.includes(normalizedRole)) {
          return false;
        }
      }

      if (!normalizedSearch) return true;

      const searchable = [
        record?.full_name,
        record?.internal_id,
        record?.department_name,
        record?.position_name,
        record?.account?.email,
        ...(record?.account?.roles || []),
      ]
        .map((value) => normalizeText(value).toLocaleLowerCase('es-MX'))
        .join(' ');

      return searchable.includes(normalizedSearch);
    });
  }, [records, roleFilter, searchTerm, statusFilter]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, roleFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredRecords.length, page, pageSize]);

  useEffect(() => {
    const scrollContainer = tableHostRef.current?.querySelector('.ui-table-scroll');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [page, pageSize, searchTerm, statusFilter, roleFilter]);

  const shouldShowPagination = filteredRecords.length > pageSize;

  const handleOpenDrawer = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    setDrawerOpen(true);
  };

  return (
    <section className="axis-accounts">
      <Card
        title="Cuentas"
        headerClassName="axis-accounts__header"
        bodyClassName="axis-accounts__body"
        actions={(
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="axis-utility-button"
            onClick={() => loadAccounts({ silent: true })}
            disabled={loading || refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'axis-accounts__spin' : ''} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
        )}
      >
        <div className="axis-accounts__summary">
          <article className="axis-accounts__summary-item">
            <div className="axis-accounts__summary-icon">
              <Users size={15} />
            </div>
            <div>
              <p className="axis-accounts__summary-label">Colaboradores</p>
              <p className="axis-accounts__summary-value">{summary?.total_collaborators ?? records.length}</p>
            </div>
          </article>

          <article className="axis-accounts__summary-item">
            <div className="axis-accounts__summary-icon">
              <UserPlus2 size={15} />
            </div>
            <div>
              <p className="axis-accounts__summary-label">Con cuenta</p>
              <p className="axis-accounts__summary-value">{summary?.with_account ?? 0}</p>
            </div>
          </article>

          <article className="axis-accounts__summary-item">
            <div className="axis-accounts__summary-icon">
              <Shield size={15} />
            </div>
            <div>
              <p className="axis-accounts__summary-label">Sin cuenta</p>
              <p className="axis-accounts__summary-value">{summary?.without_account ?? 0}</p>
            </div>
          </article>
        </div>

        <div className="axis-accounts__toolbar">
          <InputField
            name="axis-account-search"
            label="Buscar colaborador"
            srOnlyLabel
            type="search"
            placeholder="Buscar por nombre, correo, puesto o rol"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            leftIcon={<Search size={16} />}
          />

          <CustomSelect
            name="axis-account-status-filter"
            label="Filtrar por estatus"
            srOnlyLabel
            value={statusFilter}
            options={ACCOUNT_STATUS_OPTIONS}
            onChange={(event) => setStatusFilter(event.target.value)}
          />

          <CustomSelect
            name="axis-account-role-filter"
            label="Filtrar por rol"
            srOnlyLabel
            value={roleFilter}
            options={roleOptions}
            onChange={(event) => setRoleFilter(event.target.value)}
          />
        </div>

        {loading ? (
          <p className="axis-accounts__loading">Cargando cuentas...</p>
        ) : null}

        {!loading && error ? (
          <Alert variant="error" title="No se pudo cargar cuentas">
            {error}
          </Alert>
        ) : null}

        {!loading && !error ? (
          <div className="axis-accounts__table-wrap">
            <TableShell className="axis-accounts__table axis-table-shell" ref={tableHostRef}>
              <Table className="axis-table axis-accounts__table-grid">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell scope="col" className="axis-accounts__col--employee">Colaborador</TableHeaderCell>
                    <TableHeaderCell scope="col" className="axis-accounts__col--account">Cuenta</TableHeaderCell>
                    <TableHeaderCell scope="col" className="axis-accounts__col--roles">Roles</TableHeaderCell>
                    <TableHeaderCell scope="col" className="axis-accounts__col--status">Estatus</TableHeaderCell>
                    <TableHeaderCell scope="col" className="axis-accounts__col--session">Última sesión</TableHeaderCell>
                    <TableHeaderCell scope="col" className="axis-accounts__col--action">Acción</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableEmptyState colSpan={6}>
                      No hay colaboradores que coincidan con los filtros actuales.
                    </TableEmptyState>
                  ) : (
                    paginatedRecords.map((record) => {
                      const statusMeta = getAccountStatusMeta(
                        record?.account?.status,
                        Boolean(record?.account?.must_change_password)
                      );

                      return (
                        <TableRow key={record.employee_id}>
                          <TableCell className="axis-accounts__col--employee">
                            <div className="axis-table-user axis-accounts__user">
                              <Avatar
                                initials={getInitials(record.full_name, { fallback: 'AX' })}
                                name={toHumanName(record.full_name)}
                                src={record.photo_url || record.photo_path || record.avatar_url || ''}
                                size="md"
                                className="axis-avatar--table axis-accounts__avatar"
                                aria-hidden="true"
                              />
                              <div className="axis-accounts__employee">
                                <p className="axis-table-user__name">{toHumanName(record.full_name)}</p>
                                <p className="axis-table-user__role">{toHumanName(record.position_name)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="axis-accounts__col--account">
                            {record.account ? (
                              <span className="axis-accounts__account-email" title={record.account.email}>{record.account.email}</span>
                            ) : (
                              <Badge variant="neutral">Sin cuenta</Badge>
                            )}
                          </TableCell>
                          <TableCell className="axis-accounts__col--roles">
                            {record.account ? (
                              <div className="axis-accounts__roles">
                                {record.account.roles.map((roleName) => (
                                  <Badge
                                    key={`${record.employee_id}-${roleName}`}
                                    variant={getRoleBadgeVariant(roleName)}
                                    className="axis-accounts__role-badge"
                                  >
                                    {toRoleLabel(roleName)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="axis-accounts__empty">Pendiente</span>
                            )}
                          </TableCell>
                          <TableCell className="axis-accounts__col--status">
                            {record.account ? (
                              <StatusBadge
                                status={statusMeta.status}
                                label={statusMeta.label}
                              />
                            ) : (
                              <StatusBadge status="pending" label="Sin cuenta" />
                            )}
                          </TableCell>
                          <TableCell className="axis-accounts__col--session">
                            {record.account ? formatLastSession(record.account.last_session_at) : 'Sin sesión'}
                          </TableCell>
                          <TableCell className="axis-accounts__col--action">
                            <Button
                              type="button"
                              size="sm"
                              variant={record.account ? 'secondary' : 'primary'}
                              onClick={() => handleOpenDrawer(record.employee_id)}
                            >
                              {record.account ? 'Gestionar' : 'Crear cuenta'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {shouldShowPagination ? (
                <Pagination
                  className="ui-pagination--table-footer axis-accounts__pagination"
                  page={page}
                  pageSize={pageSize}
                  totalItems={filteredRecords.length}
                  pageSizeOptions={[8, 10, 12, 20]}
                  onPageChange={setPage}
                  onPageSizeChange={(nextSize) => {
                    setPageSize(nextSize);
                    setPage(1);
                  }}
                />
              ) : null}
            </TableShell>
          </div>
        ) : null}
      </Card>

      <AccountDrawer
        isOpen={drawerOpen}
        employeeId={selectedEmployeeId}
        onClose={() => setDrawerOpen(false)}
        onAccountUpdated={() => loadAccounts({ silent: true })}
      />
    </section>
  );
};

export default AccountsManager;
