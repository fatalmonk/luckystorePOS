import { z } from 'zod';
import { resolveApiBaseUrl } from './home';
import { CartItem } from '../state/cart-context';

export const CheckoutItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().finite().nonnegative(),
  qty: z.number().int().positive(),
  unit: z.string().optional(),
});

export const CheckoutOrderSchema = z.object({
  id: z.string().optional(),
  order_number: z.string().min(1),
  replayed: z.boolean().optional(),
  trackingToken: z.string().optional(),
});

export const CheckoutSuccessResponseSchema = z.object({
  ok: z.literal(true),
  order: CheckoutOrderSchema,
});

export const PriceMismatchResponseSchema = z.object({
  ok: z.literal(false),
  code: z.literal('PRICE_MISMATCH'),
  error: z.string(),
  items: z.array(CheckoutItemSchema),
  subtotal: z.number(),
  deliveryFee: z.number(),
  total: z.number(),
});

export const CheckoutErrorResponseSchema = z.object({
  ok: z.literal(false),
  code: z.string().optional(),
  error: z.string(),
});

export type CheckoutItem = z.infer<typeof CheckoutItemSchema>;
export type CheckoutOrder = z.infer<typeof CheckoutOrderSchema>;

export interface CheckoutFormData {
  name: string;
  phone: string;
  address: string;
  notes: string;
  deliverySlot: 'morning' | 'evening';
  paymentMethod: 'cod' | 'bkash';
  trxId: string;
}

export interface CheckoutFormErrors {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
  trxId?: string;
}

export function validatePhone(phone: string): boolean {
  const clean = phone.replace(/[\s-]/g, '');
  return /^(?:\+880|0)1\d{9}$/.test(clean);
}

export function validateCheckoutForm(data: CheckoutFormData, isBn = false): CheckoutFormErrors {
  const errors: CheckoutFormErrors = {};

  if (!data.name.trim()) {
    errors.name = isBn ? 'আপনার পূর্ণ নাম লিখুন' : 'Enter your full name';
  } else if (data.name.trim().length < 2) {
    errors.name = isBn ? 'নাম অন্তত ২ অক্ষরের হতে হবে' : 'Name must be at least 2 characters';
  } else if (data.name.trim().length > 100) {
    errors.name = isBn ? 'নাম ১০০ অক্ষরের মধ্যে রাখুন' : 'Keep name under 100 characters';
  }

  if (!data.phone.trim()) {
    errors.phone = isBn ? 'মোবাইল নম্বর লিখুন' : 'Enter your mobile number';
  } else if (!validatePhone(data.phone)) {
    errors.phone = isBn ? 'সঠিক নম্বর দিন (যেমন: 01XXXXXXXXX)' : 'Use format 01XXXXXXXXX or +8801XXXXXXXXX';
  }

  if (!data.address.trim()) {
    errors.address = isBn ? 'ডেলিভারি ঠিকানা লিখুন' : 'Enter your delivery address';
  } else if (data.address.trim().length < 10) {
    errors.address = isBn ? 'বাড়ি, রোড ও এলাকার নাম বিস্তারিত লিখুন' : 'Include house, road, and area details (min 10 chars)';
  } else if (data.address.trim().length > 300) {
    errors.address = isBn ? 'ঠিকানা ৩০০ অক্ষরের মধ্যে রাখুন' : 'Keep address under 300 characters';
  }

  if (data.notes && data.notes.length > 200) {
    errors.notes = isBn ? 'নির্দেশনা ২০০ অক্ষরের মধ্যে রাখুন' : 'Keep instructions under 200 characters';
  }

  if (data.paymentMethod === 'bkash' && data.trxId && data.trxId.length > 50) {
    errors.trxId = isBn ? 'লেনদেন আইডি ৫০ অক্ষরের মধ্যে রাখুন' : 'Keep transaction ID under 50 characters';
  }

  return errors;
}

export function generateUUID(): string {
  // RFC4122 v4 UUID generator using platform CSPRNG
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // RFC4122 Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error('A secure cryptographic random source is required to generate UUID');
}

export function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = generateUUID().slice(0, 8).toUpperCase();
  return `LSO-${dateStr}-${randomSuffix}`;
}

export interface SubmitCheckoutParams {
  formData: CheckoutFormData;
  cart: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  idempotencyKey?: string;
  orderNumber?: string;
  authToken?: string | null;
}

export type SubmitCheckoutResult =
  | { success: true; order: CheckoutOrder }
  | { success: false; priceMismatch: true; updatedItems: CheckoutItem[]; subtotal: number; deliveryFee: number; total: number; message: string }
  | { success: false; priceMismatch?: false; message: string };

export async function submitCheckout(
  params: SubmitCheckoutParams,
  signal?: AbortSignal
): Promise<SubmitCheckoutResult> {
  const { formData, cart, subtotal, deliveryFee, total } = params;
  const idempotencyKey = params.idempotencyKey || generateUUID();
  const orderNumber = params.orderNumber || generateOrderNumber();
  const cleanPhone = formData.phone.replace(/[\s-]/g, '');

  const notesParts: string[] = [];
  if (formData.notes.trim()) notesParts.push(formData.notes.trim());
  if (formData.paymentMethod === 'bkash' && formData.trxId.trim()) {
    notesParts.push(`bKash TrxID: ${formData.trxId.trim()}`);
  }
  const combinedNotes = notesParts.join(' — ') || undefined;

  const payload = {
    orderNumber,
    idempotencyKey,
    customerName: formData.name.trim(),
    customerPhone: cleanPhone,
    customerAddress: formData.address.trim(),
    notes: combinedNotes,
    deliverySlot: formData.deliverySlot,
    paymentMethod: formData.paymentMethod,
    items: cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
      unit: i.unit,
    })),
    subtotal,
    deliveryFee,
    total,
  };

  const baseUrl = resolveApiBaseUrl();
  const url = `${baseUrl}/api/mobile/v1/checkout`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (params.authToken) {
      headers['Authorization'] = `Bearer ${params.authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      signal,
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      const parsed = CheckoutSuccessResponseSchema.parse(data);
      return { success: true, order: parsed.order };
    }

    if (data.code === 'PRICE_MISMATCH' && data.items) {
      const parsedMismatch = PriceMismatchResponseSchema.parse(data);
      return {
        success: false,
        priceMismatch: true,
        updatedItems: parsedMismatch.items,
        subtotal: parsedMismatch.subtotal,
        deliveryFee: parsedMismatch.deliveryFee,
        total: parsedMismatch.total,
        message: parsedMismatch.error || 'Prices have been updated.',
      };
    }

    return {
      success: false,
      message: data.error || `Checkout failed (${response.status})`,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    return {
      success: false,
      message: err.message || 'Unable to connect to server. Please try again.',
    };
  }
}
