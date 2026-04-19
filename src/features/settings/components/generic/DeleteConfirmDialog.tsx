import { Modal } from '../../../../components/ui';
import { Btn } from '../../../../components/ui';

type DeleteConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  entityLabel: string;
  isDeleting: boolean;
};

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  entityLabel,
  isDeleting,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <Modal
      title={`Delete ${entityLabel}`}
      sub=""
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Btn block={false} variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Btn>
          <Btn block={false} variant="primary" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Yes, delete'}
          </Btn>
        </>
      }
    >
      <div className="p-4">
        Are you sure you want to delete this {entityLabel.toLowerCase()}? This action cannot be
        undone.
      </div>
    </Modal>
  );
}
