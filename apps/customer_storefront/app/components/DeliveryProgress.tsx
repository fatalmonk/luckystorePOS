'use client';

import { useCartContext } from './CartProvider';

const FREE_DELIVERY_THRESHOLD = 500;

export function DeliveryProgress() {
  const { subtotal, isLoaded } = useCartContext();
  const safeSubtotal = isLoaded ? subtotal : 0;
  const progress = Math.min(100, (safeSubtotal / FREE_DELIVERY_THRESHOLD) * 100);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - safeSubtotal);
  const unlocked = safeSubtotal >= FREE_DELIVERY_THRESHOLD;

  return (
    <div className="bg-white rounded-xl p-4 border border-warm-border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-warm-fg">
          {unlocked ? '🎉 Free Delivery Unlocked!' : `Add ৳${remaining.toFixed(0)} more for free delivery`}
        </h3>
        <span className="text-xs font-bold text-warm-muted">
          {unlocked ? 'Free' : `${Math.round(progress)}%`}
        </span>
      </div>
      <div className="w-full bg-warm-border-light rounded-full h-2">
        <div
          className="bg-warm-accent h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
