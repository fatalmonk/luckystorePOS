'use client';

import { useCartContext } from './CartProvider';

const FREE_DELIVERY_THRESHOLD = 500;

export function DeliveryProgress() {
  const { subtotal } = useCartContext();
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const unlocked = subtotal >= FREE_DELIVERY_THRESHOLD;

  return (
    <div className="bg-white rounded-xl p-4 border border-[#e7e5e4] shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-[#1c1917]">
          {unlocked ? '🎉 Free Delivery Unlocked!' : `Add ৳${remaining.toFixed(0)} more for free delivery`}
        </h3>
        <span className="text-xs font-bold text-[#78716c]">
          {unlocked ? 'Free' : `${Math.round(progress)}%`}
        </span>
      </div>
      <div className="w-full bg-[#f5f5f4] rounded-full h-2">
        <div
          className="bg-[#ffe302] h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
