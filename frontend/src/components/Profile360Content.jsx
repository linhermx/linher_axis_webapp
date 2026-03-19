
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
  return value ? 'Si' : 'No';
};

const formatPlain = (value) => {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  return String(value);
};

const Section = ({ title, subtitle, fields = [], columns = 2 }) => {
  const hasVisibleFields = fields.some((field) => field?.show !== false);
  if (!hasVisibleFields) {
    return null;
  }

  return (
    <Card title={title} subtitle={subtitle}>
      <dl className={`grid gap-4 ${columns === 1 ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {fields.map((field) => {
          if (!field || field.show === false) {
            return null;
          }

          return (
            <div key={field.key} className="rounded-md border border-ui-light-slate bg-ui-background p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ui-text-secondary">
                {field.label}
              </dt>
              <dd className="mt-2 text-sm font-semibold text-ui-dark-navy">{field.value}</dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
};

const PayrollTable = ({ payments = [], loading = false, error = '' }) => {
  if (loading) {
    return (
      <Card title="Pagos recientes" subtitle="Resumen de pagos sincronizados desde Microsip.">
        <p className="text-sm text-ui-text-secondary">Cargando pagos recientes...</p>
      </Card>
    );
  }

  return (
    <Card title="Pagos recientes" subtitle="Historial de pagos de nomina de solo consulta.">
      {error ? (
        <p className="text-sm text-status-error">{error}</p>
      ) : (
        <TableShell>
          <Table>
            <TableCaption>Historial de pagos de nomina</TableCaption>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell scope="col">Fecha</TableHeaderCell>
                <TableHeaderCell scope="col">Tipo</TableHeaderCell>
                <TableHeaderCell scope="col">Percepciones</TableHeaderCell>
                <TableHeaderCell scope="col">Deducciones</TableHeaderCell>
                <TableHeaderCell scope="col">Neto</TableHeaderCell>
                <TableHeaderCell scope="col">Metodo</TableHeaderCell>
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
                    <TableCell className="font-semibold text-ui-dark-navy">{formatMoney(payment.net_amount)}</TableCell>
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
  if (!profile?.linked) {
    return (
      <StatusView
        title="Sin vinculo Microsip"
        description="Este colaborador todavia no tiene enlace con la ficha administrativa sincronizada desde Microsip."
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
  const syncMeta = profile.sync_meta || {};
  const payrollSummary = profile.payroll_summary;

  return (
    <div className="space-y-6">
      <Section
        title="Identidad y puesto"
        subtitle="Datos base del colaborador sincronizados desde Microsip."
        fields={[
          { key: 'employee_number', label: 'Numero de empleado', value: formatPlain(identity.employee_number) },
          { key: 'full_name', label: 'Nombre completo', value: formatPlain(identity.full_name) },
          { key: 'department', label: 'Departamento', value: formatPlain(identity.department?.name) },
          { key: 'job_title', label: 'Puesto', value: formatPlain(identity.job_title?.name) },
          { key: 'status', label: 'Estatus laboral', value: formatPlain(identity.employment_status) },
          { key: 'hired_at', label: 'Fecha de ingreso', value: formatDate(identity.hired_at) },
        ]}
      />

      <Section
        title="Datos laborales"
        subtitle="Contrato, jornada y datos operativos del empleo."
        fields={[
          { key: 'manager_name', label: 'Jefe inmediato', value: formatPlain(labor.manager_name) },
          { key: 'contract_type', label: 'Tipo de contrato', value: formatPlain(labor.contract_type) },
          { key: 'shift_name', label: 'Turno', value: formatPlain(labor.shift_name || labor.shift_code) },
          { key: 'workday_hours', label: 'Horas por jornada', value: formatPlain(labor.workday_hours) },
          { key: 'is_unionized', label: 'Sindicalizado', value: formatBoolean(labor.is_unionized) },
          { key: 'sat_contract', label: 'Contrato SAT', value: formatPlain(labor.sat_contract_code) },
        ]}
      />
      <Section
        title="Compensacion"
        subtitle="Informacion salarial en modo de solo lectura."
        fields={[
          { key: 'salary_daily', label: 'Salario diario', value: formatMoney(compensation.salary_daily) },
          {
            key: 'salary_integrated_daily',
            label: 'Salario integrado diario',
            value: formatMoney(compensation.salary_integrated_daily),
          },
          {
            key: 'contribution_base_amount',
            label: 'Base de cotizacion',
            value: formatMoney(compensation.contribution_base_amount),
          },
          { key: 'salary_type', label: 'Tipo de salario', value: formatPlain(compensation.salary_type) },
        ]}
      />

      <Section
        title="Seguridad social"
        subtitle="Datos de afiliacion y aportaciones IMSS."
        fields={[
          {
            key: 'social_security_number',
            label: 'Numero de seguridad social',
            value: formatPlain(socialSecurity?.social_security_number),
            show: Boolean(socialSecurity),
          },
          {
            key: 'imss_clinic_code',
            label: 'Clinica IMSS',
            value: formatPlain(socialSecurity?.imss_clinic_code),
            show: Boolean(socialSecurity),
          },
          {
            key: 'employee_contribution_amount',
            label: 'Aportacion empleado',
            value: formatMoney(socialSecurity?.employee_contribution_amount),
            show: Boolean(socialSecurity),
          },
          {
            key: 'employer_contribution_amount',
            label: 'Aportacion patronal',
            value: formatMoney(socialSecurity?.employer_contribution_amount),
            show: Boolean(socialSecurity),
          },
        ]}
      />

      <Section
        title="Datos personales"
        subtitle="Informacion fiscal y social del colaborador."
        fields={[
          { key: 'birth_date', label: 'Fecha de nacimiento', value: formatDate(personal.birth_date) },
          { key: 'sex_code', label: 'Sexo', value: formatPlain(personal.sex_code) },
          { key: 'marital_status', label: 'Estado civil', value: formatPlain(personal.marital_status_code) },
          { key: 'children_count', label: 'Numero de hijos', value: formatPlain(personal.children_count) },
          { key: 'rfc', label: 'RFC', value: formatPlain(personal.rfc) },
          { key: 'curp', label: 'CURP', value: formatPlain(personal.curp) },
          { key: 'reg_imss', label: 'Registro IMSS', value: formatPlain(personal.social_security_registry) },
        ]}
      />

      <Section
        title="Contacto y direccion"
        subtitle="Canales de contacto y ubicacion del domicilio."
        fields={[
          { key: 'email', label: 'Correo', value: formatPlain(contact.email) },
          { key: 'phone_primary', label: 'Telefono principal', value: formatPlain(contact.phone_primary) },
          { key: 'phone_secondary', label: 'Telefono secundario', value: formatPlain(contact.phone_secondary) },
          { key: 'full_address', label: 'Direccion completa', value: formatPlain(address.full_address) },
          { key: 'postal_code', label: 'Codigo postal', value: formatPlain(address.postal_code) },
          { key: 'city', label: 'Ciudad', value: formatPlain(location.city?.label) },
          { key: 'state', label: 'Estado', value: formatPlain(location.state?.label) },
          { key: 'country', label: 'Pais', value: formatPlain(location.country?.label) },
        ]}
      />

      <Section
        title="Familia y cuenta de pago"
        subtitle="Referencias familiares y cuenta de dispersion."
        fields={[
          {
            key: 'father_name',
            label: 'Nombre del padre',
            value: formatPlain(family?.father_name),
            show: Boolean(family),
          },
          {
            key: 'mother_name',
            label: 'Nombre de la madre',
            value: formatPlain(family?.mother_name),
            show: Boolean(family),
          },
          {
            key: 'payment_group_code',
            label: 'Grupo de pago',
            value: formatPlain(paymentAccount?.payment_group_code),
            show: Boolean(paymentAccount),
          },
          {
            key: 'payment_account_type',
            label: 'Tipo de cuenta',
            value: formatPlain(paymentAccount?.payment_account_type),
            show: Boolean(paymentAccount),
          },
          {
            key: 'payment_account_number',
            label: 'Numero de cuenta',
            value: formatPlain(paymentAccount?.payment_account_number),
            show: Boolean(paymentAccount),
          },
        ]}
      />

      {payrollSummary ? (
        <Section
          title="Resumen de pagos"
          subtitle="Indicadores rapidos del historial de nomina sincronizada."
          fields={[
            {
              key: 'total_payments',
              label: 'Total de pagos',
              value: formatPlain(payrollSummary.total_payments),
            },
            {
              key: 'net_last_90_days',
              label: 'Neto ultimos 90 dias',
              value: formatMoney(payrollSummary.net_last_90_days),
            },
            {
              key: 'last_payment_date',
              label: 'Ultimo pago',
              value: formatDate(payrollSummary.last_payment?.payment_date),
            },
            {
              key: 'last_payment_net',
              label: 'Neto ultimo pago',
              value: formatMoney(payrollSummary.last_payment?.net_amount),
            },
          ]}
        />
      ) : null}

      <Section
        title="Trazabilidad de sincronizacion"
        subtitle="Ultimas marcas de actualizacion por bloque de datos."
        fields={[
          { key: 'employee_sync', label: 'Ficha base', value: formatDateTime(syncMeta.employee_synced_at) },
          { key: 'contact_sync', label: 'Contacto', value: formatDateTime(syncMeta.contact_synced_at) },
          { key: 'address_sync', label: 'Direccion', value: formatDateTime(syncMeta.address_synced_at) },
          { key: 'payroll_sync', label: 'Nomina', value: formatDateTime(syncMeta.payroll_synced_at) },
          { key: 'linked_at', label: 'Fecha de vinculo', value: formatDateTime(syncMeta.linked_at) },
          { key: 'link_source', label: 'Fuente de vinculo', value: formatPlain(syncMeta.link_source) },
        ]}
      />

      {showPayments ? (
        <PayrollTable payments={payments} loading={loadingPayments} error={paymentsError} />
      ) : null}
    </div>
  );
};

export default Profile360Content;
