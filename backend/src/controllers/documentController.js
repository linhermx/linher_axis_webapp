import pool from '../config/db.js';
import path from 'path';

export const uploadDocument = async (req, res) => {
    try {
        const { employee_id, category_id, expiry_date } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const [result] = await pool.query(
            'INSERT INTO employee_documents (employee_id, category_id, file_name, file_path, expiry_date) VALUES (?, ?, ?, ?, ?)',
            [employee_id, category_id, file.originalname, file.path, expiry_date || null]
        );

        res.status(201).json({ id: result.insertId, message: 'Document uploaded successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading document', error: error.message });
    }
};

export const getEmployeeDocuments = async (req, res) => {
    const { employeeId } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT ed.*, dc.name as category_name 
            FROM employee_documents ed
            JOIN document_categories dc ON ed.category_id = dc.id
            WHERE ed.employee_id = ?
        `, [employeeId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching documents', error: error.message });
    }
};

export const getExpiryAlerts = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ed.*, e.first_name, e.last_name, dc.name as category_name
            FROM employee_documents ed
            JOIN employees e ON ed.employee_id = e.id
            JOIN document_categories dc ON ed.category_id = dc.id
            WHERE ed.expiry_date IS NOT NULL 
            AND ed.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
            ORDER BY ed.expiry_date ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching alerts', error: error.message });
    }
};
