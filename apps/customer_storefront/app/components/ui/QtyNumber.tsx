'use client';

import { useEffect, useRef, useState } from 'react';

interface QtyNumberProps {
  qty: number;
  className?: string;
}

/**
 * Displays a quantity number with a pulse animation on change.
 * Uses a key-remount trick to retrigger the CSS animation.
 */
export function QtyNumber({ qty, className = '' }: QtyNumberProps) {
  const prevQty = useRef(qty);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (prevQty.current !== qty) {
      setPulsing(true);
      prevQty.current = qty;
      const t = setTimeout(() => setPulsing(false), 350);
      return () => clearTimeout(t);
    }
  }, [qty]);

  return (
    <span className={`${className} ${pulsing ? 'qty-pulse' : ''}`}>
      {qty}
    </span>
  );
}