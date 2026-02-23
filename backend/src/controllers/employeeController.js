import pool from '../config/db.js';

export const getAllEmployees = async (req, res) => {
    try {
        const [employees] = await pool.query(`
            SELECT e.*, d.name as department_name, p.name as position_name 
            FROM employees e
            LEFT JOIN employee_jobs ej ON e.id = ej.employee_id
            LEFT JOIN departments d ON ej.department_id = d.id
            LEFT JOIN positions p ON ej.position_id = p.id
        `);
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching employees', error: error.message });
    }
};

export const createEmployee = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const {
            internal_id, first_name, last_name, birth_date, gender,
            department_id, position_id, manager_id, start_date, schedule, salary
        } = req.body;

        const [empResult] = await connection.query(
            'INSERT INTO employees (internal_id, first_name, last_name, birth_date, gender) VALUES (?, ?, ?, ?, ?)',
            [internal_id, first_name, last_name, birth_date, gender]
        );
        const employeeId = empResult.insertId;

        await connection.query(
            'INSERT INTO employee_jobs (employee_id, department_id, position_id, manager_id, start_date, schedule, salary) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [employeeId, department_id, position_id, manager_id, start_date, schedule, salary]
        );

        await connection.commit();
        res.status(201).json({ id: employeeId, message: 'Employee created successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Error creating employee', error: error.message });
    } finally {
        connection.release();
    }
};

export const getEmployeeById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT e.*, ej.department_id, ej.position_id, ej.manager_id, ej.start_date, ej.schedule, ej.salary, ej.currency
            FROM employees e
            LEFT JOIN employee_jobs ej ON e.id = ej.employee_id
            WHERE e.id = ?
        `, [id]);

        if (rows.length === 0) return res.status(404).json({ message: 'Employee not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching employee', error: error.message });
    }
};
