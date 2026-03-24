import { useState } from 'react';
import {
  Card,
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

const TAB_OPTIONS = [
  { key: 'personal', label: 'Información personal' },
  { key: 'job', label: 'Información laboral' },
  { key: 'documents', label: 'Documentos' },
  { key: 'payments', label: 'Pagos' },
  { key: 'activity', label: 'Actividad / Auditoría' },
];

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

const DataSection = ({ title, subtitle, fields = [], columns = 2 }) => {
  const visibleFields = fields.filter((field) => field?.show !== false);
  if (visibleFields.length === 0) return null;

  return (
    <Card title={title} subtitle={subtitle}>
      <dl className={`profile360__grid ${columns === 1 ? 'profile360__grid--single' : ''}`}>
        {visibleFields.map((field) => (
          <div key={field.key} className="profile360__field">
            <dt className="profile360__field-label">{field.label}</dt>
            <dd className="profile360__field-value">{field.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
};

const PayrollTable = ({ payments = [], loading = false, error = '' }) => {
  if (loading) {
    return (
      <Card title="Pagos recientes">
        <p className="profile360__table-note">Cargando pagos recientes...</p>
      </Card>
    );
  }

  return (
    <Card title="Pagos recientes">
      {error ? (
        <StatusView title="No se pudo cargar pagos" description={error} />
      ) : (
        <TableShell>
          <Table>
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
    </Card>
  );
};

const Profile360Content = ({
  profile,
  payments = [],
  showPayments = true,
  loadingPayments = false,
  paymentsError = '',
}) => {
  const [activeTab, setActiveTab] = useState('personal');
  const isLinked = Boolean(profile?.linked);
  const syncMeta = profile?.sync_meta || {};

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

  return (
    <div className="profile360">
      <Card
        className="profile360__summary"
        title={formatPlain(identity.full_name)}
      >
        <div className="profile360__summary-grid">
          <article className="profile360__summary-item">
            <p className="profile360__summary-label">Número de empleado</p>
            <p className="profile360__summary-value">{formatPlain(identity.employee_number)}</p>
          </article>
          <article className="profile360__summary-item">
            <p className="profile360__summary-label">Departamento</p>
            <p className="profile360__summary-value">{formatPlain(identity.department?.name)}</p>
          </article>
          <article className="profile360__summary-item">
            <p className="profile360__summary-label">Puesto</p>
            <p className="profile360__summary-value">{formatPlain(identity.job_title?.name)}</p>
          </article>
          <article className="profile360__summary-item">
            <p className="profile360__summary-label">Estatus</p>
            <p className="profile360__summary-value">{formatPlain(identity.employment_status)}</p>
          </article>
        </div>
      </Card>

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

      {activeTab === 'personal' ? (
        <>
          <DataSection
            title="Datos personales"
            fields={[
              { key: 'birth_date', label: 'Fecha de nacimiento', value: formatDate(personal.birth_date) },
              { key: 'sex_code', label: 'Sexo', value: formatPlain(personal.sex_code) },
              { key: 'marital_status', label: 'Estado civil', value: formatPlain(personal.marital_status_code) },
              { key: 'children_count', label: 'Número de hijos', value: formatPlain(personal.children_count) },
              { key: 'rfc', label: 'RFC', value: formatPlain(personal.rfc) },
              { key: 'curp', label: 'CURP', value: formatPlain(personal.curp) },
            ]}
          />

          <DataSection
            title="Contacto y dirección"
            fields={[
              { key: 'email', label: 'Correo', value: formatPlain(contact.email) },
              { key: 'phone_primary', label: 'Teléfono principal', value: formatPlain(contact.phone_primary) },
              { key: 'phone_secondary', label: 'Teléfono secundario', value: formatPlain(contact.phone_secondary) },
              { key: 'full_address', label: 'Dirección completa', value: formatPlain(address.full_address) },
              { key: 'postal_code', label: 'Código postal', value: formatPlain(address.postal_code) },
              { key: 'city', label: 'Ciudad', value: formatPlain(location.city?.label) },
              { key: 'state', label: 'Estado', value: formatPlain(location.state?.label) },
              { key: 'country', label: 'País', value: formatPlain(location.country?.label) },
            ]}
          />

          <DataSection
            title="Familia y cuenta de pago"
            fields={[
              { key: 'father_name', label: 'Nombre del padre', value: formatPlain(family?.father_name), show: Boolean(family) },
              { key: 'mother_name', label: 'Nombre de la madre', value: formatPlain(family?.mother_name), show: Boolean(family) },
              { key: 'group', label: 'Grupo de pago', value: formatPlain(paymentAccount?.payment_group_code), show: Boolean(paymentAccount) },
              { key: 'type', label: 'Tipo de cuenta', value: formatPlain(paymentAccount?.payment_account_type), show: Boolean(paymentAccount) },
              { key: 'number', label: 'Número de cuenta', value: formatPlain(paymentAccount?.payment_account_number), show: Boolean(paymentAccount) },
            ]}
          />
        </>
      ) : null}

      {activeTab === 'job' ? (
        <>
          <DataSection
            title="Datos laborales"
            fields={[
              { key: 'manager_name', label: 'Jefe inmediato', value: formatPlain(labor.manager_name) },
              { key: 'contract_type', label: 'Tipo de contrato', value: formatPlain(labor.contract_type) },
              { key: 'shift_name', label: 'Turno', value: formatPlain(labor.shift_name || labor.shift_code) },
              { key: 'workday_hours', label: 'Horas por jornada', value: formatPlain(labor.workday_hours) },
              { key: 'is_unionized', label: 'Sindicalizado', value: formatBoolean(labor.is_unionized) },
              { key: 'sat_contract', label: 'Contrato SAT', value: formatPlain(labor.sat_contract_code) },
            ]}
          />

          <DataSection
            title="Compensación"
            fields={[
              { key: 'salary_daily', label: 'Salario diario', value: formatMoney(compensation.salary_daily) },
              { key: 'salary_integrated_daily', label: 'Salario integrado diario', value: formatMoney(compensation.salary_integrated_daily) },
              { key: 'contribution_base_amount', label: 'Base de cotización', value: formatMoney(compensation.contribution_base_amount) },
              { key: 'salary_type', label: 'Tipo de salario', value: formatPlain(compensation.salary_type) },
            ]}
          />

          <DataSection
            title="Seguridad social"
            fields={[
              { key: 'social_security_number', label: 'Número de seguridad social', value: formatPlain(socialSecurity?.social_security_number), show: Boolean(socialSecurity) },
              { key: 'imss_clinic_code', label: 'Clínica IMSS', value: formatPlain(socialSecurity?.imss_clinic_code), show: Boolean(socialSecurity) },
              { key: 'employee_contribution_amount', label: 'Aportación empleado', value: formatMoney(socialSecurity?.employee_contribution_amount), show: Boolean(socialSecurity) },
              { key: 'employer_contribution_amount', label: 'Aportación patronal', value: formatMoney(socialSecurity?.employer_contribution_amount), show: Boolean(socialSecurity) },
            ]}
          />
        </>
      ) : null}

      {activeTab === 'documents' ? (
        <StatusView
          title="Módulo de documentos"
          description="Esta vista se conectará con Mis Documentos y Validación RH en la siguiente fase del rediseño."
        />
      ) : null}

      {activeTab === 'payments' ? (
        showPayments ? (
          <>
            {payrollSummary ? (
              <DataSection
                title="Resumen de pagos"
                fields={[
                  { key: 'total_payments', label: 'Total de pagos', value: formatPlain(payrollSummary.total_payments) },
                  { key: 'net_last_90_days', label: 'Neto últimos 90 días', value: formatMoney(payrollSummary.net_last_90_days) },
                  { key: 'last_payment_date', label: 'Último pago', value: formatDate(payrollSummary.last_payment?.payment_date) },
                  { key: 'last_payment_net', label: 'Neto último pago', value: formatMoney(payrollSummary.last_payment?.net_amount) },
                ]}
              />
            ) : null}

            <PayrollTable payments={payments} loading={loadingPayments} error={paymentsError} />
          </>
        ) : (
          <StatusView
            title="Pagos restringidos"
            description="No cuentas con permisos para consultar historial de pagos de este colaborador."
          />
        )
      ) : null}

      {activeTab === 'activity' ? (
        <>
          <DataSection
            title="Trazabilidad de sincronización"
            fields={[
              { key: 'employee_sync', label: 'Ficha base', value: formatDateTime(syncMeta.employee_synced_at) },
              { key: 'contact_sync', label: 'Contacto', value: formatDateTime(syncMeta.contact_synced_at) },
              { key: 'address_sync', label: 'Dirección', value: formatDateTime(syncMeta.address_synced_at) },
              { key: 'payroll_sync', label: 'Nómina', value: formatDateTime(syncMeta.payroll_synced_at) },
              { key: 'linked_at', label: 'Fecha de vínculo', value: formatDateTime(syncMeta.linked_at) },
              { key: 'link_source', label: 'Fuente de vínculo', value: formatPlain(syncMeta.link_source) },
            ]}
          />

          <Card title="Timeline de actividad">
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
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default Profile360Content;
