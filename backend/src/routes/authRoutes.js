import express from 'express';
import {
    login,
    refresh,
    logout,
    me,
    changeRequiredPassword,
} from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/change-password', authenticateToken, changeRequiredPassword);
router.get('/me', authenticateToken, me);

export default router;
