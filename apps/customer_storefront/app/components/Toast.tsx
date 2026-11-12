'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ComponentType,
  type ReactNode,
} from 'react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  action?: ToastAction;
  duration?: number;
  type?: 'default' | 'success' | 'error' | 'info';
  persistent?: boolean;
}

export interface ToastContextType {
  showToast: (message: string, action?: ToastAction, duration?: number, persistent?: boolean) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [Viewport, setViewport] = useState<ComponentType<{
    toasts: Toast[];
    dismiss: (id: string) => void;
  }> | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (toasts.length === 0 || Viewport) return;

    let active = true;
    void import('./ToastViewport').then((module) => {
      if (active) setViewport(() => module.ToastViewport);
    });

    return () => {
      active = false;
    };
  }, [toasts.length, Viewport]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, action?: ToastAction, duration = 3200, persistent = false) => {
      const id = `toast-${++toastCounter}`;
      setToasts((prev) => {
        if (persistent) {
          const transientToasts = prev.filter((toast) => !toast.persistent);
          prev.filter((toast) => toast.persistent).forEach((toast) => {
            const timer = timersRef.current.get(toast.id);
            if (timer) clearTimeout(timer);
            timersRef.current.delete(toast.id);
          });
          return [...transientToasts, { id, message, action, duration, persistent }];
        }
        return [...prev, { id, message, action, duration, persistent }];
      });

      if (!persistent) {
        const timer = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && Viewport ? <Viewport toasts={toasts} dismiss={dismiss} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
