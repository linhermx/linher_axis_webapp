import { MAX_PROFILE_PHOTO_SIZE_BYTES } from './profilePhoto';

const OUTPUT_MAX_DIMENSION = 640;
const OUTPUT_MIN_DIMENSION = 280;
const INITIAL_QUALITY = 0.9;
const MIN_QUALITY = 0.62;
const QUALITY_STEP = 0.07;
const DOWNSCALE_FACTOR = 0.86;
const MAX_ATTEMPTS = 8;

const loadImage = (source) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', (error) => reject(error));
  image.setAttribute('crossOrigin', 'anonymous');
  image.src = source;
});

const canvasToBlob = (canvas, mimeType, quality = 0.92) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('No fue posible generar el recorte.'));
      return;
    }

    resolve(blob);
  }, mimeType, quality);
});

const buildSquareCanvas = (image, cropAreaPixels, outputSize) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No se pudo preparar el editor de imagen.');
  }

  canvas.width = outputSize;
  canvas.height = outputSize;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, outputSize, outputSize);
  context.drawImage(
    image,
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return canvas;
};

export const cropProfilePhotoToFile = async ({
  imageSource,
  cropAreaPixels,
  originalFileName = 'profile-photo',
  originalMimeType: _originalMimeType = 'image/jpeg',
}) => {
  if (!imageSource || !cropAreaPixels) {
    throw new Error('No se definió un área de recorte válida.');
  }

  const image = await loadImage(imageSource);
  const outputType = 'image/jpeg';
  const outputExtension = 'jpg';

  const baseName = String(originalFileName || 'profile-photo').replace(/\.[^./\\]+$/u, '');
  const safeWidth = Math.max(1, Math.round(cropAreaPixels.width));
  const safeHeight = Math.max(1, Math.round(cropAreaPixels.height));
  const cropSize = Math.max(safeWidth, safeHeight);

  let targetSize = Math.min(cropSize, OUTPUT_MAX_DIMENSION);
  let quality = INITIAL_QUALITY;
  let bestBlob = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const canvas = buildSquareCanvas(image, cropAreaPixels, Math.max(1, Math.round(targetSize)));
    const blob = await canvasToBlob(canvas, outputType, quality);

    bestBlob = blob;
    if (blob.size <= MAX_PROFILE_PHOTO_SIZE_BYTES) {
      break;
    }

    if (quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    } else if (targetSize > OUTPUT_MIN_DIMENSION) {
      targetSize = Math.max(OUTPUT_MIN_DIMENSION, Math.round(targetSize * DOWNSCALE_FACTOR));
      quality = INITIAL_QUALITY - QUALITY_STEP;
    }
  }

  if (!bestBlob) {
    throw new Error('No fue posible generar la imagen recortada.');
  }

  if (bestBlob.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
    throw new Error('La imagen recortada supera 2 MB. Usa una foto más ligera.');
  }

  return new File([bestBlob], `${baseName}.${outputExtension}`, { type: outputType });
};
