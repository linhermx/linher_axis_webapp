import express from 'express';
import {
    getOrganizationStructure,
    getOrganizationUnit,
} from '../controllers/organizationController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/structure', checkPermission('view_employees'), getOrganizationStructure);
router.get('/units/:id', checkPermission('view_employees'), getOrganizationUnit);

export default router;
