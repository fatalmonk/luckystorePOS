'use client'; // flying cart-glyph animation using createPortal and window dimensions

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag } from '@phosphor-icons/react';

interface FlyItem {
  id: string;
  startX: number;
  startY: number;
}

interface CartFlyAnimationProps {
  items: FlyItem[];
  onComplete: (id: string) => void;
}

/**
 * Renders a consistent cart glyph that animates from the product card
 * to the cart icon position (top-right of viewport).
 */
export function CartFlyAnimation({ items, onComplete }: CartFlyAnimationProps) {
  const [mounted, setMounted] = useState(false);
  const [eventItems, setEventItems] = useState<FlyItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleFlyEvent = (event: Event) => {
      const detail = (event as CustomEvent<FlyItem>).detail;
      if (detail) {
        setEventItems((prev) => [...prev, detail]);
      }
    };

    window.addEventListener('lucky-store:cart-fly', handleFlyEvent);
    return () => window.removeEventListener('lucky-store:cart-fly', handleFlyEvent);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {[...items, ...eventItems].map((item) => {
        // Target: cart icon area (top-right, approx header position)
        const targetX = typeof window !== 'undefined' ? window.innerWidth - 50 : 0;
        const targetY = 30;
        const flyX = targetX - item.startX;
        const flyY = targetY - item.startY;

        return (
          <div
            key={item.id}
            className="fly-to-cart flex h-9 w-9 items-center justify-center rounded-full bg-warm-accent text-warm-accent-text shadow-warm-md"
            style={{
              left: item.startX,
              top: item.startY,
              '--fly-x': `${flyX}px`,
              '--fly-y': `${flyY}px`,
            } as React.CSSProperties}
            onAnimationEnd={() => {
              onComplete(item.id);
              setEventItems((prev) => prev.filter((eventItem) => eventItem.id !== item.id));
            }}
          >
            <ShoppingBag size={20} weight="fill" aria-hidden="true" />
          </div>
        );
      })}
    </>,
    document.body
  );
}
