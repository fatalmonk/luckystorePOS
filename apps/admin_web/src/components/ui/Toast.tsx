import React, { useEffect } from 'react';
import clsx from 'clsx';

export interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // ms
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgClass = {
    info: 'bg-primary text-white',
    success: 'bg-success text-white',
    warning: 'bg-warning text-white',
    error: 'bg-danger text-white',
  }[type];

  return (
    <div className={clsx('fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-md', bgClass)}>
      {message}
    </div>
  );
};
