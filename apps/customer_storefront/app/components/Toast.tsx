'use client'; // toast context provider with useState, useCallback, and auto-dismiss timers

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextType {
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

  const showToast = useCallback((message: string, action?: ToastAction, duration = 2800) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, message, action, duration }]);

    const timer = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90%] max-w-[380px] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-warm-fg text-white px-4 py-3.5 rounded-[14px] text-sm font-semibold text-center shadow-lg animate-[toastIn_0.3s_var(--ease-out,ease)] pointer-events-auto flex items-center justify-between gap-3"
            style={{
              animation: 'toastIn 0.3s var(--ease-out, ease)',
            }}
          >
            <span className="flex-1 text-left">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  dismiss(toast.id);
                }}
                className="text-warm-accent font-bold text-sm whitespace-nowrap hover:text-[#ffec50] transition-colors"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
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