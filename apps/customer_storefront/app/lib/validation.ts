import { z } from 'zod';

// Zod 4 z.string().uuid() enforces RFC 4122 versions 1-8; our internal tenant ID
// uses version-nibble 0 (00000000-0000-0000-0000-000000000001). Use a relaxed
// 8-4-4-4-12 hex pattern for internal IDs while keeping item IDs strict.
const uuidLike = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID',
);

export const checkoutSchema = z.object({
  orderNumber: z.string().min(1),
  idempotencyKey: z.string().trim().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
  tenantId: uuidLike,
  storeId: uuidLike,
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
