import { useState } from 'react';
import { CalendarDays, Clock3, FileText, Hash, User } from 'lucide-react';
import {
  Badge,
  StatusBadge,
  StatusView,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from './ui';
import { getDepartmentTone } from '../lib/departmentTone';

const TAB_OPTIONS = [
  { key: 'personal', label: 'Información personal' },
  { key: 'job', label: 'Información laboral' },
  { key: 'documents', label: 'Documentos' },
  { key: 'payments', label: 'Pagos' },
  { key: 'activity', label: 'Actividad / Auditoría' },
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const MARITAL_STATUS_LABEL_MAP = {
  C: 'Casado(a)',
  S: 'Soltero(a)',
  U: 'Unión libre',
  D: 'Divorciado(a)',
  V: 'Viudo(a)',
};

const SHIFT_LABEL_MAP = {
  M: 'Matutino',
  V: 'Vespertino',
  N: 'Nocturno',
};

const formatDate = (value) => {
  if (!value) return 'Sin dato';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin dato';
  return parsed.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
};

const formatDateTime = (value) => {
  if (!value) return 'Sin dato';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin dato';
  return parsed.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
};

const formatMoney = (value, currency = 'MXN') => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 'Sin dato';
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatBoolean = (value) => {
  if (value === null || value === undefined) return 'Sin dato';
  return value ? 'Sí' : 'No';
};

const formatPlain = (value) => {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  return String(value);
};

const formatGender = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return 'Sin dato';
  if (['F', 'FEMENINO', 'FEMALE'].includes(normalized)) return 'Femenino';
  if (['M', 'MASCULINO', 'MALE'].includes(normalized)) return 'Masculino';
  return formatPlain(value);
};

const formatMaritalStatus = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return 'Sin dato';
  return MARITAL_STATUS_LABEL_MAP[normalized] || formatPlain(value);
};

const formatShift = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return 'Sin dato';
  return SHIFT_LABEL_MAP[normalized] || formatPlain(value);
};

const formatLocationValue = (value) => {
  const plainValue = formatPlain(value);
  if (plainValue === 'Sin dato') return plainValue;
  return plainValue.replace(/\s*\(\d+\)\s*$/u, '').trim();
};

const toEmploymentStatusView = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (!normalized) {
    return { status: 'info', label: 'Sin dato' };
  }

  if (['active', 'activo', 'vigente'].includes(normalized)) {
    return { status: 'approved', label: 'Activo' };
  }

  if (['inactive', 'inactivo', 'terminated', 'baja'].includes(normalized)) {
    return { status: 'inactive', label: 'Inactivo' };
  }

  return { status: 'info', label: formatPlain(value) };
};

const resolvePhotoSource = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized) || normalized.startsWith('data:')) {
    return normalized;
  }

  const cleanPath = normalized.replace(/^\/+/, '');
  return `${API_ROOT_URL}/${cleanPath}`;
};

const buildInitials = (fullName) => {
  const tokens = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) return 'NA';
  return tokens.map((token) => token[0]?.toUpperCase() || '').join('');
};

const ProfileSheet = ({ title, fields = [], columns = 2, className = '' }) => {
  const visibleFields = fields.filter((field) => field?.show !== false);
  if (visibleFields.length === 0) return null;

  const columnsClass = columns === 1
    ? 'profile360-sheet__grid--single'
    : columns === 3
      ? 'profile360-sheet__grid--triple'
      : columns === 4
        ? 'profile360-sheet__grid--quad'
        : '';

  return (
    <section className={`profile360-sheet ${className}`.trim()}>
      <header className="profile360-sheet__header">
        <h3 className="profile360-sheet__title">{title}</h3>
      </header>

      <dl className={`profile360-sheet__grid ${columnsClass}`.trim()}>
        {visibleFields.map((field) => (
          <div
            key={field.key}
            className={`profile360-sheet__item ${field?.span ? `profile360-sheet__item--span-${field.span}` : ''}`.trim()}
          >
            <dt className="profile360-sheet__label">{field.label}</dt>
            <dd className="profile360-sheet__value">{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

const PayrollTable = ({ payments = [], loading = false, error = '' }) => {
  if (loading) {
    return (
      <section className="profile360-sheet profile360-sheet--payments">
        <header className="profile360-sheet__header">
          <h3 className="profile360-sheet__title">Pagos recientes</h3>
        </header>
        <p className="profile360__table-note">Cargando pagos recientes...</p>
      </section>
    );
  }

  return (
    <section className="profile360-sheet profile360-sheet--payments">
      <header className="profile360-sheet__header">
        <h3 className="profile360-sheet__title">Pagos recientes</h3>
      </header>

      {error ? (
        <StatusView title="No se pudo cargar pagos" description={error} />
      ) : (
        <TableShell className="profile360__payments-table axis-table-shell">
          <Table className="axis-table">
            <TableCaption>Historial de pagos de nómina</TableCaption>
            <TableHead>
              <TableRow>
                <TableHeaderCell scope="col">Fecha</TableHeaderCell>
                <TableHeaderCell scope="col">Tipo</TableHeaderCell>
                <TableHeaderCell scope="col">Percepciones</TableHeaderCell>
                <TableHeaderCell scope="col">Deducciones</TableHeaderCell>
                <TableHeaderCell scope="col">Neto</TableHeaderCell>
                <TableHeaderCell scope="col">Método</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.length === 0 ? (
                <TableEmptyState colSpan={6}>No hay pagos sincronizados para este colaborador.</TableEmptyState>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.microsip_payroll_payment_id || payment.id}>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell>{formatPlain(payment.payroll_type)}</TableCell>
                    <TableCell>{formatMoney(payment.total_earnings)}</TableCell>
                    <TableCell>{formatMoney(payment.total_deductions)}</TableCell>
                    <TableCell>{formatMoney(payment.net_amount)}</TableCell>
                    <TableCell>{formatPlain(payment.payment_method)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableShell>
      )}
    </section>
  );
};

const Profile360Content = ({
  profile,
  payments = [],
  showPayments = true,
  loadingPayments = false,
  paymentsError = '',
  headerAction = null,
}) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [photoLoadError, setPhotoLoadError] = useState(false);

  const isLinked = Boolean(profile?.linked);
  const syncMeta = profile?.sync_meta || {};

  const identity = profile.identity || {};
  const labor = profile.labor || {};
  const compensation = profile.compensation || {};
  const socialSecurity = profile.social_security;
  const personal = profile.personal || {};
  const contact = profile.contact || {};
  const address = profile.address || {};
  const location = profile.location || {};
  const family = profile.family;
  const paymentAccount = profile.payment_account;
  const payrollSummary = profile.payroll_summary;

  const fullName = formatPlain(identity.full_name);
  const roleName = formatPlain(identity.job_title?.name);
  const departmentName = formatPlain(identity.department?.name);
  const departmentTone = getDepartmentTone(identity.department?.name || departmentName);
  const genderLabel = formatGender(personal.sex_code);
  const employmentStatus = toEmploymentStatusView(identity.employment_status);
  const photoSource = resolvePhotoSource(
    identity.photo_url
    || identity.photo_path
    || profile.photo_url
    || profile.photo_path
  );

  const summaryFacts = [
    { key: 'employee_number', label: 'Número de empleado', value: formatPlain(identity.employee_number), icon: Hash },
    { key: 'hired_at', label: 'Ingreso', value: formatDate(identity.hired_at), icon: CalendarDays },
    { key: 'shift', label: 'Turno', value: formatShift(labor.shift_name || labor.shift_code), icon: Clock3 },
    { key: 'contract_type', label: 'Contrato', value: formatPlain(labor.contract_type), icon: FileText },
    { key: 'manager', label: 'Jefe inmediato', value: formatPlain(labor.manager_name), icon: User },
  ];

  const activityEvents = [
    { key: 'employee', title: 'Ficha base', value: syncMeta.employee_synced_at },
    { key: 'contact', title: 'Contacto', value: syncMeta.contact_synced_at },
    { key: 'address', title: 'Dirección', value: syncMeta.address_synced_at },
    { key: 'payroll', title: 'Nómina', value: syncMeta.payroll_synced_at },
    { key: 'linked', title: 'Vínculo', value: syncMeta.linked_at },
  ].filter((event) => event.value);

  if (!isLinked) {
    return (
      <StatusView
        title="Sin vínculo Microsip"
        description="Este colaborador todavía no tiene enlace con la ficha administrativa sincronizada desde Microsip."
      />
    );
  }

  return (
    <div className="profile360">
      <div className="profile360__workspace">
        <section className="profile360__hero">
          <div className="profile360__hero-main">
            <div className="profile360__avatar-wrap" aria-hidden="true">
              {photoSource && !photoLoadError ? (
                <img
                  src={photoSource}
                  alt=""
                  className="profile360__avatar-image"
                  onError={() => setPhotoLoadError(true)}
                />
              ) : (
                <span className="profile360__avatar-fallback">{buildInitials(fullName)}</span>
              )}
            </div>

            <div className="profile360__identity-content">
              <h2 className="profile360__name">{fullName}</h2>
              <p className="profile360__role">{roleName}</p>
              <div className="profile360__chips">
                <Badge
                  variant="neutral"
                  className={`profile360__department-chip employee-directory__department-tone--${departmentTone}`}
                >
                  {departmentName}
                </Badge>
              </div>
            </div>

            <div className="profile360__hero-side">
              {headerAction ? (
                <div className="profile360__hero-action">
                  {headerAction}
                </div>
              ) : null}
              <StatusBadge
                status={employmentStatus.status}
                label={employmentStatus.label}
                className="profile360__identity-status"
              />
            </div>
          </div>

          <dl className="profile360__quick-facts">
            {summaryFacts.map((fact) => (
              <div key={fact.key} className="profile360__quick-fact">
                <dt>
                  <span className="profile360__quick-icon" aria-hidden="true">
                    <fact.icon size={13} strokeWidth={2.2} />
                  </span>
                  <span>{fact.label}</span>
                </dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="profile360__main">
          <nav className="profile360__tabs" aria-label="Secciones del perfil 360">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`profile360__tab ${activeTab === tab.key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="profile360__main-body">
            {activeTab === 'personal' ? (
              <div className="profile360__panel-grid profile360__panel-grid--two">
                <ProfileSheet
                  title="Datos personales"
                  columns={2}
                  fields={[
                    { key: 'birth_date', label: 'Fecha de nacimiento', value: formatDate(personal.birth_date) },
                    { key: 'gender', label: 'Género', value: genderLabel },
                    { key: 'marital_status', label: 'Estado civil', value: formatMaritalStatus(personal.marital_status_code) },
                    { key: 'children_count', label: 'Número de hijos', value: formatPlain(personal.children_count) },
                    { key: 'rfc', label: 'RFC', value: formatPlain(personal.rfc) },
                    { key: 'curp', label: 'CURP', value: formatPlain(personal.curp) },
                  ]}
                />

                <ProfileSheet
                  title="Contacto y dirección"
                  columns={2}
                  fields={[
                    { key: 'email', label: 'Correo', value: formatPlain(contact.email) },
                    { key: 'phone_primary', label: 'Teléfono principal', value: formatPlain(contact.phone_primary) },
                    { key: 'phone_secondary', label: 'Teléfono secundario', value: formatPlain(contact.phone_secondary) },
                    { key: 'postal_code', label: 'Código postal', value: formatPlain(address.postal_code) },
                    { key: 'full_address', label: 'Dirección completa', value: formatPlain(address.full_address), span: 2 },
                    { key: 'city', label: 'Ciudad', value: formatLocationValue(location.city?.name || location.city?.label) },
                    { key: 'state', label: 'Estado', value: formatLocationValue(location.state?.name || location.state?.label) },
                    { key: 'country', label: 'País', value: formatLocationValue(location.country?.name || location.country?.label), span: 2 },
                  ]}
                />
              </div>
            ) : null}

            {activeTab === 'job' ? (
              <div className="profile360__panel-grid profile360__panel-grid--two">
                <ProfileSheet
                  title="Datos laborales"
                  columns={2}
                  fields={[
                    { key: 'manager_name', label: 'Jefe inmediato', value: formatPlain(labor.manager_name) },
                    { key: 'contract_type', label: 'Tipo de contrato', value: formatPlain(labor.contract_type) },
                    { key: 'shift_name', label: 'Turno', value: formatShift(labor.shift_name || labor.shift_code) },
                    { key: 'workday_hours', label: 'Horas por jornada', value: formatPlain(labor.workday_hours) },
                    { key: 'is_unionized', label: 'Sindicalizado', value: formatBoolean(labor.is_unionized) },
                    { key: 'sat_contract', label: 'Contrato SAT', value: formatPlain(labor.sat_contract_code) },
                  ]}
                />

                <ProfileSheet
                  title="Compensación"
                  columns={2}
                  fields={[
                    { key: 'salary_daily', label: 'Salario diario', value: formatMoney(compensation.salary_daily) },
                    { key: 'salary_integrated_daily', label: 'Salario integrado diario', value: formatMoney(compensation.salary_integrated_daily) },
                    { key: 'contribution_base_amount', label: 'Base de cotización', value: formatMoney(compensation.contribution_base_amount) },
                    { key: 'salary_type', label: 'Tipo de salario', value: formatPlain(compensation.salary_type) },
                  ]}
                />

                <ProfileSheet
                  className="profile360__panel-span-2"
                  title="Seguridad social, pago y familia"
                  columns={2}
                  fields={[
                    { key: 'social_security_number', label: 'NSS', value: formatPlain(socialSecurity?.social_security_number), show: Boolean(socialSecurity) },
                    { key: 'imss_clinic_code', label: 'Clínica IMSS', value: formatPlain(socialSecurity?.imss_clinic_code), show: Boolean(socialSecurity) },
                    { key: 'employee_contribution_amount', label: 'Aportación empleado', value: formatMoney(socialSecurity?.employee_contribution_amount), show: Boolean(socialSecurity) },
                    { key: 'employer_contribution_amount', label: 'Aportación patronal', value: formatMoney(socialSecurity?.employer_contribution_amount), show: Boolean(socialSecurity) },
                    { key: 'group', label: 'Grupo de pago', value: formatPlain(paymentAccount?.payment_group_code), show: Boolean(paymentAccount) },
                    { key: 'type', label: 'Tipo de cuenta', value: formatPlain(paymentAccount?.payment_account_type), show: Boolean(paymentAccount) },
                    { key: 'number', label: 'Número de cuenta', value: formatPlain(paymentAccount?.payment_account_number), show: Boolean(paymentAccount), span: 2 },
                    { key: 'father_name', label: 'Nombre del padre', value: formatPlain(family?.father_name), show: Boolean(family) },
                    { key: 'mother_name', label: 'Nombre de la madre', value: formatPlain(family?.mother_name), show: Boolean(family) },
                  ]}
                />
              </div>
            ) : null}

            {activeTab === 'documents' ? (
              <StatusView
                title="Módulo de documentos"
                description="Esta vista se conectará con Mis Documentos y Validación RH en la siguiente fase del rediseño."
              />
            ) : null}

            {activeTab === 'payments' ? (
              showPayments ? (
                <div className="profile360__panel-stack">
                  {payrollSummary ? (
                    <ProfileSheet
                      title="Resumen de pagos"
                      columns={4}
                      fields={[
                        { key: 'total_payments', label: 'Total de pagos', value: formatPlain(payrollSummary.total_payments) },
                        { key: 'net_last_90_days', label: 'Neto últimos 90 días', value: formatMoney(payrollSummary.net_last_90_days) },
                        { key: 'last_payment_date', label: 'Último pago', value: formatDate(payrollSummary.last_payment?.payment_date) },
                        { key: 'last_payment_net', label: 'Neto último pago', value: formatMoney(payrollSummary.last_payment?.net_amount) },
                      ]}
                    />
                  ) : null}

                  <PayrollTable payments={payments} loading={loadingPayments} error={paymentsError} />
                </div>
              ) : (
                <StatusView
                  title="Pagos restringidos"
                  description="No cuentas con permisos para consultar historial de pagos de este colaborador."
                />
              )
            ) : null}

            {activeTab === 'activity' ? (
              <div className="profile360__panel-stack">
                <ProfileSheet
                  title="Trazabilidad de sincronización"
                  columns={3}
                  fields={[
                    { key: 'employee_sync', label: 'Ficha base', value: formatDateTime(syncMeta.employee_synced_at) },
                    { key: 'contact_sync', label: 'Contacto', value: formatDateTime(syncMeta.contact_synced_at) },
                    { key: 'address_sync', label: 'Dirección', value: formatDateTime(syncMeta.address_synced_at) },
                    { key: 'payroll_sync', label: 'Nómina', value: formatDateTime(syncMeta.payroll_synced_at) },
                    { key: 'linked_at', label: 'Fecha de vínculo', value: formatDateTime(syncMeta.linked_at) },
                    { key: 'link_source', label: 'Fuente de vínculo', value: formatPlain(syncMeta.link_source) },
                  ]}
                />

                <section className="profile360-sheet">
                  <header className="profile360-sheet__header">
                    <h3 className="profile360-sheet__title">Timeline de actividad</h3>
                  </header>

                  {activityEvents.length === 0 ? (
                    <p className="profile360__placeholder">No hay eventos de sincronización registrados.</p>
                  ) : (
                    <ul className="profile360__timeline">
                      {activityEvents.map((event) => (
                        <li key={event.key} className="profile360__timeline-item">
                          <span className="profile360__timeline-dot" aria-hidden="true" />
                          <div>
                            <p className="profile360__timeline-title">{event.title}</p>
                            <p className="profile360__timeline-date">{formatDateTime(event.value)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile360Content;
