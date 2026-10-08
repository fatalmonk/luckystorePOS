import { z } from 'zod';
import { resolveApiBaseUrl } from './home';

export const OrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const MobileOrderItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  qty: z.number().int().positive(),
  unit: z.string().optional(),
  total: z.number().nonnegative().optional(),
});

export const MobileOrderDtoSchema = z.object({
  id: z.string().optional(),
  orderNumber: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerAddress: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(MobileOrderItemSchema),
  subtotal: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  total: z.number().nonnegative(),
  status: OrderStatusSchema,
  paymentMethod: z.enum(['cod', 'bkash']),
  deliverySlot: z.string().optional(),
  createdAt: z.string().optional(),
});

export const OrderResponseSchema = z.object({
  ok: z.literal(true),
  order: MobileOrderDtoSchema,
});

export const OrdersListResponseSchema = z.object({
  ok: z.literal(true),
  orders: z.array(MobileOrderDtoSchema),
});

export type MobileOrderItem = z.infer<typeof MobileOrderItemSchema>;
export type MobileOrderDto = z.infer<typeof MobileOrderDtoSchema>;

export const TIMELINE_STEPS = [
  { id: 'pending', labelEn: 'Order Placed', labelBn: 'অর্ডার নেওয়া হয়েছে' },
  { id: 'confirmed', labelEn: 'Confirmed', labelBn: 'অর্ডার নিশ্চিত' },
  { id: 'preparing', labelEn: 'Preparing', labelBn: 'প্যাকেট প্রস্তুত' },
  { id: 'out_for_delivery', labelEn: 'Out for Delivery', labelBn: 'ডেলিভারিতে বের হয়েছে' },
  { id: 'delivered', labelEn: 'Delivered', labelBn: 'ডেলিভারি সম্পন্ন' },
] as const;

export function getStatusStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'confirmed':
      return 1;
    case 'preparing':
      return 2;
    case 'out_for_delivery':
      return 3;
    case 'delivered':
      return 4;
    case 'cancelled':
      return -1;
    default:
      return 0;
  }
}

export function buildWhatsAppOrderMessage(order: MobileOrderDto): string {
  const slotLabel =
    order.deliverySlot === 'morning'
      ? 'Morning (9AM–1PM)'
      : order.deliverySlot === 'evening'
      ? 'Evening (4PM–8PM)'
      : order.deliverySlot || 'Standard Delivery';

  const itemsList = order.items
    .map((item, i) => {
      const unit = item.unit ? ` (${item.unit})` : '';
      const itemTotal = (item.total ?? item.price * item.qty).toFixed(2);
      return `${i + 1}. ${item.name}${unit}\n   Qty: ${item.qty} × ৳${item.price.toFixed(2)} = ৳${itemTotal}`;
    })
    .join('\n');

  const notesText = order.notes ? `\n📝 Notes: ${order.notes}` : '';

  return [
    `🛒 Lucky Store Order — #${order.orderNumber}`,
    ``,
    `👤 Customer: ${order.customerName}`,
    `📱 Phone: ${order.customerPhone}`,
    `📍 Delivery Address: ${order.customerAddress}`,
    `⏰ Delivery Slot: ${slotLabel}`,
    notesText,
    ``,
    `🧾 Order Items:`,
    itemsList,
    ``,
    `Subtotal: ৳${order.subtotal.toFixed(2)}`,
    `Delivery Fee: ৳${order.deliveryFee.toFixed(2)}`,
    `*Total: ৳${order.total.toFixed(2)}*`,
    ``,
    order.paymentMethod === 'bkash' ? `💳 bKash Payment (01731944544)` : `💵 Cash on Delivery`,
    ``,
    `Please confirm my order delivery. Thank you!`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function fetchOrder(
  orderNumber: string,
  trackingToken?: string,
  signal?: AbortSignal
): Promise<MobileOrderDto | null> {
  const baseUrl = resolveApiBaseUrl();
  const url = `${baseUrl}/api/mobile/v1/orders?num=${encodeURIComponent(orderNumber)}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (trackingToken) {
    headers['x-order-tracking-token'] = trackingToken;
  }

  const response = await fetch(url, { method: 'GET', headers, signal });
  if (response.status === 404 || response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Order request failed (${response.status})`);
  }

  const data = await response.json();
  const parsed = OrderResponseSchema.parse(data);
  return parsed.order;
}
