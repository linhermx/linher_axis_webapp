import multer from 'multer';
import { sendError } from '../utils/ApiError.js';

const MAX_PROFILE_PHOTO_SIZE_BYTES = Number(
    process.env.USER_PHOTO_MAX_FILE_SIZE_BYTES || 2 * 1024 * 1024
);

const ALLOWED_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

const profilePhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_PROFILE_PHOTO_SIZE_BYTES,
    },
    fileFilter: (req, file, cb) => {
        const mimeType = String(file?.mimetype || '').toLowerCase();
        if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
            cb(new Error('PROFILE_PHOTO_INVALID_TYPE'));
            return;
        }

        cb(null, true);
    },
});

const resolveUploadErrorMessage = (error) => {
    if (!error) {
        return null;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return 'La foto supera el límite permitido (2 MB).';
    }

    if (error?.message === 'PROFILE_PHOTO_INVALID_TYPE') {
        return 'Formato de imagen no válido. Usa JPG, PNG o WEBP.';
    }

    return 'No fue posible procesar la foto seleccionada.';
};

export const uploadProfilePhoto = (fieldName = 'photo') => (req, res, next) => {
    profilePhotoUpload.single(fieldName)(req, res, (error) => {
        if (error) {
            return sendError(res, 400, resolveUploadErrorMessage(error), req);
        }

        return next();
    });
};

export const PROFILE_PHOTO_ACCEPTED_TYPES = Array.from(ALLOWED_IMAGE_MIME_TYPES);
export const PROFILE_PHOTO_MAX_SIZE_BYTES = MAX_PROFILE_PHOTO_SIZE_BYTES;
