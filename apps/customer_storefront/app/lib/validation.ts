import { z } from 'zod';

export const checkoutSchema = z.object({
  orderNumber: z.string().min(1),
  tenantId: z.string().uuid(),
  storeId: z.string().uuid(),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().regex(/^(?:\+880|0)1\d{9}$/, 'Invalid phone number format'),
  customerAddress: z.string().min(10).max(300),
  notes: z.string().max(300).optional(),
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
