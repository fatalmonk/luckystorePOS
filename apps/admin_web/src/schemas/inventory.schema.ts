import { z } from 'zod';

export const inventoryAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  adjustmentQuantity: z.number().refine(val => val !== 0, "Adjustment cannot be zero"),
  reason: z.enum(['received', 'damaged', 'lost', 'correction', 'returned']),
  notes: z.string().optional(),
});

export type InventoryAdjustmentData = z.infer<typeof inventoryAdjustmentSchema>;
