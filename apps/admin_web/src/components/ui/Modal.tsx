import React, { ReactNode } from 'react';
import clsx from 'clsx';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export const Modal = ({ isOpen, onClose, title, children, className }: ModalProps) => {
  if (!isOpen) return null;
  return (
    <div className={clsx('fixed inset-0 z-50 flex items-center justify-center')}>
      {/* backdrop */}
      <div className="fixed inset-0 bg-surface-overlay" onClick={onClose} />
      <div
        className={clsx(
          'relative bg-surface rounded-lg shadow-level-3 border border-border-default max-w-lg w-full mx-4',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-6 border-b border-border-default">
          {title && <h2 className="text-lg font-medium text-text-primary">{title}</h2>}
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
