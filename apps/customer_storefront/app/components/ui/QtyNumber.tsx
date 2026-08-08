'use client';

import React from 'react';
import { useEffect, useRef, useState } from 'react';

interface QtyNumberProps {
  qty: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * Displays a quantity number with a pulse animation on change.
 * Respects prefers-reduced-motion; no animation when reduced motion is requested.
 */
export function QtyNumber({ qty, className = '', 'aria-label': ariaLabel }: QtyNumberProps) {
  const prevQty = useRef(qty);
  const [pulsing, setPulsing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    if (prevQty.current !== qty) {
      setPulsing(true);
      prevQty.current = qty;
      const t = setTimeout(() => setPulsing(false), 350);
      return () => clearTimeout(t);
    }
  }, [qty, reducedMotion]);

  return (
    <span className={`${className} ${pulsing ? 'qty-pulse' : ''}`} aria-label={ariaLabel}>
      {qty}
    </span>
  );
}
