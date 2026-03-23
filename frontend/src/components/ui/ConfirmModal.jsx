import Button from './Button';
import ModalShell from './ModalShell';

const ConfirmModal = ({
  isOpen,
  title = 'Confirmar accion',
  description = 'Esta accion no se puede deshacer.',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
  children,
}) => {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </Button>
        </>
      }
    >
      {children ? <div className="ui-field__hint">{children}</div> : null}
    </ModalShell>
  );
};

export default ConfirmModal;
