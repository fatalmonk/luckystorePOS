import React, { ReactNode } from 'react';
import { clsx } from "clsx";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ isOpen, onClose, title, children, className, size = 'md' }: ModalProps) => {
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  
  return (
    <div className={clsx('fixed inset-0 z-50 flex items-start justify-center pt-12 pb-8')} style={{ overflowY: 'auto' }}>
      {/* backdrop */}
      <div 
        className="fixed inset-0 bg-warm-deep/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div
        className={clsx(
          'relative bg-warm-surface rounded-xl shadow-level-3 border border-warm-border-warm w-full mx-4 flex flex-col',
          sizeClasses[size],
          className
        )}
        style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-6 border-b border-warm-border-warm shrink-0">
          {title && <h2 className="text-lg font-medium text-warm-fg font-display">{title}</h2>}
          <button onClick={onClose} className="text-warm-muted hover:text-warm-fg transition-colors">
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
