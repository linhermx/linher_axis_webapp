import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronRight, UserCircle2, Users } from 'lucide-react';
import EmployeeModuleNav from '../components/EmployeeModuleNav';
import { Card, PageHeader, StatusBadge, StatusView } from '../components/ui';
import { cn } from '../lib/cn';
import api from '../services/api';

const DEPTH_CLASS_MAP = [
  'pl-2',
  'pl-6',
  'pl-10',
  'pl-14',
  'pl-16',
];

const getDepthClass = (depth) => (
  DEPTH_CLASS_MAP[Math.min(depth, DEPTH_CLASS_MAP.length - 1)]
);

const flattenTree = (nodes = [], depth = 0) => (
  nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenTree(node.children || [], depth + 1),
  ])
);

const OrganizationStructure = () => {
  const [structure, setStructure] = useState({
    tree: [],
    units: [],
    unit_types: [],
  });
  const [structureLoading, setStructureLoading] = useState(true);
  const [structureError, setStructureError] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedUnitDetails, setSelectedUnitDetails] = useState(null);
  const [unitLoading, setUnitLoading] = useState(false);
  const [unitError, setUnitError] = useState('');

  const flatUnits = useMemo(
    () => flattenTree(structure.tree || []),
    [structure.tree]
  );

  useEffect(() => {
    let active = true;

    const loadStructure = async () => {
      setStructureLoading(true);
      setStructureError('');

      try {
        const { data } = await api.get('/organization/structure');
        if (!active) {
          return;
        }

        setStructure(data || { tree: [], units: [], unit_types: [] });
        const initialUnitId = data?.tree?.[0]?.id || data?.units?.[0]?.id || null;
        setSelectedUnitId(initialUnitId);
      } catch (error) {
        if (!active) {
          return;
        }

        setStructureError(error?.response?.data?.message || 'No fue posible cargar la estructura organizacional');
      } finally {
        if (active) {
          setStructureLoading(false);
        }
      }
    };

    loadStructure();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadSelectedUnit = async () => {
      if (!selectedUnitId) {
        setSelectedUnitDetails(null);
        return;
      }

      setUnitLoading(true);
      setUnitError('');

      try {
        const { data } = await api.get(`/organization/units/${selectedUnitId}`);
        if (!active) {
          return;
        }

        setSelectedUnitDetails(data);
      } catch (error) {
        if (!active) {
          return;
        }

        setUnitError(error?.response?.data?.message || 'No fue posible cargar el detalle de la unidad');
        setSelectedUnitDetails(null);
      } finally {
        if (active) {
          setUnitLoading(false);
        }
      }
    };

    loadSelectedUnit();

    return () => {
      active = false;
    };
  }, [selectedUnitId]);

  return (
    <section>
      <PageHeader
        title="Estructura Organizacional"
        subtitle="Navega la estructura empresa-departamentos-equipos en vista maestro-detalle."
      >
        <EmployeeModuleNav />
      </PageHeader>

      {structureLoading ? (
        <Card>
          <p className="text-sm text-ui-text-secondary">Cargando estructura organizacional...</p>
        </Card>
      ) : null}

      {!structureLoading && structureError ? (
        <StatusView
          title="No se pudo cargar la estructura"
          description={structureError}
        />
      ) : null}

      {!structureLoading && !structureError ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(320px,360px)_1fr]">
          <Card
            title="Mapa Organizacional"
            subtitle="Selecciona una unidad para ver su detalle."
            className="h-fit"
          >
            {flatUnits.length === 0 ? (
              <StatusView
                title="Estructura no configurada"
                description="Aún no existen unidades organizacionales cargadas."
              />
            ) : (
              <ul className="space-y-2">
                {flatUnits.map((unit) => (
                  <li key={unit.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={cn(
                        'w-full rounded-md border px-2 py-2 text-left transition-colors',
                        selectedUnitId === unit.id
                          ? 'border-brand-primary bg-brand-primary/5'
                          : 'border-ui-light-slate hover:border-brand-primary/50 hover:bg-ui-surface-subtle'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className={cn('flex min-w-0 items-center gap-2', getDepthClass(unit.depth))}>
                          <ChevronRight
                            size={14}
                            className={cn(
                              'shrink-0',
                              selectedUnitId === unit.id ? 'text-brand-primary' : 'text-ui-text-secondary'
                            )}
                            aria-hidden="true"
                          />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ui-dark-navy">{unit.name}</p>
                            <p className="text-xs text-ui-text-secondary">{unit.type_name}</p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ui-text-secondary">
                          <Users size={13} />
                          {unit.member_count}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="space-y-6">
            {!selectedUnitId ? (
              <StatusView
                title="Selecciona una unidad"
                description="Elige empresa, departamento o equipo para ver responsables e integrantes."
              />
            ) : null}

            {selectedUnitId && unitLoading ? (
              <Card>
                <p className="text-sm text-ui-text-secondary">Cargando detalle de unidad...</p>
              </Card>
            ) : null}

            {selectedUnitId && !unitLoading && unitError ? (
              <StatusView
                title="No se pudo cargar la unidad"
                description={unitError}
              />
            ) : null}

            {selectedUnitId && !unitLoading && !unitError && selectedUnitDetails ? (
              <>
                <Card
                  title={selectedUnitDetails.unit.name}
                  subtitle={selectedUnitDetails.unit.type_name}
                  actions={(
                    <StatusBadge
                      status={selectedUnitDetails.unit.is_active ? 'approved' : 'inactive'}
                      label={selectedUnitDetails.unit.is_active ? 'Activa' : 'Inactiva'}
                      showDot
                    />
                  )}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-md border border-ui-light-slate bg-ui-surface-subtle p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ui-text-secondary">Responsable</p>
                      <p className="mt-2 text-sm font-semibold text-ui-dark-navy">
                        {selectedUnitDetails.unit.lead_name || 'Sin responsable asignado'}
                      </p>
                    </article>

                    <article className="rounded-md border border-ui-light-slate bg-ui-surface-subtle p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ui-text-secondary">Resumen</p>
                      <p className="mt-2 text-sm text-ui-text-secondary">
                        <span className="font-semibold text-ui-dark-navy">{selectedUnitDetails.unit.member_count}</span>
                        {' '}
                        integrantes activos
                      </p>
                      <p className="mt-1 text-sm text-ui-text-secondary">
                        Código:
                        {' '}
                        <span className="font-semibold text-ui-dark-navy">
                          {selectedUnitDetails.unit.code || 'Sin código'}
                        </span>
                      </p>
                    </article>
                  </div>
                </Card>

                <Card
                  title="Integrantes"
                  subtitle="Equipo activo asociado a la unidad."
                >
                  {selectedUnitDetails.members?.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {selectedUnitDetails.members.map((member) => (
                        <article
                          key={member.id}
                          className="rounded-md border border-ui-light-slate bg-ui-background p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-full bg-ui-surface-subtle p-2 text-ui-text-secondary">
                              <UserCircle2 size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ui-dark-navy">
                                {member.first_name}
                                {' '}
                                {member.last_name}
                              </p>
                              <p className="text-xs text-ui-text-secondary">{member.position_name || 'Sin puesto asignado'}</p>
                              <p className="mt-2 text-xs text-ui-text-secondary">
                                Rol en unidad:
                                {' '}
                                <span className="font-semibold text-ui-dark-navy">{member.role_in_unit || 'Colaborador'}</span>
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ui-text-secondary">
                      Esta unidad aún no tiene integrantes activos.
                    </p>
                  )}
                </Card>

                <Card
                  title="Relaciones"
                  subtitle="Conexiones jerárquicas de esta unidad."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-md border border-ui-light-slate bg-ui-background p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ui-text-secondary">Unidad padre</p>
                      <p className="mt-2 text-sm font-semibold text-ui-dark-navy">
                        {selectedUnitDetails.parent?.name || 'Sin unidad padre'}
                      </p>
                    </article>

                    <article className="rounded-md border border-ui-light-slate bg-ui-background p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ui-text-secondary">Unidades hijas</p>
                      {selectedUnitDetails.children?.length ? (
                        <ul className="mt-2 space-y-1">
                          {selectedUnitDetails.children.map((child) => (
                            <li key={child.id} className="flex items-center gap-2 text-sm text-ui-dark-navy">
                              <Building2 size={14} className="text-ui-text-secondary" />
                              <span>{child.name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-ui-text-secondary">Sin unidades hijas registradas.</p>
                      )}
                    </article>
                  </div>
                </Card>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default OrganizationStructure;
