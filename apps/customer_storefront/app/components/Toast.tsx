'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
}

interface ToastContextType {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90%] max-w-[380px] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-[#1c1917] text-white px-4 py-3.5 rounded-[14px] text-sm font-semibold text-center shadow-lg animate-[toastIn_0.3s_ease] pointer-events-auto"
            style={{
              animation: 'toastIn 0.3s ease',
            }}
          >
            {toast.message}
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
