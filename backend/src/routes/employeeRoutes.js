import express from 'express';
import { getAllEmployees, createEmployee, getEmployeeById } from '../controllers/employeeController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticateToken); // All employee routes are protected

router.get('/', checkPermission('VIEW_EMPLOYEES'), getAllEmployees);
router.get('/:id', checkPermission('VIEW_EMPLOYEES'), getEmployeeById);
router.post('/', checkPermission('CREATE_EMPLOYEE'), createEmployee);

export default router;
