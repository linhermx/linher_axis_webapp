import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, KeyRound, Mail, ShieldCheck, UserRound, UserX } from 'lucide-react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  DrawerShell,
  InputField,
  NotificationToast,
  StatusBadge,
} from '../ui';
import ProfilePhotoActions from '../ProfilePhotoActions';
import {
  getAccountStatusMeta,
  getRoleBadgeVariant,
  normalizeRoleList,
  toRoleLabel,
} from '../../lib/axisAccounts';
import { getDepartmentTone } from '../../lib/departmentTone';
import { getInitials, normalizeText, toHumanName } from '../../lib/identity';
import { resolveAssetUrl } from '../../lib/media';
import { cn } from '../../lib/cn';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const DEFAULT_FORM = {
  email: '',
  selectedSystemRoles: [],
};

const AccountDrawer = ({
  isOpen,
  onClose,
  employeeId,
  onAccountUpdated,
}) => {
  const { user, refreshSessionUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoRemoving, setPhotoRemoving] = useState(false);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [temporaryPassword, setTemporaryPassword] = useState('');
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
      setTemporaryPassword('');
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
      selectedSystemRoles: normalizeRoleList(account?.system_roles || []),
    });
    return data;
  };

  const refreshSessionIfCurrentUser = async (nextPayload = null) => {
    const payloadToValidate = nextPayload || payload;
    const payloadUserId = Number(payloadToValidate?.data?.user_id || payloadToValidate?.data?.account?.user_id);
    const sessionUserId = Number(user?.id);

    if (!payloadUserId || !sessionUserId || payloadUserId !== sessionUserId) {
      return;
    }

    if (typeof refreshSessionUser === 'function') {
      await refreshSessionUser();
    }
  };

  const handleUploadProfilePhoto = async (file) => {
    setPhotoUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', file);
      await api.post(`/admin/axis-accounts/${employeeId}/photo`, formData);
      const refreshed = await refreshPayload();
      await refreshSessionIfCurrentUser(refreshed);
      onAccountUpdated?.();
      showToast('success', 'Foto actualizada', 'La foto de perfil se actualizó correctamente.');
      return true;
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No fue posible actualizar la foto de perfil.');
      return false;
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemoveProfilePhoto = async () => {
    setPhotoRemoving(true);
    setError('');

    try {
      await api.delete(`/admin/axis-accounts/${employeeId}/photo`);
      const refreshed = await refreshPayload();
      await refreshSessionIfCurrentUser(refreshed);
      onAccountUpdated?.();
      showToast('success', 'Foto eliminada', 'La foto de perfil se eliminó correctamente.');
      return true;
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No fue posible eliminar la foto de perfil.');
      return false;
    } finally {
      setPhotoRemoving(false);
    }
  };

  const handleCreateAccount = async () => {
    setSubmitting(true);
    setError('');

    try {
      const { data } = await api.post('/admin/axis-accounts', {
        employee_id: employeeId,
        email: form.email,
        system_roles: form.selectedSystemRoles,
      });

      await refreshPayload();
      const generatedPassword = String(
        data?.credentials?.temporary_password
        || ''
      ).trim();
      if (generatedPassword) {
        setTemporaryPassword(generatedPassword);
      }
      showToast('success', 'Cuenta creada', generatedPassword
        ? 'Cuenta creada con contraseña temporal.'
        : 'La cuenta AXIS se creó y vinculó correctamente.');
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
      const { data } = await api.post(`/admin/axis-accounts/${employeeId}/reset-password`);
      const generatedPassword = String(
        data?.credentials?.temporary_password
        || ''
      ).trim();

      if (generatedPassword) {
        setTemporaryPassword(generatedPassword);
        showToast('success', 'Contraseña temporal generada', 'Ya puedes copiarla y compartirla.');
      } else {
        showToast('warning', 'Sin contraseña visible', 'Se ejecutó la acción, pero no llegó contraseña temporal.');
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No fue posible restablecer la contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyTemporaryPassword = async () => {
    if (!temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(temporaryPassword);
      showToast('success', 'Contraseña copiada', 'La contraseña temporal se copió al portapapeles.');
    } catch {
      showToast('error', 'No se pudo copiar', 'Cópiala manualmente desde el panel.');
    }
  };

  const employeeName = toHumanName(employeeData?.full_name);
  const positionName = toHumanName(employeeData?.position_name, 'Sin puesto');
  const currentSystemRoles = normalizeRoleList(form.selectedSystemRoles);
  const departmentTone = getDepartmentTone(employeeData?.department_name);
  const photoSource = resolveAssetUrl(
    employeeData?.photo_url
    || employeeData?.photo_path
    || employeeData?.avatar_url
    || ''
  );
  const hasProfilePhoto = Boolean(normalizeText(employeeData?.photo_url || employeeData?.photo_path || employeeData?.avatar_url));
  const canManageProfilePhoto = Boolean(employeeData?.user_id || accountData?.user_id);
  const accountStatus = accountData
    ? getAccountStatusMeta(accountData.status)
    : { status: 'pending', label: 'Sin cuenta' };
  const employeeNumber = normalizeText(employeeData?.microsip_employee_number || employeeData?.internal_id) || 'Sin dato';
  const lastSessionLabel = accountData?.last_session_at
    ? new Date(accountData.last_session_at).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'short',
      timeStyle: 'short',
    })
    : 'Sin sesión';

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
            <article className="axis-account-drawer__hero">
              <p className="axis-account-drawer__hero-kicker">ID. EMPLEADO: {employeeNumber}</p>
              <StatusBadge
                status={accountStatus.status}
                label={accountStatus.label}
                className="axis-account-drawer__status axis-account-drawer__status--corner"
              />

              <div className="axis-account-drawer__hero-main">
                <div className={canManageProfilePhoto ? 'axis-account-drawer__avatar-shell is-photo-editable' : 'axis-account-drawer__avatar-shell'}>
                  <Avatar
                    initials={getInitials(employeeName, { fallback: 'AX' })}
                    name={employeeName}
                    src={photoSource}
                    size="2xl"
                    className="axis-account-drawer__avatar"
                    aria-hidden="true"
                  />

                  {canManageProfilePhoto ? (
                    <div className="axis-account-drawer__avatar-overlay">
                      <ProfilePhotoActions
                        className="axis-account-drawer__photo-actions"
                        variant="overlay"
                        currentImageUrl={photoSource}
                        disabled={submitting}
                        uploading={photoUploading}
                        removing={photoRemoving}
                        canRemove={hasProfilePhoto}
                        uploadLabel="Actualizar foto"
                        removeLabel="Quitar foto"
                        onUpload={handleUploadProfilePhoto}
                        onRemove={handleRemoveProfilePhoto}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="axis-account-drawer__employee-meta">
                  <h3>{employeeName}</h3>
                  <p>{positionName}</p>
                  <Badge
                    variant="neutral"
                    className={cn(
                      'axis-account-drawer__department-chip',
                      `employee-directory__department-tone--${departmentTone}`
                    )}
                  >
                    {toHumanName(employeeData.department_name)}
                  </Badge>
                </div>
              </div>

              <dl className="axis-account-drawer__hero-facts">
                <div className="axis-account-drawer__hero-fact axis-account-drawer__hero-fact--email">
                  <dt>Correo</dt>
                  <dd title={accountData?.email || 'Sin cuenta vinculada'}>{accountData?.email || 'Sin cuenta vinculada'}</dd>
                </div>
                <div className="axis-account-drawer__hero-fact">
                  <dt>Última sesión</dt>
                  <dd title={lastSessionLabel}>{lastSessionLabel}</dd>
                </div>
              </dl>
            </article>

            {!accountData ? (
              <section className="axis-account-drawer__section">
                <header className="axis-account-drawer__section-header">
                  <h4>Crear cuenta de acceso</h4>
                  <p>Vincula un correo corporativo y define roles de sistema.</p>
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
                    <p>Controla acceso y contraseña temporal.</p>
                  </header>

                  {temporaryPassword ? (
                    <div className="axis-account-drawer__temp-password">
                      <div className="axis-account-drawer__temp-password-head">
                        <p className="axis-account-drawer__temp-password-label">Contraseña temporal</p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyTemporaryPassword}
                        >
                          <Copy size={14} />
                          Copiar
                        </Button>
                      </div>
                      <code className="axis-account-drawer__temp-password-value">{temporaryPassword}</code>
                    </div>
                  ) : null}

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

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleResetPassword}
                      disabled={submitting}
                    >
                      <KeyRound size={16} />
                      {submitting ? 'Generando...' : 'Contraseña temporal'}
                    </Button>
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

export default AccountDrawer;
