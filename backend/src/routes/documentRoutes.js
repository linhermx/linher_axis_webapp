import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadDocument, getEmployeeDocuments, getExpiryAlerts } from '../controllers/documentController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.DOCS_STORAGE_PATH || './src/uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

router.use(authenticateToken);

router.post('/upload', checkPermission('CREATE_EMPLOYEE'), upload.single('document'), uploadDocument);
router.get('/employee/:employeeId', checkPermission('VIEW_EMPLOYEES'), getEmployeeDocuments);
router.get('/alerts', checkPermission('VIEW_EMPLOYEES'), getExpiryAlerts);

export default router;
