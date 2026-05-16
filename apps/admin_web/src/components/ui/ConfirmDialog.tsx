import React from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isPending = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
        <button className="button-outline" onClick={onCancel} disabled={isPending}>{cancelLabel}</button>
        <button
          className={variant === 'danger' ? 'button-danger' : 'button-primary'}
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? 'Deleting...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};