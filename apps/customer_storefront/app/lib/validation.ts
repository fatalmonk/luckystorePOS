import { z } from 'zod';

export const checkoutSchema = z.object({
  orderNumber: z.string().min(1),
  tenantId: z.string().uuid(),
  storeId: z.string().uuid(),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().regex(/^(?:\+880|0)1\d{9}$/, 'Enter a valid Bangladeshi phone number'),
  customerAddress: z.string().trim().min(10).max(300),
  notes: z.string().trim().max(300).optional(),
  deliverySlot: z.enum(['morning', 'evening']).optional(),
  paymentMethod: z.enum(['cod', 'bkash']),
  items: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    price: z.number().positive(),
    qty: z.number().int().positive(),
    unit: z.string().optional(),
  })).min(1),
  subtotal: z.number().positive(),
  deliveryFee: z.number().nonnegative(),
  total: z.number().positive(),
});
