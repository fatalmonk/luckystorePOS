'use client'; // order status page with sessionStorage read and router

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { WhatsappLogo } from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/Toast';
import { formatBdt } from '../lib/formatPrice';

interface OrderData {
  orderNumber: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  deliverySlot?: string;
  paymentMethod: 'cod' | 'bkash';
  items: { id: string; name: string; price: number; qty: number; unit?: string; total: number }[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  time: string;
}

const formatItemsList = (items: OrderData['items']) =>
  items
    .map((item, i) => {
      const unit = item.unit ? ` (${item.unit})` : '';
      return `${i + 1}. ${item.name}${unit}\n   Qty: ${item.qty} × ৳${item.price.toFixed(2)} = ৳${item.total.toFixed(2)}`;
    })
    .join('\n');

const formatOrderMessage = (order: OrderData): string => {
  const slotLabel = order.deliverySlot === 'morning' ? 'Morning (9AM–1PM)' : order.deliverySlot === 'evening' ? 'Evening (4PM–8PM)' : order.deliverySlot || 'Not selected';
  const notes = order.notes ? `\n📝 Notes: ${order.notes}` : '';

  return [
    `🛒 New Order — #${order.orderNumber}`,
    ``,
    `👤 ${order.name}`,
    `📱 ${order.phone}`,
    `📍 ${order.address}`,
    ``,
    `⏰ Delivery Slot: ${slotLabel}`,
    notes,
    notes ? `` : '',
    `🧾 Items:`,
    formatItemsList(order.items),
    ``,
    `Subtotal: ৳${order.subtotal.toFixed(2)}`,
    order.discount > 0 ? `Delivery Discount: -৳${order.discount.toFixed(2)}` : '',
    `Delivery Fee: ৳${order.deliveryFee.toFixed(2)}`,
    `*Total: ৳${order.total.toFixed(2)}*`,
    ``,
    order.paymentMethod === 'bkash' ? `💳 bKash — 01731944544` : `💵 Cash on Delivery`,
    ``,
    `Please confirm this order.`,
  ]
    .filter(Boolean)
    .join('\n');
};

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
    let orderData: OrderData | null = null;
    if (saved) {
      try {
        orderData = JSON.parse(saved);
      } catch {
        // Invalid sessionStorage — leave as null
      }
    }
    const timer = setTimeout(() => {
      setOrder(orderData);
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
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
      <div className="flex flex-col h-full items-center justify-center p-6 bg-warm-bg">
        <div className="w-16 h-16 rounded-full bg-warm-border-light animate-pulse mb-4" />
        <div className="h-5 w-32 bg-warm-border-light rounded animate-pulse mb-2" />
        <div className="h-4 w-24 bg-warm-border-light rounded animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 bg-warm-bg">
        <p className="text-warm-muted mb-4">We couldn&apos;t find your order</p>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-warm-bg">
      <div className="mx-auto max-w-6xl p-4 pt-8 sm:p-6 lg:p-10">
        {/* Success Header */}
        <div className="mb-8 flex flex-col gap-5 border-b border-warm-border pb-7 sm:flex-row sm:items-center sm:justify-between lg:mb-10 lg:pb-8">
          <div className="flex items-center gap-4">
            <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-[rgba(45,106,79,0.08)]">
              <span className="text-[32px] text-warm-success">✓</span>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-warm-success">Thanks, {order.name.split(' ')[0]}</p>
              <h1 className="text-[22px] font-extrabold tracking-tight" data-testid="order-confirmed-heading">Order placed</h1>
              <p className="mt-1 text-sm text-warm-muted">We’ll review it and confirm shortly.</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="mb-1 text-sm text-warm-muted">Order number</p>
            <p className="inline-block rounded-full bg-warm-accent px-3 py-1 font-mono text-lg font-extrabold text-warm-fg">{order.orderNumber}</p>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start lg:gap-8">
        <div className="min-w-0">
        {/* Summary */}
        <div className="mb-5 rounded-[14px] border border-warm-border bg-warm-surface p-5 shadow-warm-sm">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-warm-muted">Items</span>
            <span>{order.items.length} items</span>
          </div>
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-warm-muted">Total</span>
            <span className="text-lg font-extrabold">{formatBdt(order.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-warm-muted">Payment</span>
            <span className="text-warm-success font-bold">
              {order.paymentMethod === 'bkash' ? 'bKash' : 'Cash on Delivery'}
            </span>
          </div>
        </div>

        {order.paymentMethod === 'bkash' ? (
          <div className="border border-[#e2136e]/30 bg-[#e2136e]/5 rounded-[14px] p-4 mb-6">
            <h3 className="text-sm font-bold mb-2">bKash payment selected</h3>
            <p className="text-sm text-warm-muted">
              Send <strong className="text-warm-fg">{formatBdt(order.total)}</strong> to{' '}
              <strong className="text-warm-fg">01731944544</strong> if you have not paid yet.
            </p>
          </div>
        ) : (
          <div className="mb-6 rounded-[14px] border border-warm-border bg-warm-surface p-4">
            <h3 className="text-sm font-bold mb-2">💵 Have Cash Ready</h3>
            <p className="text-sm text-warm-muted mb-2">
              Have <strong className="text-warm-fg">{formatBdt(order.total)}</strong> ready in cash for the rider.
            </p>
            <p className="text-xs text-warm-muted">Having exact change speeds up delivery.</p>
          </div>
        )}
        </div>

        {/* Timeline */}
        <div className="min-w-0 lg:rounded-[18px] lg:border lg:border-warm-border lg:bg-warm-surface lg:p-6 lg:shadow-warm-sm">
        <h2 className="mb-4 text-lg font-extrabold tracking-tight">Order status</h2>
        <div className="relative mb-8 pl-7">
          <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-warm-border-light" />
          <div className="space-y-6">
            {TIMELINE_STEPS.map((step) => (
              <div key={step.id} className="relative">
                <div
                  className={`absolute -left-[19px] w-[18px] h-[18px] rounded-full border-2 transition-colors ${
                    step.state === 'done'
                      ? 'bg-warm-success border-warm-success'
                      : step.state === 'active'
                      ? 'bg-warm-surface border-warm-accent'
                      : 'bg-warm-border-light border-warm-border'
                  }`}
                >
                  {step.state === 'done' && (
                    <span className="block text-center text-[10px] text-white leading-[16px]">✓</span>
                  )}
                  {step.state === 'active' && (
                    <span className="block text-center text-[10px] text-warm-fg leading-[16px]">●</span>
                  )}
                </div>
                <p className={`font-bold text-sm ${step.state === 'upcoming' ? 'text-warm-muted' : 'text-warm-fg'}`}>
                  {step.label}
                </p>
                <p className="text-[13px] text-warm-muted">
                  {step.time || (order.paymentMethod === 'bkash' ? 'Payment by bKash' : `Pay ${formatBdt(order.total)} to rider`)}
                </p>
              </div>
            ))}
          </div>
        </div>
        </div>
        </div>

        {/* WhatsApp confirmation — no API credentials needed */}
        <div className="mt-6 rounded-[14px] border border-[#25D366]/40 bg-[#25D366]/[0.06] p-4 sm:p-5 lg:mt-8">
          <h3 className="flex items-center gap-2 text-sm font-bold mb-1 text-[#128C7E]"><WhatsappLogo size={20} weight="fill" aria-hidden="true" /> Get updates on WhatsApp</h3>
          <p className="text-sm text-warm-muted mb-3">
            Tap below to send your order details to our store WhatsApp.
          </p>
          <a
            href={`https://wa.me/8801731944544?text=${encodeURIComponent(formatOrderMessage(order))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
          >
            <Button fullWidth className="!bg-[#25D366] !text-white hover:!bg-[#20bd5a] focus-visible:ring-2 focus-visible:ring-[#128C7E]">
              Message on WhatsApp
            </Button>
          </a>
        </div>

        {/* Actions */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <Button fullWidth onClick={() => router.push('/')}>
            Continue Shopping
          </Button>
          <Button variant="secondary" fullWidth onClick={handleShare}>
            Share Order
          </Button>
        </div>
      </div>
    </div>
  );
}
