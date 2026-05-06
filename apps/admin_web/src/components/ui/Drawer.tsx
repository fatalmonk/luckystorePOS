import React, { ReactNode, forwardRef } from 'react';
import clsx from 'clsx';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export const Drawer = ({ isOpen, onClose, title, children, className }: DrawerProps) => {
  if (!isOpen) return null;
  return (
    <div className={clsx('fixed inset-0 z-50 flex')}>
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={clsx('relative ml-auto w-80 max-w-full h-full bg-card shadow-lg', className)}>
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          {title && <h2 className="text-lg font-medium text-text-main">{title}</h2>}
          <button onClick={onClose} className="text-text-muted hover:text-text-main">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
