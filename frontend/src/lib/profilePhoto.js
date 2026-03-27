export const MAX_PROFILE_PHOTO_SIZE_BYTES = Number(
  import.meta.env.VITE_PROFILE_PHOTO_MAX_FILE_SIZE_BYTES || 2 * 1024 * 1024
);

export const ACCEPTED_PROFILE_PHOTO_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const ACCEPTED_PROFILE_PHOTO_EXTENSIONS = '.jpg,.jpeg,.png,.webp';

export const validateProfilePhotoFile = (file) => {
  if (!file) {
    return 'Debes seleccionar una imagen.';
  }

  if (!ACCEPTED_PROFILE_PHOTO_TYPES.includes(String(file.type || '').toLowerCase())) {
    return 'Formato no válido. Usa JPG, PNG o WEBP.';
  }

  if (file.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
    return 'La imagen supera el límite permitido de 2 MB.';
  }

  return null;
};
