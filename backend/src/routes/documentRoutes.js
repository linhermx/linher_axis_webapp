import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    downloadDocument,
    getEmployeeDocuments,
    getExpiryAlerts,
    getMyDocuments,
    getValidationQueue,
    listDocumentCategories,
    reviewEmployeeDocument,
    uploadMyDocument,
} from '../controllers/documentController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const storagePath = process.env.DOCS_STORAGE_PATH || './src/uploads';
        fs.mkdirSync(storagePath, { recursive: true });
        cb(null, storagePath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: Number(process.env.DOCUMENT_MAX_FILE_SIZE_BYTES || 8 * 1024 * 1024),
    },
});

router.use(authenticateToken);

router.get('/categories', checkPermission(['view_documents', 'manage_documents', 'validate_documents']), listDocumentCategories);
router.get('/my', checkPermission(['view_documents', 'manage_documents']), getMyDocuments);
router.post('/my/upload', checkPermission('manage_documents'), upload.single('document'), uploadMyDocument);
router.get('/review/queue', checkPermission('validate_documents'), getValidationQueue);
router.post('/:documentId/review', checkPermission('validate_documents'), reviewEmployeeDocument);
router.get('/:documentId/download', checkPermission(['view_documents', 'manage_documents', 'validate_documents']), downloadDocument);
router.get('/employee/:employeeId', checkPermission(['view_employees', 'manage_documents', 'validate_documents']), getEmployeeDocuments);
router.get('/alerts', checkPermission('validate_documents'), getExpiryAlerts);

export default router;
