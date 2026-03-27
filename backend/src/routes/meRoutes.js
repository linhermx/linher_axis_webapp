import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
    getMyPayrollPayments,
    getMyProfile,
} from '../controllers/profileController.js';
import {
    removeMyProfilePhoto,
    uploadMyProfilePhoto,
} from '../controllers/profilePhotoController.js';
import { uploadProfilePhoto } from '../middlewares/profilePhotoUpload.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', getMyProfile);
router.get('/payroll-payments', getMyPayrollPayments);
router.post('/photo', uploadProfilePhoto('photo'), uploadMyProfilePhoto);
router.delete('/photo', removeMyProfilePhoto);

export default router;
