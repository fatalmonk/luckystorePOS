'use client'; // order status page with sessionStorage read and router

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/Toast';
import { formatBdt } from '../lib/formatPrice';

interface OrderData {
  orderNumber: string;
  name: string;
  phone: string;
  address: string;
  items: number;
  total: number;
  time: string;
}

const TIMELINE_STEPS = [
  { id: 'placed', label: 'Order Placed', time: 'Just now', state: 'done' as const },
  { id: 'confirmed', label: 'Awaiting Confirmation', time: 'Store will review and confirm', state: 'active' as const },
  { id: 'preparing', label: 'Preparing', time: 'Packing your items', state: 'upcoming' as const },
  { id: 'delivery', label: 'Out for Delivery', time: 'Est. 45–60 min', state: 'upcoming' as const },
  { id: 'delivered', label: 'Delivered', time: null, state: 'upcoming' as const },
];

export default function OrderContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('lastOrder');
    if (saved) {
      try {
        setOrder(JSON.parse(saved));
      } catch {
        // Invalid sessionStorage — leave as null
      }
    }
    setLoading(false);
  }, []);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Order #${order?.orderNumber} — Lucky Store`,
          text: `Track my order at Lucky Store`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast('Order link copied');
    } catch (err) {
      // User cancelled share or permission denied — silent fail
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 bg-[#faf8f5]">
        <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse mb-4" />
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 bg-[#faf8f5]">
        <p className="text-[#78716c] mb-4">We couldn&apos;t find your order</p>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#faf8f5]">
      <div className="p-[18px] pt-9">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-[72px] h-[72px] bg-[rgba(45,106,79,0.08)] rounded-full grid place-items-center mx-auto mb-4">
            <span className="text-[32px] text-[#2d6a4f]">✓</span>
          </div>
          <h1 className="text-[22px] font-extrabold tracking-tight mb-1.5">Order Placed!</h1>
          <p className="text-sm text-[#78716c] mb-1">Order number</p>
          <p className="font-mono text-lg font-extrabold text-[#1c1917] bg-[#ffe302] px-3 py-1 rounded-full inline-block">{order.orderNumber}</p>
        </div>

        {/* Summary */}
        <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-4 mb-5">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-[#78716c]">Items</span>
            <span>{order.items} items</span>
          </div>
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-[#78716c]">Total</span>
            <span className="font-semibold">{formatBdt(order.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#78716c]">Payment</span>
            <span className="text-[#2d6a4f] font-bold">Cash on Delivery</span>
          </div>
        </div>

        {/* Cash Preparation */}
        <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-4 mb-6">
          <h3 className="text-sm font-bold mb-2">💵 Have Cash Ready</h3>
          <p className="text-sm text-[#78716c] mb-2">
            Have <strong className="text-[#1c1917]">{formatBdt(order.total)}</strong> ready in cash for the rider.
          </p>
          <p className="text-xs text-[#78716c]">
            Having exact change speeds up delivery.
          </p>
        </div>

        {/* Timeline */}
        <h3 className="text-sm font-bold mb-4">Order Status</h3>
        <div className="relative pl-7 mb-8">
          <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-[#f5f5f4]" />
          <div className="space-y-6">
            {TIMELINE_STEPS.map((step) => (
              <div key={step.id} className="relative">
                <div
                  className={`absolute -left-[19px] w-[18px] h-[18px] rounded-full border-2 transition-colors ${
                    step.state === 'done'
                      ? 'bg-[#2d6a4f] border-[#2d6a4f]'
                      : step.state === 'active'
                      ? 'bg-white border-[#ffe302]'
                      : 'bg-[#f5f5f4] border-[#e7e5e4]'
                  }`}
                >
                  {step.state === 'done' && (
                    <span className="block text-center text-[10px] text-white leading-[16px]">✓</span>
                  )}
                  {step.state === 'active' && (
                    <span className="block text-center text-[10px] text-[#1c1917] leading-[16px]">●</span>
                  )}
                </div>
                <p className={`font-bold text-sm ${step.state === 'upcoming' ? 'text-[#78716c]' : 'text-[#1c1917]'}`}>
                  {step.label}
                </p>
                <p className="text-[13px] text-[#78716c]">
                  {step.time || `Pay ${formatBdt(order.total)} to rider`}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <Button fullWidth className="mb-3" onClick={() => router.push('/')}>
          Continue Shopping
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={handleShare}
        >
          Share Order
        </Button>
      </div>
    </div>
  );
}
