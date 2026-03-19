import pool from '../config/db.js';
import { SystemLogger } from '../utils/SystemLogger.js';
import { handleControllerError, sendError } from '../utils/ApiError.js';

const logger = new SystemLogger(pool);

const parseRequiredId = (value) => {
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue <= 0) {
        return null;
    }

    return numericValue;
};

const normalizeUnit = (row) => ({
    id: Number(row.id),
    unit_type_id: Number(row.unit_type_id),
    type_code: row.type_code,
    type_name: row.type_name,
    name: row.name,
    code: row.code,
    lead_employee_id: row.lead_employee_id ? Number(row.lead_employee_id) : null,
    lead_name: row.lead_name || null,
    is_active: Number(row.is_active) === 1,
    member_count: Number(row.member_count || 0),
});

const buildTree = (units, relations) => {
    const nodeById = new Map(units.map((unit) => [unit.id, { ...unit, children: [] }]));
    const childIds = new Set();

    relations.forEach((relation) => {
        const parentNode = nodeById.get(Number(relation.parent_unit_id));
        const childNode = nodeById.get(Number(relation.child_unit_id));

        if (!parentNode || !childNode) {
            return;
        }

        parentNode.children.push(childNode);
        childIds.add(childNode.id);
    });

    return units
        .filter((unit) => !childIds.has(unit.id))
        .map((unit) => nodeById.get(unit.id));
};

export const getOrganizationStructure = async (req, res) => {
    try {
        const [unitTypeRows] = await pool.query(
            `SELECT id, code, name, description, sort_order
             FROM organizational_unit_types
             ORDER BY sort_order ASC, id ASC`
        );

        const [unitRows] = await pool.query(
            `SELECT
                ou.id,
                ou.unit_type_id,
                outype.code AS type_code,
                outype.name AS type_name,
                ou.name,
                ou.code,
                ou.lead_employee_id,
                CONCAT_WS(' ', lead_emp.first_name, lead_emp.last_name) AS lead_name,
                ou.is_active,
                COALESCE(member_totals.total, 0) AS member_count
             FROM organizational_units ou
             JOIN organizational_unit_types outype ON outype.id = ou.unit_type_id
             LEFT JOIN employees lead_emp ON lead_emp.id = ou.lead_employee_id
             LEFT JOIN (
                SELECT unit_id, COUNT(*) AS total
                FROM organizational_unit_members
                WHERE ended_at IS NULL OR ended_at >= CURDATE()
                GROUP BY unit_id
             ) AS member_totals ON member_totals.unit_id = ou.id
             ORDER BY outype.sort_order ASC, ou.name ASC`
        );

        const [relationRows] = await pool.query(
            `SELECT parent_unit_id, child_unit_id, relation_type
             FROM organizational_unit_relations
             WHERE relation_type = 'hierarchy'
             ORDER BY parent_unit_id ASC, child_unit_id ASC`
        );

        const units = unitRows.map(normalizeUnit);
        const tree = buildTree(units, relationRows);

        return res.json({
            unit_types: unitTypeRows,
            units,
            relations: relationRows,
            tree,
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'ORGANIZATION_STRUCTURE_FETCH_ERROR',
            message: 'Error al cargar estructura organizacional',
        });
    }
};

export const getOrganizationUnit = async (req, res) => {
    const unitId = parseRequiredId(req.params.id);
    if (!unitId) {
        return sendError(res, 400, 'ID de unidad organizacional invalido', req);
    }

    try {
        const [unitRows] = await pool.query(
            `SELECT
                ou.id,
                ou.unit_type_id,
                outype.code AS type_code,
                outype.name AS type_name,
                ou.name,
                ou.code,
                ou.lead_employee_id,
                CONCAT_WS(' ', lead_emp.first_name, lead_emp.last_name) AS lead_name,
                ou.is_active,
                COALESCE(member_totals.total, 0) AS member_count
             FROM organizational_units ou
             JOIN organizational_unit_types outype ON outype.id = ou.unit_type_id
             LEFT JOIN employees lead_emp ON lead_emp.id = ou.lead_employee_id
             LEFT JOIN (
                SELECT unit_id, COUNT(*) AS total
                FROM organizational_unit_members
                WHERE ended_at IS NULL OR ended_at >= CURDATE()
                GROUP BY unit_id
             ) AS member_totals ON member_totals.unit_id = ou.id
             WHERE ou.id = ?
             LIMIT 1`,
            [unitId]
        );

        if (unitRows.length === 0) {
            return sendError(res, 404, 'Unidad organizacional no encontrada', req);
        }

        const [memberRows] = await pool.query(
            `SELECT
                e.id,
                e.internal_id,
                e.first_name,
                e.last_name,
                m.role_in_unit,
                m.is_primary,
                m.started_at,
                m.ended_at,
                p.name AS position_name
             FROM organizational_unit_members m
             JOIN employees e ON e.id = m.employee_id
             LEFT JOIN employee_jobs ej ON ej.employee_id = e.id AND ej.current_job_flag = 1
             LEFT JOIN positions p ON p.id = ej.position_id
             WHERE m.unit_id = ?
               AND (m.ended_at IS NULL OR m.ended_at >= CURDATE())
             ORDER BY m.is_primary DESC, e.first_name ASC, e.last_name ASC`,
            [unitId]
        );

        const [childRows] = await pool.query(
            `SELECT
                child.id,
                child.name,
                child.code,
                child_type.code AS type_code,
                child_type.name AS type_name
             FROM organizational_unit_relations rel
             JOIN organizational_units child ON child.id = rel.child_unit_id
             JOIN organizational_unit_types child_type ON child_type.id = child.unit_type_id
             WHERE rel.parent_unit_id = ?
               AND rel.relation_type = 'hierarchy'
             ORDER BY child.name ASC`,
            [unitId]
        );

        const [parentRows] = await pool.query(
            `SELECT
                parent.id,
                parent.name,
                parent.code,
                parent_type.code AS type_code,
                parent_type.name AS type_name
             FROM organizational_unit_relations rel
             JOIN organizational_units parent ON parent.id = rel.parent_unit_id
             JOIN organizational_unit_types parent_type ON parent_type.id = parent.unit_type_id
             WHERE rel.child_unit_id = ?
               AND rel.relation_type = 'hierarchy'
             ORDER BY parent.name ASC
             LIMIT 1`,
            [unitId]
        );

        return res.json({
            unit: normalizeUnit(unitRows[0]),
            parent: parentRows[0] || null,
            children: childRows,
            members: memberRows.map((member) => ({
                ...member,
                is_primary: Number(member.is_primary) === 1,
            })),
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'ORGANIZATION_UNIT_FETCH_ERROR',
            message: 'Error al cargar detalle de unidad organizacional',
            details: { unit_id: unitId },
        });
    }
};
