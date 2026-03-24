import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronRight, UserCircle2, Users } from 'lucide-react';
import { Card, StatusBadge, StatusView } from '../components/ui';
import api from '../services/api';

const DEPTH_CLASS_MAP = [
  'organization-unit-depth-0',
  'organization-unit-depth-1',
  'organization-unit-depth-2',
  'organization-unit-depth-3',
  'organization-unit-depth-4',
  'organization-unit-depth-5',
];

const getDepthClass = (depth) => DEPTH_CLASS_MAP[Math.min(depth, DEPTH_CLASS_MAP.length - 1)];

const flattenTree = (nodes = [], depth = 0) => (
  nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenTree(node.children || [], depth + 1),
  ])
);

const OrganizationStructure = () => {
  const [structure, setStructure] = useState({ tree: [], units: [], unit_types: [] });
  const [structureLoading, setStructureLoading] = useState(true);
  const [structureError, setStructureError] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedUnitDetails, setSelectedUnitDetails] = useState(null);
  const [unitLoading, setUnitLoading] = useState(false);
  const [unitError, setUnitError] = useState('');

  const flatUnits = useMemo(() => flattenTree(structure.tree || []), [structure.tree]);

  useEffect(() => {
    let active = true;

    const loadStructure = async () => {
      setStructureLoading(true);
      setStructureError('');

      try {
        const { data } = await api.get('/organization/structure');
        if (!active) return;

        setStructure(data || { tree: [], units: [], unit_types: [] });
        const initialUnitId = data?.tree?.[0]?.id || data?.units?.[0]?.id || null;
        setSelectedUnitId(initialUnitId);
      } catch (error) {
        if (!active) return;
        setStructureError(error?.response?.data?.message || 'No fue posible cargar la estructura organizacional.');
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
        if (!active) return;
        setSelectedUnitDetails(data);
      } catch (error) {
        if (!active) return;
        setUnitError(error?.response?.data?.message || 'No fue posible cargar el detalle de la unidad.');
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
    <section className="organization-structure">
      {structureLoading ? (
        <Card>
          <p className="organization-structure__loading">Cargando estructura organizacional...</p>
        </Card>
      ) : null}

      {!structureLoading && structureError ? (
        <StatusView title="No se pudo cargar la estructura" description={structureError} />
      ) : null}

      {!structureLoading && !structureError ? (
        <div className="organization-structure__grid">
          <aside className="organization-structure__aside">
            <Card title="Empresa">
              <div className="organization-company-box">
                <p className="organization-company-box__name">LINHER</p>
                <p className="organization-company-box__meta">8 departamentos activos</p>
              </div>
            </Card>

            <Card title="Mapa organizacional">
              {flatUnits.length === 0 ? (
                <StatusView
                  title="Estructura no configurada"
                  description="Aún no existen unidades organizacionales cargadas."
                />
              ) : (
                <ul className="organization-unit-list">
                  {flatUnits.map((unit) => {
                    const isSelected = selectedUnitId === unit.id;
                    return (
                      <li key={unit.id} className="organization-unit-item">
                        <button
                          type="button"
                          onClick={() => setSelectedUnitId(unit.id)}
                          className={`organization-unit-button ${isSelected ? 'is-selected' : ''}`}
                        >
                          <div
                            className={`organization-unit-main ${getDepthClass(unit.depth)} ${isSelected ? 'is-selected' : ''}`}
                          >
                            <ChevronRight size={14} aria-hidden="true" />
                            <div>
                              <p className="organization-unit-name">{unit.name}</p>
                              <p className="organization-unit-type">{unit.type_name}</p>
                            </div>
                          </div>

                          <span className="organization-unit-count">
                            <Users size={13} />
                            {unit.member_count}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </aside>

          <div className="organization-structure__detail">
            {!selectedUnitId ? (
              <StatusView
                title="Selecciona una unidad"
                description="Elige empresa, departamento o equipo para ver responsables e integrantes."
              />
            ) : null}

            {selectedUnitId && unitLoading ? (
              <Card>
                <p className="organization-structure__loading">Cargando detalle de unidad...</p>
              </Card>
            ) : null}

            {selectedUnitId && !unitLoading && unitError ? (
              <StatusView title="No se pudo cargar la unidad" description={unitError} />
            ) : null}

            {selectedUnitId && !unitLoading && !unitError && selectedUnitDetails ? (
              <>
                <Card
                  title={selectedUnitDetails.unit.name}
                  actions={(
                    <StatusBadge
                      status={selectedUnitDetails.unit.is_active ? 'approved' : 'inactive'}
                      label={selectedUnitDetails.unit.is_active ? 'Activa' : 'Inactiva'}
                      showDot
                    />
                  )}
                >
                  <div className="organization-stat-grid">
                    <article className="organization-stat-card">
                      <p className="organization-stat-card__label">Responsable del equipo</p>
                      <p className="organization-stat-card__value">
                        {selectedUnitDetails.unit.lead_name || 'Sin responsable asignado'}
                      </p>
                    </article>

                    <article className="organization-stat-card">
                      <p className="organization-stat-card__label">Resumen</p>
                      <p className="organization-stat-card__meta">
                        <b>{selectedUnitDetails.unit.member_count}</b> integrantes activos
                      </p>
                      <p className="organization-stat-card__meta">
                        Código: <b>{selectedUnitDetails.unit.code || 'Sin código'}</b>
                      </p>
                    </article>
                  </div>
                </Card>

                <Card title="Integrantes">
                  {selectedUnitDetails.members?.length ? (
                    <div className="organization-members-grid">
                      {selectedUnitDetails.members.map((member) => (
                        <article key={member.id} className="organization-member-card">
                          <div className="organization-member-header">
                            <span className="organization-member-avatar">
                              <UserCircle2 size={17} />
                            </span>
                            <div>
                              <p className="organization-member-name">
                                {member.first_name} {member.last_name}
                              </p>
                              <p className="organization-member-role">{member.position_name || 'Sin puesto asignado'}</p>
                              <p className="organization-member-meta">
                                Rol en unidad: <b>{member.role_in_unit || 'Colaborador'}</b>
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="organization-structure__loading">Esta unidad aún no tiene integrantes activos.</p>
                  )}
                </Card>

                <Card title="Relaciones">
                  <div className="organization-stat-grid">
                    <article className="organization-stat-card">
                      <p className="organization-stat-card__label">Unidad padre</p>
                      <p className="organization-stat-card__value">{selectedUnitDetails.parent?.name || 'Sin unidad padre'}</p>
                    </article>

                    <article className="organization-stat-card">
                      <p className="organization-stat-card__label">Unidades hijas</p>
                      {selectedUnitDetails.children?.length ? (
                        <ul className="organization-children">
                          {selectedUnitDetails.children.map((child) => (
                            <li key={child.id} className="organization-child-item">
                              <Building2 size={14} />
                              <span>{child.name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="organization-stat-card__meta">Sin unidades hijas registradas.</p>
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
