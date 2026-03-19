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
  if (Number.isNaN(parsedDate.getTime())) return 'Fecha invalida';
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
    <section>
      <PageHeader
        title="Integración Microsip"
        subtitle="Monitorea conectividad, ejecuta sincronizaciones y revisa bitácora de ejecuciones."
        actions={(
          <Button
            type="button"
            variant="secondary"
            className="min-w-[172px] border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
            onClick={() => loadMicrosipAdminData({ silent: true })}
            disabled={refreshing || loading || runningSync || reconcilingLinks}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Actualizando...' : 'Actualizar estado'}
          </Button>
        )}
      />

      {loadError ? (
        <Alert variant="error" title="Error al cargar integración" className="mb-6">
          {loadError}
        </Alert>
      ) : null}

      {loading ? (
        <Card>
          <p className="text-sm text-ui-text-secondary">Cargando panel de integración...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card
              title="Estado del conector"
              subtitle="Disponibilidad del bridge y configuración activa."
              actions={(
                <StatusBadge
                  status={connectorBadge.status}
                  label={connectorBadge.label}
                  showDot
                />
              )}
            >
              <div className="space-y-3 text-sm text-ui-text-secondary">
                <p>
                  Modo:
                  {' '}
                  <span className="font-semibold text-ui-dark-navy">
                    {connector?.mode || 'Sin información'}
                  </span>
                </p>
                <p>
                  Upstream:
                  {' '}
                  <span className="font-semibold text-ui-dark-navy">
                    {connector?.upstream?.status || 'Sin respuesta'}
                  </span>
                </p>
                <p>
                  Mensaje:
                  {' '}
                  <span className="font-semibold text-ui-dark-navy">
                    {connector?.message || connector?.upstream?.message || 'Operativo'}
                  </span>
                </p>
              </div>
            </Card>

            <Card
              title="Política de retención"
              subtitle="Controla limpieza automática del historial de pagos sincronizados."
            >
              <div className="space-y-3 text-sm text-ui-text-secondary">
                <p>
                  Meses de retención:
                  {' '}
                  <span className="font-semibold text-ui-dark-navy">
                    {retentionPolicy?.payroll_retention_months ?? 24}
                  </span>
                </p>
                <p>
                  Limpieza automática:
                  {' '}
                  <span className="font-semibold text-ui-dark-navy">
                    {retentionPolicy?.payroll_prune_enabled ? 'Activa' : 'Deshabilitada'}
                  </span>
                </p>
                <p>
                  Nota:
                  {' '}
                  <span className="font-semibold text-ui-dark-navy">
                    {retentionPolicy?.notes || 'Se aplica al cierre de cada sincronización con pagos.'}
                  </span>
                </p>
              </div>
            </Card>

            <Card
              title="Última sincronización"
              subtitle="Resumen de la ejecución más reciente."
              actions={latestSyncLog ? (
                <StatusBadge
                  status={toBadgeStatus(latestSyncLog.status_code)}
                  label={toStatusLabel(latestSyncLog.status_code, latestSyncLog.status_label || 'Sin estado')}
                  showDot
                />
              ) : null}
            >
              {latestSyncLog ? (
                <div className="grid gap-3 text-sm text-ui-text-secondary sm:grid-cols-2">
                  <p>
                    Tipo:
                    {' '}
                    <span className="font-semibold text-ui-dark-navy">{latestSyncLog.sync_type}</span>
                  </p>
                  <p>
                    Inicio:
                    {' '}
                    <span className="font-semibold text-ui-dark-navy">{formatDateTime(latestSyncLog.started_at)}</span>
                  </p>
                  <p>
                    Fin:
                    {' '}
                    <span className="font-semibold text-ui-dark-navy">{formatDateTime(latestSyncLog.finished_at)}</span>
                  </p>
                  <p>
                    Duracion:
                    {' '}
                    <span className="font-semibold text-ui-dark-navy">
                      {formatDuration(latestSyncLog.started_at, latestSyncLog.finished_at)}
                    </span>
                  </p>
                  <p>
                    Registros:
                    {' '}
                    <span className="font-semibold text-ui-dark-navy">{latestSyncLog.records_total || 0}</span>
                  </p>
                  <p>
                    Fallidos:
                    {' '}
                    <span className="font-semibold text-ui-dark-navy">{latestSyncLog.records_failed || 0}</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ui-text-secondary">Todavía no hay sincronizaciones registradas.</p>
              )}
            </Card>
          </div>

          <Card title="Ejecución manual" subtitle="Lanza sincronizaciones puntuales bajo demanda.">
            <div className="grid gap-4 md:grid-cols-[minmax(260px,360px)_auto] md:items-end">
              <CustomSelect
                id="microsip-sync-type"
                name="microsip_sync_type"
                label="Tipo de sincronización"
                value={syncType}
                onChange={(event) => setSyncType(event.target.value)}
                options={SYNC_TYPE_OPTIONS}
              />

              <Button
                type="button"
                onClick={handleSyncSubmit}
                disabled={runningSync || refreshing || reconcilingLinks}
              >
                {runningSync ? 'Ejecutando...' : 'Ejecutar sincronización'}
              </Button>
            </div>
          </Card>

          <Card title="Conciliación AXIS y Microsip" subtitle="Vincula empleados internos con snapshots externos por employee_number.">
            <div className="grid gap-4 md:grid-cols-[minmax(260px,360px)_auto] md:items-end">
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
            <p className="mt-4 text-xs text-ui-text-secondary">
              Usa simulación para revisar impacto antes de ejecutar cambios en la base interna.
            </p>
          </Card>

          <Card title="Bitácora de sincronización" subtitle="Historial reciente de ejecuciones.">
            {syncLogs.length === 0 ? (
              <StatusView
                title="Sin bitácora disponible"
                description="Cuando se ejecuten sincronizaciones, aquí verás el historial y su resultado."
                className="min-h-[180px]"
              />
            ) : (
              <TableShell>
                <Table>
                  <TableCaption>Bitácora de sincronizaciones de Microsip</TableCaption>
                  <TableHead>
                    <TableRow className="hover:bg-transparent">
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
                      <TableEmptyState colSpan={8}>
                        No hay eventos de sincronización registrados.
                      </TableEmptyState>
                    ) : (
                      syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-semibold text-ui-dark-navy">{log.id}</TableCell>
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
        containerClassName="left-4 right-4 top-auto bottom-4 sm:left-auto sm:right-6 sm:bottom-6"
      />
    </section>
  );
};

export default MicrosipAdmin;


