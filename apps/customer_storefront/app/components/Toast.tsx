'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOptionalCartContext } from './CartProvider';
import { usePathname } from 'next/navigation';
import { formatBdt } from '../lib/formatPrice';
import { getDictionary } from '../lib/i18n/dictionaries';
import { getLocaleFromPathname, toBengaliNumerals } from '../lib/i18n/config';
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
  persistent?: boolean;
}

export interface ToastContextType {
  showToast: (message: string, action?: ToastAction, duration?: number, persistent?: boolean) => void;
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
  const cart = useOptionalCartContext();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy = getDictionary(locale).toast;
  const subtotal = cart?.subtotal ?? 0;
  const total = cart?.total ?? 0;
  const totalItems = cart?.totalItems ?? 0;
  const progress = Math.min(100, (subtotal / 500) * 100);
  const localizeNumber = (value: number) => locale === 'bn' ? toBengaliNumerals(value) : String(value);
  const localizeBdt = (value: number) => {
    const formatted = formatBdt(value);
    return locale === 'bn' ? toBengaliNumerals(formatted) : formatted;
  };
  const enter = useTempoTransition(spring.toast);
  const leave = useTempoTransition(motionTransition.dismiss);

  return (
    <section
      aria-label={copy.notifications}
      className="pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[9999] flex w-[92%] max-w-[420px] -translate-x-1/2 flex-col gap-2 md:bottom-6"
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
              className={`pointer-events-auto relative flex items-center justify-between gap-3 rounded-2xl border border-warm-border bg-warm-fg px-4 text-sm font-semibold text-warm-bg shadow-xl ${toast.persistent ? 'pb-10 pt-3.5' : 'py-3.5'}`}
            >
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="min-w-0 text-left leading-snug">{toast.persistent && cart ? copy.cartUpdated : toast.message}</span>
                {toast.persistent && cart && <span className="shrink-0 text-xs font-semibold text-warm-bg/85">{copy.cartSummary.replace('{count}', localizeNumber(totalItems)).replace('{itemLabel}', totalItems === 1 ? copy.itemSingular : copy.itemPlural).replace('{total}', localizeBdt(total))}</span>}
              </div>
              {toast.persistent && (
                <button type="button" onClick={() => dismiss(toast.id)} aria-label={copy.dismiss} className="grid size-8 shrink-0 place-items-center rounded-full text-warm-bg/70 hover:bg-white/10 hover:text-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent">×</button>
              )}
              {toast.persistent && cart && (
                <div className="absolute inset-x-0 bottom-0 px-4 pb-3" aria-label={copy.deliveryProgress.replace('{percent}', localizeNumber(Math.round(progress)))}>
                  <div className="h-1 overflow-hidden rounded-full bg-white/20">
                    <motion.div className="h-full rounded-full bg-warm-accent" initial={false} animate={{ width: `${progress}%` }} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 24 }} />
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium text-warm-bg/75" aria-live="polite">
                    {subtotal >= 500 ? copy.freeDeliveryUnlocked : copy.freeDeliveryProgress.replace('{subtotal}', localizeBdt(subtotal)).replace('{threshold}', localizeBdt(500))}
                  </p>
                </div>
              )}
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

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

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
