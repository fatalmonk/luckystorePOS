'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../components/ui/Button';

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
  { id: 'placed', label: 'Order Placed', time: 'Just now', done: true, active: false },
  { id: 'confirmed', label: 'Order Confirmed', time: 'Cashier will confirm shortly', done: false, active: true },
  { id: 'preparing', label: 'Preparing', time: 'Packing your items', done: false, active: false },
  { id: 'delivery', label: 'Out for Delivery', time: 'Est. 45–60 min', done: false, active: false },
  { id: 'delivered', label: 'Delivered', time: null, done: false, active: false },
];

export default function OrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('lastOrder');
    if (saved) {
      setOrder(JSON.parse(saved));
    }
  }, []);

  if (!order) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 bg-[#faf8f5]">
        <p className="text-[#78716c] mb-4">No order found</p>
        <Link href="/">
          <Button>Go Home</Button>
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
          <p className="font-mono text-lg font-extrabold text-[#FFF34D]">{order.orderNumber}</p>
        </div>

        {/* Summary */}
        <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-4 mb-5">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-[#78716c]">Items</span>
            <span>{order.items} items</span>
          </div>
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-[#78716c]">Total</span>
            <span className="font-semibold">৳{order.total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#78716c]">Payment</span>
            <span className="text-[#2d6a4f] font-bold">Cash on Delivery</span>
          </div>
        </div>

        {/* Delivery Details */}
        <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-4 mb-6">
          <h3 className="text-sm font-bold mb-3">Delivery Details</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex">
              <span className="text-[#a8a29e] w-16">To</span>
              <span className="font-semibold">{order.name}</span>
            </div>
            <div className="flex">
              <span className="text-[#a8a29e] w-16">Phone</span>
              <span>{order.phone}</span>
            </div>
            <div className="flex">
              <span className="text-[#a8a29e] w-16">Address</span>
              <span>{order.address}</span>
            </div>
          </div>
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
                    step.done
                      ? 'bg-[#FFF34D] border-[#FFF34D]'
                      : step.active
                      ? 'bg-white border-[#FFF34D]'
                      : 'bg-[#f5f5f4] border-[#e7e5e4]'
                  }`}
                />
                <p className="font-bold text-sm">{step.label}</p>
                <p className="text-[13px] text-[#78716c]">
                  {step.time || `Pay ৳${order.total} to rider`}
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
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Order link copied');
          }}
        >
          Share Order
        </Button>
      </div>
    </div>
  );
}
