export interface MobileCheckoutItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  unit?: string;
}

export interface MobileCheckoutRequest {
  orderNumber?: string;
  idempotencyKey: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  deliverySlot?: 'morning' | 'evening';
  paymentMethod: 'cod' | 'bkash';
  items: MobileCheckoutItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export const FREE_DELIVERY_THRESHOLD = 500;
export const STANDARD_DELIVERY_FEE = 40;

export function calculateOrderTotals(items: { price: number; qty: number }[]) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD || items.length === 0 ? 0 : STANDARD_DELIVERY_FEE;
  const total = subtotal + deliveryFee;
  return { subtotal, deliveryFee, total };
}

export function validatePhone(phone: string): boolean {
  const clean = phone.replace(/[\s-]/g, '');
  return /^(?:\+880|0)1\d{9}$/.test(clean);
}

export function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `LSO-${dateStr}-${randomSuffix}`;
}
