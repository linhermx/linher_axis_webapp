import express from 'express';
import { getAllEmployees, createEmployee, getEmployeeById } from '../controllers/employeeController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticateToken); // All employee routes are protected

router.get('/', checkPermission('view_employees'), getAllEmployees);
router.get('/:id', checkPermission('view_employees'), getEmployeeById);
router.post('/', checkPermission('create_employee'), createEmployee);

export default router;
