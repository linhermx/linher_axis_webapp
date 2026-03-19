import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
    getMyPayrollPayments,
    getMyProfile,
} from '../controllers/profileController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', getMyProfile);
router.get('/payroll-payments', getMyPayrollPayments);

export default router;
