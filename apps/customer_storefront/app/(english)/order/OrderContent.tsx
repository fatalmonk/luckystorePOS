'use client'; // order status page with sessionStorage read and router

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { WhatsappLogo } from '@phosphor-icons/react/dist/csr/WhatsappLogo';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/Toast';
import { formatBdt } from '../../lib/formatPrice';
import type { Locale } from '../../lib/i18n/config';
import { withLocale } from '../../lib/i18n/config';
import { getDictionary, type Dictionary } from '../../lib/i18n/dictionaries';

interface OrderData {
  id?: string;
  trackingToken?: string;
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
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
}

type OrderDictionary = Dictionary['order'];
type TimelineStatus = Exclude<OrderData['status'], 'cancelled'>;

const formatCopy = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );

const formatRichCopy = (template: string, values: Record<string, ReactNode>): ReactNode[] =>
  template.split(/(\{[^}]+\})/g).filter(Boolean).map((part) => {
    const key = /^\{([^}]+)\}$/.exec(part)?.[1];
    return key && key in values ? values[key] : part;
  });

const formatItemsList = (items: OrderData['items'], copy: OrderDictionary) =>
  items
    .map((item, i) => {
      const unit = item.unit ? ` (${item.unit})` : '';
      const quantity = formatCopy(copy.whatsapp.quantity, {
        quantity: item.qty,
        price: item.price.toFixed(2),
        total: item.total.toFixed(2),
      });
      return `${i + 1}. ${item.name}${unit}\n   ${quantity}`;
    })
    .join('\n');

const formatOrderMessage = (order: OrderData, copy: OrderDictionary): string => {
  const slotLabel = order.deliverySlot === 'morning'
    ? copy.whatsapp.morningSlot
    : order.deliverySlot === 'evening'
      ? copy.whatsapp.eveningSlot
      : order.deliverySlot || copy.whatsapp.noSlot;
  const notes = order.notes
    ? `\n${formatCopy(copy.whatsapp.notes, { notes: order.notes })}`
    : '';

  return [
    formatCopy(copy.whatsapp.newOrder, { orderNumber: order.orderNumber }),
    ``,
    `👤 ${order.name}`,
    `📱 ${order.phone}`,
    `📍 ${order.address}`,
    ``,
    formatCopy(copy.whatsapp.deliverySlot, { slot: slotLabel }),
    notes,
    notes ? `` : '',
    copy.whatsapp.items,
    formatItemsList(order.items, copy),
    ``,
    formatCopy(copy.whatsapp.subtotal, { amount: order.subtotal.toFixed(2) }),
    order.discount > 0
      ? formatCopy(copy.whatsapp.deliveryDiscount, { amount: order.discount.toFixed(2) })
      : '',
    formatCopy(copy.whatsapp.deliveryFee, { amount: order.deliveryFee.toFixed(2) }),
    formatCopy(copy.whatsapp.total, { amount: order.total.toFixed(2) }),
    ``,
    order.paymentMethod === 'bkash' ? copy.whatsapp.bkash : copy.whatsapp.cashOnDelivery,
    ``,
    copy.whatsapp.confirm,
  ]
    .filter(Boolean)
    .join('\n');
};

const TIMELINE_STEPS: readonly TimelineStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
];

export default function OrderContent({ locale = 'en' }: { locale?: Locale }) {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const copy = getDictionary(locale).order;
  const orderNumber = searchParams.get('num');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }

    const hashToken = new URLSearchParams(window.location.hash.slice(1)).get('track');
    let savedToken: string | null = null;
    try {
      savedToken = sessionStorage.getItem('lastOrderTrackingToken');
    } catch {
      // Tracking still works for signed-in customers without browser storage.
    }
    const token = hashToken || savedToken;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refreshOrder = async () => {
      let retryOnError = true;
      try {
        const response = await fetch(`/api/orders?num=${encodeURIComponent(orderNumber)}`, {
          cache: 'no-store',
          headers: token ? { 'x-order-tracking-token': token } : {},
        });
        const result = await response.json();
        if (!response.ok || !result.ok || !result.order) {
          retryOnError = response.status >= 500 || response.status === 429;
          if (!retryOnError && active) setOrder(null);
          if (retryOnError) throw new Error('Order status refresh failed');
          return;
        }

        retryOnError = false;
        const row = result.order;
        const nextOrder: OrderData = {
          id: row.id,
          trackingToken: token || undefined,
          orderNumber: row.order_number,
          name: row.customer_name,
          phone: row.customer_phone,
          address: row.customer_address,
          notes: row.notes || undefined,
          deliverySlot: row.delivery_slot || undefined,
          paymentMethod: row.payment_method,
          items: (Array.isArray(row.items) ? row.items : []).map((item: any) => ({
            ...item,
            total: Number(item.price) * Number(item.qty),
          })),
          subtotal: Number(row.subtotal),
          deliveryFee: Number(row.delivery_fee),
          discount: 0,
          total: Number(row.total),
          time: row.created_at,
          status: row.status,
        };
        if (!active) return;
        setOrder(nextOrder);
        if (!['delivered', 'cancelled'].includes(nextOrder.status)) {
          timer = setTimeout(refreshOrder, 15000);
        }
      } catch {
        if (active && retryOnError) timer = setTimeout(refreshOrder, 15000);
      } finally {
        if (active) setLoading(false);
      }
    };

    void refreshOrder();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [orderNumber]);

  const handleShare = async () => {
    if (!order) return;
    const orderPath = withLocale('/order', locale);
    const shareUrl = order.trackingToken
      ? `${window.location.origin}${orderPath}?num=${encodeURIComponent(order.orderNumber)}#track=${encodeURIComponent(order.trackingToken)}`
      : `${window.location.origin}${orderPath}?num=${encodeURIComponent(order.orderNumber)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: formatCopy(copy.shareTitle, { orderNumber: order.orderNumber }),
          text: formatCopy(copy.shareText, { orderNumber: order.orderNumber }),
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      showToast(copy.linkCopied);
    } catch {
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
        <p className="text-warm-muted mb-4">{copy.notFound}</p>
        <Link href={withLocale('/', locale)}>
          <Button>{copy.backToHome}</Button>
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
              <p className="mb-1 text-sm font-bold text-warm-success">
                {formatCopy(copy.thanks, { name: order.name.split(' ')[0] })}
              </p>
              <h1 className="text-[22px] font-extrabold tracking-tight" data-testid="order-confirmed-heading">{copy.placed}</h1>
          <p className="mt-1 text-sm text-warm-muted" aria-live="polite">
            {order.status === 'cancelled'
              ? copy.cancelledStatus
              : formatCopy(copy.currentStatus, { status: copy.statuses[order.status] })}
          </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="mb-1 text-sm text-warm-muted">{copy.orderNumber}</p>
            <p className="inline-block rounded-full bg-warm-accent px-3 py-1 font-mono text-lg font-extrabold text-warm-fg">{order.orderNumber}</p>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start lg:gap-8">
        <div className="min-w-0">
        {/* Summary */}
        <div className="mb-5 rounded-[14px] border border-warm-border bg-warm-surface p-5 shadow-warm-sm">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-warm-muted">{copy.items}</span>
            <span>{formatCopy(copy.itemCount, { count: order.items.length })}</span>
          </div>
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-warm-muted">{copy.total}</span>
            <span className="text-lg font-extrabold">{formatBdt(order.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-warm-muted">{copy.payment}</span>
            <span className="text-warm-success font-bold">
              {order.paymentMethod === 'bkash' ? copy.paymentMethods.bkash : copy.paymentMethods.cod}
            </span>
          </div>
        </div>

        {order.paymentMethod === 'bkash' ? (
          <div className="border border-[#e2136e]/30 bg-[#e2136e]/5 rounded-[14px] p-4 mb-6">
            <h3 className="text-sm font-bold mb-2">{copy.bkashTitle}</h3>
            <p className="text-sm text-warm-muted">
              {formatRichCopy(copy.bkashInstructions, {
                total: <strong key="total" className="text-warm-fg">{formatBdt(order.total)}</strong>,
                phone: <strong key="phone" className="text-warm-fg">01731944544</strong>,
              })}
            </p>
          </div>
        ) : (
          <div className="mb-6 rounded-[14px] border border-warm-border bg-warm-surface p-4">
            <h3 className="text-sm font-bold mb-2">{copy.cashTitle}</h3>
            <p className="text-sm text-warm-muted mb-2">
              {formatRichCopy(copy.cashInstructions, {
                total: <strong key="total" className="text-warm-fg">{formatBdt(order.total)}</strong>,
              })}
            </p>
            <p className="text-xs text-warm-muted">{copy.exactChange}</p>
          </div>
        )}
        </div>

        {/* Timeline */}
        <div className="min-w-0 lg:rounded-[18px] lg:border lg:border-warm-border lg:bg-warm-surface lg:p-6 lg:shadow-warm-sm">
        <h2 className="mb-4 text-lg font-extrabold tracking-tight">{copy.statusTitle}</h2>
        <div className="relative mb-8 pl-7">
          <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-warm-border-light" />
          <div className="space-y-6">
            {TIMELINE_STEPS.map((step, index) => {
              const currentIndex = TIMELINE_STEPS.findIndex((status) => status === order.status);
              const isCancelled = order.status === 'cancelled';
              const state = isCancelled ? 'upcoming' : index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'upcoming';
              return (
              <div key={step} className="relative">
                <div
                  className={`absolute -left-[19px] w-[18px] h-[18px] rounded-full border-2 transition-colors ${
                    state === 'done'
                      ? 'bg-warm-success border-warm-success'
                      : state === 'active'
                      ? 'bg-warm-surface border-warm-accent'
                      : 'bg-warm-border-light border-warm-border'
                  }`}
                >
                  {state === 'done' && (
                    <span className="block text-center text-[10px] text-white leading-[16px]">✓</span>
                  )}
                  {state === 'active' && (
                    <span className="block text-center text-[10px] text-warm-fg leading-[16px]">●</span>
                  )}
                </div>
                <p className={`font-bold text-sm ${state === 'upcoming' ? 'text-warm-muted' : 'text-warm-fg'}`}>
                  {copy.timeline[step]}
                </p>
                {state === 'active' && (
                  <p className="text-[13px] text-warm-muted">
                    {order.status === 'pending' ? copy.pendingUpdate : copy.latestUpdate}
                  </p>
                )}
              </div>
              );
            })}
            {order.status === 'cancelled' && <p className="text-sm font-semibold text-red-700">{copy.cancelled}</p>}
          </div>
        </div>
        </div>
        </div>

        {/* WhatsApp confirmation — no API credentials needed */}
        <div className="mt-6 rounded-[14px] border border-[#25D366]/40 bg-[#25D366]/[0.06] p-4 sm:p-5 lg:mt-8">
          <h3 className="flex items-center gap-2 text-sm font-bold mb-1 text-[#128C7E]"><WhatsappLogo size={20} weight="fill" aria-hidden="true" /> {copy.contactTitle}</h3>
          <p className="text-sm text-warm-muted mb-3">
            {copy.contactDescription}
          </p>
          <a
            href={`https://wa.me/8801731944544?text=${encodeURIComponent(formatOrderMessage(order, copy))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
          >
            <Button fullWidth className="!bg-[#25D366] !text-white hover:!bg-[#20bd5a] focus-visible:ring-2 focus-visible:ring-[#128C7E]">
              {copy.messageStore}
            </Button>
          </a>
        </div>

        {/* Actions */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <Button fullWidth onClick={() => router.push(withLocale('/', locale))}>
            {copy.continueShopping}
          </Button>
          {order.trackingToken && (
            <Button variant="secondary" fullWidth onClick={handleShare}>
              {copy.shareOrder}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
