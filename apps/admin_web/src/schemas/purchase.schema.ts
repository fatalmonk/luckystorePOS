import { z } from 'zod';

export const purchaseLineSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitCost: z.number().min(0, "Unit cost cannot be negative"),
  // Metadata for UI
  itemName: z.string().optional(),
  itemSku: z.string().optional(),
});

export const purchaseEntrySchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  invoiceNumber: z.string().optional(),
  amountPaid: z.number().min(0, "Amount paid cannot be negative").default(0),
  lines: z.array(purchaseLineSchema).min(1, "At least one item is required"),
}).refine(data => {
  const totalCost = data.lines.reduce((sum, line) => sum + (line.quantity * line.unitCost), 0);
  return data.amountPaid <= totalCost;
}, {
  message: "Amount paid cannot exceed total cost",
  path: ["amountPaid"]
});

export type PurchaseEntryData = z.infer<typeof purchaseEntrySchema>;
export type PurchaseLineData = z.infer<typeof purchaseLineSchema>;
