import express from 'express';
import { getAllEmployees, createEmployee, getEmployeeById } from '../controllers/employeeController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken); // All employee routes are protected

router.get('/', getAllEmployees);
router.get('/:id', getEmployeeById);
router.post('/', createEmployee);

export default router;
