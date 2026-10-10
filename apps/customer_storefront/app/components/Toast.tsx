'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
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
}

export interface ToastContextType {
  showToast: (message: string, action?: ToastAction, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, action?: ToastAction, duration = 3200) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, message, action, duration }]);

    const timer = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <section
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-20 left-1/2 z-[9999] flex w-[92%] max-w-[420px] -translate-x-1/2 flex-col gap-2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
      >
        <div className="flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-warm-border bg-warm-fg px-4 py-3.5 text-sm font-semibold text-warm-bg shadow-xl transition-all duration-200"
              style={{
                animation: 'toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <span className="flex-1 text-left leading-snug">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action!.onClick();
                    dismiss(toast.id);
                  }}
                  className="shrink-0 whitespace-nowrap text-sm font-black text-warm-accent transition-colors hover:text-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
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