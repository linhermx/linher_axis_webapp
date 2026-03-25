import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Mail, ShieldCheck, UserRound, UserX } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  DrawerShell,
  InputField,
  NotificationToast,
  StatusBadge,
} from '../ui';
import {
  getAccountStatusMeta,
  getRoleBadgeVariant,
  normalizeRoleList,
  toRoleLabel,
} from '../../lib/axisAccounts';
import { getDepartmentTone } from '../../lib/departmentTone';
import { cn } from '../../lib/cn';
import api from '../../services/api';

const normalizeText = (value) => String(value || '').trim();

const toHumanName = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return 'Sin nombre';

  return normalized
    .toLocaleLowerCase('es-MX')
    .split(/\s+/)
    .map((word) => `${word.charAt(0).toLocaleUpperCase('es-MX')}${word.slice(1)}`)
    .join(' ');
};

const getInitials = (name) => {
  const parts = normalizeText(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const DEFAULT_FORM = {
  email: '',
  password: '',
  selectedSystemRoles: [],
};

const AxisAccountDrawer = ({
  isOpen,
  onClose,
  employeeId,
  onAccountUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [newPassword, setNewPassword] = useState('');
  const [toast, setToast] = useState({
    open: false,
    variant: 'info',
    title: '',
    message: '',
  });

  const roleCatalog = useMemo(
    () => Array.isArray(payload?.role_catalog) ? payload.role_catalog : [],
    [payload]
  );

  const accountData = payload?.data?.account || null;
  const employeeData = payload?.data || null;

  const systemRoleOptions = useMemo(
    () => roleCatalog
      .filter((role) => role?.is_system_role)
      .map((role) => ({ value: role.name, label: toRoleLabel(role.name) })),
    [roleCatalog]
  );

  useEffect(() => {
    if (!isOpen || !employeeId) {
      setPayload(null);
      setError('');
      setForm(DEFAULT_FORM);
      setNewPassword('');
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await api.get(`/admin/axis-accounts/${employeeId}`);
        if (!active) return;

        const account = data?.data?.account || null;
        setPayload(data || null);
        setForm({
          email: account?.email || '',
          password: '',
          selectedSystemRoles: normalizeRoleList(account?.system_roles || []),
        });
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.response?.data?.message || 'No fue posible cargar la cuenta del colaborador.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [employeeId, isOpen]);

  const showToast = (variant, title, message) => {
    setToast({
      open: true,
      variant,
      title,
      message,
    });
  };

  const closeToast = () => {
    setToast((current) => ({ ...current, open: false }));
  };

  const handleRoleToggle = (roleName) => {
    setForm((current) => {
      const normalizedRole = normalizeText(roleName).toUpperCase();
      const alreadySelected = current.selectedSystemRoles.includes(normalizedRole);
      if (alreadySelected) {
        return {
          ...current,
          selectedSystemRoles: current.selectedSystemRoles.filter((role) => role !== normalizedRole),
        };
      }

      return {
        ...current,
        selectedSystemRoles: normalizeRoleList([...current.selectedSystemRoles, normalizedRole]),
      };
    });
  };

  const refreshPayload = async () => {
    const { data } = await api.get(`/admin/axis-accounts/${employeeId}`);
    setPayload(data || null);
    const account = data?.data?.account || null;
    setForm({
      email: account?.email || '',
      password: '',
      selectedSystemRoles: normalizeRoleList(account?.system_roles || []),
    });
    return data;
  };

  const handleCreateAccount = async () => {
    setSubmitting(true);
    setError('');

    try {
      await api.post('/admin/axis-accounts', {
        employee_id: employeeId,
        email: form.email,
        password: form.password,
        system_roles: form.selectedSystemRoles,
      });

      await refreshPayload();
      showToast('success', 'Cuenta creada', 'La cuenta AXIS se creó y vinculó correctamente.');
      onAccountUpdated?.();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No fue posible crear la cuenta AXIS.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAccountStatus = async (nextStatus) => {
    setSubmitting(true);
    setError('');

    try {
      await api.patch(`/admin/axis-accounts/${employeeId}/status`, { status: nextStatus });
      await refreshPayload();
      showToast(
        'success',
        'Estatus actualizado',
        nextStatus === 'inactive'
          ? 'La cuenta quedó inactiva.'
          : 'La cuenta volvió a estado activo.'
      );
      onAccountUpdated?.();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No fue posible actualizar el estatus de la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRoles = async () => {
    setSubmitting(true);
    setError('');

    try {
      await api.patch(`/admin/axis-accounts/${employeeId}/roles`, {
        system_roles: form.selectedSystemRoles,
      });

      await refreshPayload();
      showToast('success', 'Roles actualizados', 'La asignación de roles se guardó correctamente.');
      onAccountUpdated?.();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No fue posible actualizar los roles.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setSubmitting(true);
    setError('');

    try {
      await api.post(`/admin/axis-accounts/${employeeId}/reset-password`, {
        new_password: newPassword,
      });
      setNewPassword('');
      showToast('success', 'Contraseña restablecida', 'La nueva contraseña quedó aplicada.');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No fue posible restablecer la contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  const employeeName = toHumanName(employeeData?.full_name);
  const currentSystemRoles = normalizeRoleList(form.selectedSystemRoles);
  const departmentTone = getDepartmentTone(employeeData?.department_name);

  return (
    <>
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        title="Gestionar cuenta AXIS"
        description="Alta, roles, estatus y restablecimiento de contraseña."
      >
        {loading ? (
          <p className="axis-account-drawer__loading">Cargando datos de cuenta...</p>
        ) : null}

        {!loading && error ? (
          <Alert variant="error" title="No se pudo completar la acción">
            {error}
          </Alert>
        ) : null}

        {!loading && !error && employeeData ? (
          <div className="axis-account-drawer">
            <article className="axis-account-drawer__employee">
              <span className="axis-account-drawer__avatar" aria-hidden="true">{getInitials(employeeName)}</span>
              <div className="axis-account-drawer__employee-meta">
                <h3>{employeeName}</h3>
                <p>{toHumanName(employeeData.position_name)}</p>
                <span
                  className={cn(
                    'axis-account-drawer__department-chip',
                    `employee-directory__department-tone--${departmentTone}`
                  )}
                >
                  {toHumanName(employeeData.department_name)}
                </span>
              </div>
              <div className="axis-account-drawer__employee-state">
                {accountData ? (
                  <StatusBadge
                    status={getAccountStatusMeta(accountData.status).status}
                    label={getAccountStatusMeta(accountData.status).label}
                  />
                ) : (
                  <StatusBadge status="pending" label="Sin cuenta" />
                )}
              </div>
            </article>

            {!accountData ? (
              <section className="axis-account-drawer__section">
                <header className="axis-account-drawer__section-header">
                  <h4>Crear cuenta de acceso</h4>
                  <p>Vincula un correo corporativo y define contraseña inicial.</p>
                </header>

                <div className="axis-account-drawer__form-grid">
                  <InputField
                    name="axis-account-email"
                    label="Correo corporativo"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    leftIcon={<Mail size={16} />}
                    placeholder="nombre@linher.com.mx"
                  />

                  <InputField
                    name="axis-account-password"
                    label="Contraseña inicial"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    leftIcon={<KeyRound size={16} />}
                    placeholder="Mínimo 10 caracteres"
                  />
                </div>

                <fieldset className="axis-account-drawer__roles">
                  <legend>Roles de sistema (opcional)</legend>
                  <div className="axis-account-drawer__roles-grid">
                    {systemRoleOptions.map((role) => (
                      <label key={role.value} className="axis-account-drawer__role-option ui-list-hoverable">
                        <input
                          type="checkbox"
                          checked={form.selectedSystemRoles.includes(role.value)}
                          onChange={() => handleRoleToggle(role.value)}
                        />
                        <span>{role.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <Button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={submitting}
                >
                  <UserRound size={16} />
                  {submitting ? 'Creando cuenta...' : 'Crear y vincular cuenta'}
                </Button>
              </section>
            ) : (
              <>
                <section className="axis-account-drawer__section">
                  <header className="axis-account-drawer__section-header">
                    <h4>Cuenta vinculada</h4>
                    <p>Controla estatus y última sesión de acceso.</p>
                  </header>

                  <div className="axis-account-drawer__metric-grid">
                    <article className="axis-account-drawer__metric">
                      <dt>Correo</dt>
                      <dd>{accountData.email || 'Sin dato'}</dd>
                    </article>
                    <article className="axis-account-drawer__metric">
                      <dt>Última sesión</dt>
                      <dd>
                        {accountData.last_session_at
                          ? new Date(accountData.last_session_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
                          : 'Sin sesión'}
                      </dd>
                    </article>
                  </div>

                  <div className="axis-account-drawer__actions">
                    {accountData.status === 'active' ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleToggleAccountStatus('inactive')}
                        disabled={submitting}
                      >
                        <UserX size={16} />
                        {submitting ? 'Actualizando...' : 'Inactivar cuenta'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => handleToggleAccountStatus('active')}
                        disabled={submitting}
                      >
                        <CheckCircle2 size={16} />
                        {submitting ? 'Actualizando...' : 'Activar cuenta'}
                      </Button>
                    )}
                  </div>
                </section>

                <section className="axis-account-drawer__section">
                  <header className="axis-account-drawer__section-header">
                    <h4>Roles asignados</h4>
                    <p>El rol Empleado se mantiene fijo para autoservicio.</p>
                  </header>

                  <div className="axis-account-drawer__chips">
                    <Badge variant="neutral" className="axis-accounts__role-badge">{toRoleLabel('EMPLEADO')}</Badge>
                    {currentSystemRoles.map((roleName) => (
                      <Badge
                        key={roleName}
                        variant={getRoleBadgeVariant(roleName)}
                        className="axis-accounts__role-badge"
                      >
                        {toRoleLabel(roleName)}
                      </Badge>
                    ))}
                  </div>

                  <fieldset className="axis-account-drawer__roles">
                    <legend>Roles de sistema</legend>
                    <div className="axis-account-drawer__roles-grid">
                      {systemRoleOptions.map((role) => (
                        <label key={role.value} className="axis-account-drawer__role-option ui-list-hoverable">
                          <input
                            type="checkbox"
                            checked={form.selectedSystemRoles.includes(role.value)}
                            onChange={() => handleRoleToggle(role.value)}
                          />
                          <span>{role.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleUpdateRoles}
                    disabled={submitting}
                  >
                    <ShieldCheck size={16} />
                    {submitting ? 'Guardando...' : 'Guardar roles'}
                  </Button>
                </section>

                <section className="axis-account-drawer__section">
                  <header className="axis-account-drawer__section-header">
                    <h4>Restablecer contraseña</h4>
                    <p>Se cerrarán sesiones activas y se aplicará la nueva contraseña.</p>
                  </header>

                  <div className="axis-account-drawer__form-grid">
                    <InputField
                      name="axis-account-reset-password"
                      label="Nueva contraseña"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      leftIcon={<KeyRound size={16} />}
                      placeholder="Mínimo 10 caracteres"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleResetPassword}
                    disabled={submitting}
                  >
                    <AlertCircle size={16} />
                    {submitting ? 'Aplicando...' : 'Restablecer contraseña'}
                  </Button>
                </section>
              </>
            )}
          </div>
        ) : null}
      </DrawerShell>

      <NotificationToast
        open={toast.open}
        title={toast.title}
        message={toast.message}
        variant={toast.variant}
        onClose={closeToast}
      />
    </>
  );
};

export default AxisAccountDrawer;
