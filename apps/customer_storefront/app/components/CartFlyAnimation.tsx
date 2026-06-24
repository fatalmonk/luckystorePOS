'use client'; // flying emoji animation using createPortal and window dimensions

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface FlyItem {
  id: string;
  emoji: string;
  startX: number;
  startY: number;
}

interface CartFlyAnimationProps {
  items: FlyItem[];
  onComplete: (id: string) => void;
}

/**
 * Renders flying emoji/image elements that animate from the product card
 * to the cart icon position (top-right of viewport).
 */
export function CartFlyAnimation({ items, onComplete }: CartFlyAnimationProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {items.map((item) => {
        // Target: cart icon area (top-right, approx header position)
        const targetX = typeof window !== 'undefined' ? window.innerWidth - 50 : 0;
        const targetY = 30;
        const flyX = targetX - item.startX;
        const flyY = targetY - item.startY;

        return (
          <div
            key={item.id}
            className="fly-to-cart text-3xl"
            style={{
              left: item.startX,
              top: item.startY,
              '--fly-x': `${flyX}px`,
              '--fly-y': `${flyY}px`,
            } as React.CSSProperties}
            onAnimationEnd={() => onComplete(item.id)}
          >
            {item.emoji}
          </div>
        );
      })}
    </>,
    document.body
  );
}
