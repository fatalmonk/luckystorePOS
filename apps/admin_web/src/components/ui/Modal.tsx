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
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div
        className={clsx(
          'relative bg-card rounded-xl shadow-modal border border-border-light max-w-lg w-full mx-4',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          {title && <h2 className="text-lg font-medium text-text-main">{title}</h2>}
          <button onClick={onClose} className="text-text-muted hover:text-text-main">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
