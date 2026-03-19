# LINHER AXIS WebApp

Aplicacion interna HRIS para LINHER con integracion de solo lectura a Microsip.

## Arquitectura del monorepo

- `frontend/`: React + Vite (workspace UI).
- `backend/`: Node.js + Express + MySQL (API principal, auth, RBAC, sincronizacion).
- `microsip-bridge/`: servicio aislado que consulta Microsip (mock o DLL) y expone datasets normalizados.
- `database/`: esquema canonico, seeds y migraciones.

## Flujo tecnico (Bridge -> Backend -> Perfil 360)

1. El backend invoca al bridge con API key y `x-request-id`.
2. El bridge consulta Microsip y retorna colecciones normalizadas por dataset.
3. `MicrosipSyncService` hace upsert en tablas `ext_microsip_*` y mantiene `employee_microsip_links`.
4. Las APIs de perfil (`/api/me/profile`, `/api/employees/:id/profile-360`) leen snapshots locales en MySQL.
5. El frontend renderiza vistas de solo lectura (`Mi Perfil 360` y `Perfil de Colaborador`).

## Variables de entorno

### Backend (`backend/.env`)

- `PORT=5000`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `MICROSIP_CONNECTOR_ENABLED=true|false`
- `MICROSIP_CONNECTOR_URL=http://localhost:5101`
- `MICROSIP_CONNECTOR_API_KEY=<api-key>`
- `MICROSIP_SYNC_TIMEOUT_MS=20000`
- `MICROSIP_PAYROLL_RETENTION_MONTHS=24` (`0` desactiva limpieza historica)
- `MICROSIP_CONNECTOR_HEALTH_PATH=/health`
- `MICROSIP_CONNECTOR_DEPARTMENTS_PATH=/exports/departments`
- `MICROSIP_CONNECTOR_JOB_TITLES_PATH=/exports/job-titles`
- `MICROSIP_CONNECTOR_EMPLOYEES_PATH=/exports/employees`
- `MICROSIP_CONNECTOR_COUNTRIES_PATH=/exports/countries`
- `MICROSIP_CONNECTOR_STATES_PATH=/exports/states`
- `MICROSIP_CONNECTOR_CITIES_PATH=/exports/cities`
- `MICROSIP_CONNECTOR_PAYROLL_PAYMENTS_PATH=/exports/payroll-payments`

### Bridge (`microsip-bridge/.env`)

- `PORT=5101`
- `MICROSIP_DATA_MODE=mock|dll`
- `MICROSIP_CONNECTOR_REQUIRE_API_KEY=true|false`
- `MICROSIP_CONNECTOR_API_KEY=<api-key>`
- `MICROSIP_DLL_PATH=<ruta_a_ApiMicrosip.dll>`
- `MICROSIP_DATABASE_NAME=<ruta_o_alias_bd_firebird>`
- `MICROSIP_DATABASE_USER=<usuario_firebird>`
- `MICROSIP_DATABASE_PASSWORD=<password_firebird>`

## Contrato SQL del bridge por dataset

El adaptador PowerShell usa estas variables:

- `MICROSIP_SQL_DEPARTMENTS`
- `MICROSIP_SQL_JOB_TITLES`
- `MICROSIP_SQL_EMPLOYEES`
- `MICROSIP_SQL_COUNTRIES`
- `MICROSIP_SQL_STATES`
- `MICROSIP_SQL_CITIES`
- `MICROSIP_SQL_PAYROLL_PAYMENTS`

Y mapeo opcional de aliases por dataset:

- `MICROSIP_FIELDS_DEPARTMENTS`
- `MICROSIP_FIELDS_JOB_TITLES`
- `MICROSIP_FIELDS_EMPLOYEES`
- `MICROSIP_FIELDS_COUNTRIES`
- `MICROSIP_FIELDS_STATES`
- `MICROSIP_FIELDS_CITIES`
- `MICROSIP_FIELDS_PAYROLL_PAYMENTS`

Formato de mapeo soportado: `target:source,target2:source2`.

## Modos de sincronizacion

`POST /api/admin/microsip/sync` con `sync_type`:

- `full`
- `profile_full`
- `locations`
- `departments`
- `job_titles`
- `employees`
- `payroll`

Orden efectivo para `full/profile_full`:

- `locations -> departments -> job_titles -> employees -> payroll`

## Endpoints principales

### Perfil y pagos

- `GET /api/me/profile`
- `GET /api/me/payroll-payments?limit=&date_from=&date_to=`
- `GET /api/employees/:id/profile-360`
- `GET /api/employees/:id/payroll-payments?limit=&date_from=&date_to=`

### Integracion Microsip

- `GET /api/admin/microsip/health`
- `GET /api/admin/microsip/sync-logs?limit=`
- `GET /api/admin/microsip/employees?limit=`
- `POST /api/admin/microsip/sync`
- `POST /api/admin/microsip/reconcile-links`

## Politica de retencion de pagos (MVP)

- La retencion se controla con `MICROSIP_PAYROLL_RETENTION_MONTHS`.
- Valor por defecto recomendado: `24`.
- Valor `0`: no se elimina historial.
- La limpieza se ejecuta al final de cada sincronizacion que incluya dataset `payroll`.

## Matriz de permisos (MVP actual)

- `EMPLEADO`: `view_profile_self`, `view_payroll_self` (propio).
- `SUPERVISOR`: perfil de equipo en modo resumen (sin datos sensibles).
- `RRHH`: perfil y pagos completos de cualquier empleado.
- `ADMIN`: acceso completo.
- `RECLUTADOR`: sin acceso a datos administrativos de perfil/pagos.

## Troubleshooting rapido

### `Autenticacion requerida`

- Verifica `Authorization: Bearer <token>` en llamadas a `/api/*`.
- Confirma que `GET /api/auth/me` responde usuario activo.

### `MICROSIP_CONNECTOR_REQUEST_ERROR`

- Revisa que bridge este arriba (`GET http://localhost:5101/health`).
- Valida `MICROSIP_CONNECTOR_API_KEY` igual en backend y bridge.
- Revisa `MICROSIP_CONNECTOR_URL` y puertos.

### `MICROSIP_LINK_NOT_FOUND`

- El empleado interno aun no tiene enlace en `employee_microsip_links`.
- Ejecuta sync de `employees` o `full/profile_full` y confirma `employee_number` contra `employees.internal_id`.

### Respuesta vacia en bridge (`items: []`)

- Verifica SQL del dataset en `MICROSIP_SQL_*`.
- Revisa aliases en `MICROSIP_FIELDS_*`.
- Confirma que la conexion Firebird y la ruta de BD sean correctas.

## Comandos utiles

- `npm run dev` (backend + frontend)
- `npm run dev:full` (backend + frontend + bridge)
- `npm run lint`
- `npm run build --prefix frontend`

## Scripts SQL de soporte

- `database/migration.sql`: migracion incremental idempotente para bases existentes.
- `database/reset_microsip_data.sql`: limpia snapshots/extensiones de Microsip para reiniciar sincronizacion sin borrar usuarios/roles.
