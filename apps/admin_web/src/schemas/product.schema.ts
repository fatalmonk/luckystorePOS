import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  price: z.number().min(0, "Price cannot be negative"),
  cost: z.number().min(0, "Cost cannot be negative").optional(),
  minStockLevel: z.number().min(0, "Min stock cannot be negative").default(5),
  active: z.boolean().default(true),
});

export type ProductData = z.infer<typeof productSchema>;
