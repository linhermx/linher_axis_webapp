import { useEffect, useId, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { Button, ModalShell } from './ui';
import { cn } from '../lib/cn';
import { ACCEPTED_PROFILE_PHOTO_EXTENSIONS, validateProfilePhotoFile } from '../lib/profilePhoto';
import { cropProfilePhotoToFile } from '../lib/profilePhotoCrop';

const loadImageDimensions = (source) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener('load', () => {
    resolve({
      width: Number(image.naturalWidth || image.width || 0),
      height: Number(image.naturalHeight || image.height || 0),
    });
  });
  image.addEventListener('error', () => reject(new Error('No se pudo leer la imagen.')));
  image.src = source;
});

const getInitialZoomForImage = ({ width, height }) => {
  if (!width || !height) {
    return 1.08;
  }

  const ratio = width / height;
  if (ratio > 1.2) return 1.14;
  if (ratio < 0.85) return 1.06;
  return 1.12;
};

const ProfilePhotoActions = ({
  className,
  variant = 'inline',
  currentImageUrl = '',
  disabled = false,
  uploading = false,
  removing = false,
  canRemove = false,
  uploadLabel = 'Actualizar foto',
  removeLabel = 'Quitar foto',
  onUpload,
  onRemove,
}) => {
  const fileInputId = useId();
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef('');
  const isBusy = disabled || uploading || removing;
  const isOverlay = variant === 'overlay';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [localError, setLocalError] = useState('');
  const normalizedCurrentImageUrl = String(currentImageUrl || '').trim();

  const releaseObjectUrl = () => {
    if (!objectUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = '';
  };

  useEffect(() => () => {
    releaseObjectUrl();
  }, []);

  const resetEditorState = () => {
    releaseObjectUrl();

    setSelectedFile(null);
    setSelectedFileUrl('');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setLocalError('');
  };

  const prepareImageForEditor = async ({ source, file = null }) => {
    if (!source) {
      setSelectedFile(file);
      setSelectedFileUrl('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      return;
    }

    let initialZoom = 1.08;
    try {
      const imageDimensions = await loadImageDimensions(source);
      initialZoom = getInitialZoomForImage(imageDimensions);
    } catch {
      initialZoom = 1.08;
    }

    setSelectedFile(file);
    setSelectedFileUrl(source);
    setCrop({ x: 0, y: 0 });
    setZoom(initialZoom);
    setCroppedAreaPixels(null);
    setLocalError('');
  };

  const openModal = () => {
    if (isBusy) {
      return;
    }

    setLocalError('');
    setIsModalOpen(true);
    if (normalizedCurrentImageUrl) {
      releaseObjectUrl();
      void prepareImageForEditor({ source: normalizedCurrentImageUrl, file: null });
    } else {
      resetEditorState();
    }
  };

  const closeModal = () => {
    if (isBusy) {
      return;
    }

    setIsModalOpen(false);
    resetEditorState();
  };

  const handlePickPhoto = () => {
    if (isBusy) return;
    fileInputRef.current?.click();
  };

  const handleFileSelection = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    const validationError = validateProfilePhotoFile(selectedFile);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    releaseObjectUrl();
    const nextObjectUrl = URL.createObjectURL(selectedFile);
    objectUrlRef.current = nextObjectUrl;
    await prepareImageForEditor({ source: nextObjectUrl, file: selectedFile });
  };

  const handleCropComplete = (_, nextCroppedAreaPixels) => {
    setCroppedAreaPixels(nextCroppedAreaPixels);
  };

  const handleSubmitCroppedPhoto = async () => {
    if (typeof onUpload !== 'function') {
      return;
    }

    if (!selectedFileUrl || !croppedAreaPixels) {
      setLocalError('Selecciona una imagen y ajusta el recorte.');
      return;
    }

    try {
      setLocalError('');
      const croppedFile = await cropProfilePhotoToFile({
        imageSource: selectedFileUrl,
        cropAreaPixels: croppedAreaPixels,
        originalFileName: selectedFile?.name || 'profile-photo',
        originalMimeType: selectedFile?.type || 'image/jpeg',
      });

      const result = await onUpload(croppedFile);
      if (result !== false) {
        setIsModalOpen(false);
        resetEditorState();
      }
    } catch (error) {
      setLocalError(error?.message || 'No fue posible preparar la imagen.');
    }
  };

  const handleRemoveCurrentPhoto = async () => {
    if (!canRemove || typeof onRemove !== 'function') {
      return;
    }

    const result = await onRemove();
    if (result !== false) {
      setIsModalOpen(false);
      resetEditorState();
    }
  };

  return (
    <div
      className={cn(
        'profile-photo-actions',
        isOverlay && 'profile-photo-actions--overlay',
        className
      )}
    >
      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_PROFILE_PHOTO_EXTENSIONS}
        className="profile-photo-actions__input"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileSelection}
        disabled={isBusy}
      />

      <Button
        type="button"
        variant={isOverlay ? 'icon' : 'secondary'}
        size="sm"
        className={cn(
          'profile-photo-actions__button',
          isOverlay && 'profile-photo-actions__button--overlay'
        )}
        onClick={openModal}
        disabled={isBusy}
        aria-label={uploading ? 'Subiendo foto de perfil' : uploadLabel}
        title={uploadLabel}
      >
        <Camera size={14} strokeWidth={2.3} />
        {!isOverlay ? (uploading ? 'Subiendo...' : uploadLabel) : null}
      </Button>

      <ModalShell
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Gestionar foto de perfil"
        description="Selecciona una imagen, recórtala y guarda los cambios."
        size="sm"
        footer={(
          <>
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isBusy}>
              Cancelar
            </Button>
            {canRemove ? (
              <Button
                type="button"
                variant="secondary"
                className="profile-photo-actions__modal-remove"
                onClick={handleRemoveCurrentPhoto}
                disabled={isBusy}
              >
                <Trash2 size={15} />
                {removing ? 'Eliminando...' : removeLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={handleSubmitCroppedPhoto}
              disabled={isBusy || !selectedFileUrl || !croppedAreaPixels}
            >
              <ImagePlus size={15} />
              {uploading ? 'Subiendo...' : 'Recortar y guardar'}
            </Button>
          </>
        )}
      >
        <div className="profile-photo-actions__modal">
          <div className="profile-photo-actions__crop-stage">
            {selectedFileUrl ? (
              <Cropper
                image={selectedFileUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                objectFit="cover"
                onCropChange={setCrop}
                onCropComplete={handleCropComplete}
                onZoomChange={setZoom}
              />
            ) : (
              <div className="profile-photo-actions__crop-empty">
                <span className="profile-photo-actions__crop-empty-icon" aria-hidden="true">
                  <Camera size={18} />
                </span>
                <p>Selecciona una foto para iniciar el recorte.</p>
              </div>
            )}
          </div>

          <div className="profile-photo-actions__controls">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePickPhoto}
              disabled={isBusy}
            >
              <Camera size={14} />
              Seleccionar imagen
            </Button>

            {selectedFile ? (
              <p className="profile-photo-actions__filename" title={selectedFile.name}>
                {selectedFile.name}
              </p>
            ) : normalizedCurrentImageUrl ? (
              <p className="profile-photo-actions__filename profile-photo-actions__filename--placeholder">
                Foto actual cargada. Puedes ajustar encuadre y zoom.
              </p>
            ) : (
              <p className="profile-photo-actions__filename profile-photo-actions__filename--placeholder">
                Aún no seleccionas archivo.
              </p>
            )}

            <label className="profile-photo-actions__zoom">
              <span>Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                disabled={isBusy || !selectedFileUrl}
              />
            </label>
          </div>

          {localError ? (
            <p className="profile-photo-actions__error">{localError}</p>
          ) : null}
        </div>
      </ModalShell>
    </div>
  );
};

export default ProfilePhotoActions;
