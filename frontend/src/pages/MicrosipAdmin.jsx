import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CustomSelect,
  NotificationToast,
  PageHeader,
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
} from '../components/ui';
import api from '../services/api';

const SYNC_TYPE_OPTIONS = [
  { value: 'full', label: 'Sincronización completa' },
  { value: 'profile_full', label: 'Perfil 360 completo' },
  { value: 'locations', label: 'Solo ubicaciones' },
  { value: 'departments', label: 'Solo departamentos' },
  { value: 'job_titles', label: 'Solo puestos' },
  { value: 'employees', label: 'Solo empleados' },
  { value: 'payroll', label: 'Solo pagos de nómina' },
];

const RECONCILE_MODE_OPTIONS = [
  { value: 'dry_run', label: 'Simulación (sin cambios)' },
  { value: 'apply', label: 'Ejecución real' },
];

const STATUS_LABEL_MAP = {
  pending: 'Pendiente',
  running: 'En progreso',
  success: 'Exitoso',
  failed: 'Fallido',
};

const toBadgeStatus = (statusCode) => {
  const normalized = String(statusCode || '').trim().toLowerCase();
  if (normalized === 'running') return 'in_progress';
  if (normalized === 'success') return 'success';
  if (normalized === 'failed') return 'failed';
  if (normalized === 'pending') return 'pending';
  return 'info';
};

const toStatusLabel = (statusCode, fallback = 'Sin estado') => (
  STATUS_LABEL_MAP[String(statusCode || '').trim().toLowerCase()] || fallback
);

const formatDateTime = (value) => {
  if (!value) return 'Sin fecha';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return 'Fecha inválida';
  return parsedDate.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
};

const formatDuration = (startedAt, finishedAt) => {
  if (!startedAt || !finishedAt) return 'En ejecución';
  const startTime = new Date(startedAt).getTime();
  const endTime = new Date(finishedAt).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) return 'N/A';

  const seconds = Math.round((endTime - startTime) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const MicrosipAdmin = () => {
  const [healthPayload, setHealthPayload] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [syncType, setSyncType] = useState('full');
  const [reconcileMode, setReconcileMode] = useState('dry_run');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningSync, setRunningSync] = useState(false);
  const [reconcilingLinks, setReconcilingLinks] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState({
    open: false,
    title: '',
    message: '',
    variant: 'info',
  });

  const connector = healthPayload?.connector || null;
  const latestSyncLog = healthPayload?.latest_sync_log || null;
  const retentionPolicy = healthPayload?.retention_policy || null;

  const connectorBadge = useMemo(() => {
    if (!connector) {
      return { status: 'pending', label: 'Sin datos' };
    }

    if (connector.mode === 'disabled' || connector.ok === false) {
      return { status: 'failed', label: 'Deshabilitado' };
    }

    return { status: 'success', label: 'Conectado' };
  }, [connector]);

  const loadMicrosipAdminData = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError('');

    try {
      const [healthResponse, logsResponse] = await Promise.all([
        api.get('/admin/microsip/health'),
        api.get('/admin/microsip/sync-logs?limit=20'),
      ]);

      setHealthPayload(healthResponse.data || null);
      setSyncLogs(Array.isArray(logsResponse.data?.data) ? logsResponse.data.data : []);
    } catch (error) {
      setLoadError(error?.response?.data?.message || 'No fue posible cargar el panel de integración Microsip.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMicrosipAdminData();
  }, [loadMicrosipAdminData]);

  const showToast = (variant, title, message) => {
    setToast({ open: true, variant, title, message });
  };

  const closeToast = () => {
    setToast((current) => ({ ...current, open: false }));
  };

  const handleSyncSubmit = async () => {
    setRunningSync(true);

    try {
      const { data } = await api.post('/admin/microsip/sync', { sync_type: syncType });
      showToast(
        data?.status === 'failed' ? 'warning' : 'success',
        'Sincronización ejecutada',
        `Procesados ${data?.processed || 0} de ${data?.total || 0} registros.`
      );
      await loadMicrosipAdminData({ silent: true });
    } catch (error) {
      showToast(
        'error',
        'No se pudo ejecutar la sincronización',
        error?.response?.data?.message || 'Error inesperado durante la sincronización.'
      );
    } finally {
      setRunningSync(false);
    }
  };

  const handleReconcileLinksSubmit = async () => {
    setReconcilingLinks(true);

    try {
      const { data } = await api.post('/admin/microsip/reconcile-links', {
        dry_run: reconcileMode === 'dry_run',
        create_missing_employees: true,
        create_missing_jobs: true,
        limit: 1000,
      });

      const reconcileResult = data?.data || {};
      showToast(
        'success',
        reconcileMode === 'dry_run' ? 'Simulación completada' : 'Conciliación completada',
        `Revisados ${reconcileResult.scanned || 0} registros. Vinculados: ${reconcileResult.linked_now || 0}.`
      );
      await loadMicrosipAdminData({ silent: true });
    } catch (error) {
      showToast(
        'error',
        'No se pudo conciliar enlaces',
        error?.response?.data?.message || 'Error inesperado durante la conciliación.'
      );
    } finally {
      setReconcilingLinks(false);
    }
  };

  return (
    <section className="microsip-admin">
      <PageHeader
        title="Integración Microsip"
        actions={(
          <Button
            type="button"
            variant="secondary"
            onClick={() => loadMicrosipAdminData({ silent: true })}
            disabled={refreshing || loading || runningSync || reconcilingLinks}
          >
            <RefreshCw size={15} className={refreshing ? 'microsip-admin__spin' : ''} />
            {refreshing ? 'Actualizando...' : 'Actualizar estado'}
          </Button>
        )}
      />

      {loadError ? (
        <Alert variant="error" title="Error al cargar integración">
          {loadError}
        </Alert>
      ) : null}

      {loading ? (
        <Card>
          <p className="microsip-admin__loading">Cargando panel de integración...</p>
        </Card>
      ) : (
        <div className="microsip-admin__stack">
          <div className="microsip-admin__grid">
            <Card
              title="Estado del conector"
              actions={<StatusBadge status={connectorBadge.status} label={connectorBadge.label} showDot />}
            >
              <div className="microsip-admin__meta-list">
                <p>Modo: <b>{connector?.mode || 'Sin información'}</b></p>
                <p>Upstream: <b>{connector?.upstream?.status || 'Sin respuesta'}</b></p>
                <p>Mensaje: <b>{connector?.message || connector?.upstream?.message || 'Operativo'}</b></p>
              </div>
            </Card>

            <Card title="Política de retención">
              <div className="microsip-admin__meta-list">
                <p>Meses de retención: <b>{retentionPolicy?.payroll_retention_months ?? 24}</b></p>
                <p>Limpieza automática: <b>{retentionPolicy?.payroll_prune_enabled ? 'Activa' : 'Deshabilitada'}</b></p>
                <p>Nota: <b>{retentionPolicy?.notes || 'Se aplica al cierre de cada sincronización con pagos.'}</b></p>
              </div>
            </Card>

            <Card
              title="Última sincronización"
              actions={latestSyncLog ? (
                <StatusBadge
                  status={toBadgeStatus(latestSyncLog.status_code)}
                  label={toStatusLabel(latestSyncLog.status_code, latestSyncLog.status_label || 'Sin estado')}
                  showDot
                />
              ) : null}
            >
              {latestSyncLog ? (
                <div className="microsip-admin__metrics">
                  <p className="microsip-admin__meta-item">Tipo: <b>{latestSyncLog.sync_type}</b></p>
                  <p className="microsip-admin__meta-item">Inicio: <b>{formatDateTime(latestSyncLog.started_at)}</b></p>
                  <p className="microsip-admin__meta-item">Fin: <b>{formatDateTime(latestSyncLog.finished_at)}</b></p>
                  <p className="microsip-admin__meta-item">Duración: <b>{formatDuration(latestSyncLog.started_at, latestSyncLog.finished_at)}</b></p>
                  <p className="microsip-admin__meta-item">Registros: <b>{latestSyncLog.records_total || 0}</b></p>
                  <p className="microsip-admin__meta-item">Fallidos: <b>{latestSyncLog.records_failed || 0}</b></p>
                </div>
              ) : (
                <p className="microsip-admin__loading">Todavía no hay sincronizaciones registradas.</p>
              )}
            </Card>
          </div>

          <Card title="Ejecución manual">
            <div className="microsip-admin__form-grid">
              <CustomSelect
                id="microsip-sync-type"
                name="microsip_sync_type"
                label="Tipo de sincronización"
                value={syncType}
                onChange={(event) => setSyncType(event.target.value)}
                options={SYNC_TYPE_OPTIONS}
              />

              <Button type="button" onClick={handleSyncSubmit} disabled={runningSync || refreshing || reconcilingLinks}>
                {runningSync ? 'Ejecutando...' : 'Ejecutar sincronización'}
              </Button>
            </div>
          </Card>

          <Card title="Conciliación AXIS y Microsip">
            <div className="microsip-admin__form-grid">
              <CustomSelect
                id="microsip-reconcile-mode"
                name="microsip_reconcile_mode"
                label="Modo de conciliación"
                value={reconcileMode}
                onChange={(event) => setReconcileMode(event.target.value)}
                options={RECONCILE_MODE_OPTIONS}
              />

              <Button
                type="button"
                variant="secondary"
                onClick={handleReconcileLinksSubmit}
                disabled={reconcilingLinks || runningSync || refreshing}
              >
                {reconcilingLinks ? 'Conciliando...' : 'Conciliar enlaces'}
              </Button>
            </div>
            <p className="microsip-admin__hint">
              Usa simulación para revisar impacto antes de ejecutar cambios en la base interna.
            </p>
          </Card>

          <Card title="Bitácora de sincronización" className="microsip-admin__logs-card">
            {syncLogs.length === 0 ? (
              <StatusView
                title="Sin bitácora disponible"
                description="Cuando se ejecuten sincronizaciones, aquí verás el historial y su resultado."
              />
            ) : (
              <TableShell>
                <Table>
                  <TableCaption>Bitácora de sincronizaciones de Microsip</TableCaption>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell scope="col">ID</TableHeaderCell>
                      <TableHeaderCell scope="col">Tipo</TableHeaderCell>
                      <TableHeaderCell scope="col">Estado</TableHeaderCell>
                      <TableHeaderCell scope="col">Inicio</TableHeaderCell>
                      <TableHeaderCell scope="col">Fin</TableHeaderCell>
                      <TableHeaderCell scope="col">Total</TableHeaderCell>
                      <TableHeaderCell scope="col">Procesados</TableHeaderCell>
                      <TableHeaderCell scope="col">Fallidos</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {syncLogs.length === 0 ? (
                      <TableEmptyState colSpan={8}>No hay eventos de sincronización registrados.</TableEmptyState>
                    ) : (
                      syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.id}</TableCell>
                          <TableCell>{log.sync_type}</TableCell>
                          <TableCell>
                            <StatusBadge
                              status={toBadgeStatus(log.status_code)}
                              label={toStatusLabel(log.status_code, log.status_label || 'Sin estado')}
                              showDot
                            />
                          </TableCell>
                          <TableCell>{formatDateTime(log.started_at)}</TableCell>
                          <TableCell>{formatDateTime(log.finished_at)}</TableCell>
                          <TableCell>{log.records_total || 0}</TableCell>
                          <TableCell>{log.records_processed || 0}</TableCell>
                          <TableCell>{log.records_failed || 0}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableShell>
            )}
          </Card>
        </div>
      )}

      <NotificationToast
        open={toast.open}
        title={toast.title}
        message={toast.message}
        variant={toast.variant}
        duration={3200}
        onClose={closeToast}
      />
    </section>
  );
};

export default MicrosipAdmin;
