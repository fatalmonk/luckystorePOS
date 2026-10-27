'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  spring,
  transition as motionTransition,
  scale,
  blur,
  useTempoTransition,
  ReducedMotionConfig,
  useShouldReduceMotion,
} from '@animate-ui/react/utils/motion';

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

function ToastList({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  const reduce = useShouldReduceMotion();
  const enter = useTempoTransition(spring.toast);
  const leave = useTempoTransition(motionTransition.dismiss);

  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-20 left-1/2 z-[9999] flex w-[92%] max-w-[420px] -translate-x-1/2 flex-col gap-2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
    >
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              role="status"
              layout="position"
              initial={{
                opacity: 0,
                y: reduce ? 0 : '100%',
                scale: reduce ? 1 : scale.toast,
                filter: blur.surface,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'blur(0px)',
                transition: enter,
              }}
              exit={{
                opacity: 0,
                scale: reduce ? 1 : scale.toast,
                filter: blur.surface,
                transition: leave,
              }}
              transition={enter}
              style={{ originY: 1 }}
              className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-warm-border bg-warm-fg px-4 py-3.5 text-sm font-semibold text-warm-bg shadow-xl"
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

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

  const showToast = useCallback(
    (message: string, action?: ToastAction, duration = 3200) => {
      const id = `toast-${++toastCounter}`;
      setToasts((prev) => [...prev, { id, message, action, duration }]);

      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ReducedMotionConfig>
        <ToastList toasts={toasts} dismiss={dismiss} />
      </ReducedMotionConfig>
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