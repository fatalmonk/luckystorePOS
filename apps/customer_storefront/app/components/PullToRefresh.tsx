'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const threshold = 80;

export function PullToRefresh({ lang }: { lang: 'en' | 'bn' }) {
  const router = useRouter();
  const [distance, setDistance] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (pending || !navigator.maxTouchPoints) return;
    let origin: { x: number; y: number } | null = null;
    let pull = 0;
    function reset() {
      origin = null;
      pull = 0;
      setDistance(0);
    }
    function start(event: TouchEvent) {
      reset();
      const target = event.target;
      if (event.touches.length !== 1 || window.scrollY > 0 || !(target instanceof Element)) return;
      if (!target.closest('main') || target.closest('input, textarea, select, [contenteditable], [role="dialog"]')) return;
      for (let node: Element | null = target; node && node !== document.body; node = node.parentElement) {
        if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) return;
      }
      origin = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    function move(event: TouchEvent) {
      if (!origin) return;
      const dy = event.touches[0].clientY - origin.y;
      const dx = Math.abs(event.touches[0].clientX - origin.x);
      if (event.touches.length !== 1 || dy < 0 || dx > Math.max(6, dy) || window.scrollY > 0 || !event.cancelable) return reset();
      if (dy < 4 && !pull) return;
      event.preventDefault();
      pull = Math.min(threshold, dy);
      setDistance(pull);
    }
    function end() {
      const armed = pull >= threshold;
      reset();
      if (armed) startTransition(() => router.refresh());
    }
    document.documentElement.classList.add('store-pull-enabled');
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', reset);
    return () => {
      document.documentElement.classList.remove('store-pull-enabled');
      document.removeEventListener('touchstart', start);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', reset);
    };
  }, [pending, router]);

  const labels = lang === 'bn'
    ? ['রিফ্রেশ করতে টানুন', 'রিফ্রেশ করতে ছেড়ে দিন', 'রিফ্রেশ হচ্ছে…']
    : ['Pull to refresh', 'Release to refresh', 'Refreshing…'];
  return (pending || distance > 0) ? (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center">
        <span className="rounded-full border border-warm-border bg-warm-surface px-4 py-2 text-sm font-semibold text-warm-fg shadow-sm"
          style={{ opacity: pending ? 1 : 0.45 + 0.55 * distance / threshold }}>
          {pending ? labels[2] : distance >= threshold ? labels[1] : labels[0]}
        </span>
    </div>
  ) : null;
}
