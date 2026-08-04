/**
 * Adapter Types
 * 
 * Zod schemas for validating Supabase RPC responses.
 * Defensive mapping catches schema drift early.
 */

import { z } from 'zod';

// Schema for search_items_pos RPC response
export const ProductRowSchema = z.object({
  id: z.string().optional(),
  item_id: z.string().optional(),
  name: z.string(),
  price: z.number().or(z.string().transform(Number)),
  mrp: z.number().or(z.string().transform(Number)).optional().nullable(),
  category: z.string(),
  category_id: z.string().optional().nullable(),
  stock: z.number().or(z.string().transform(Number)).optional().nullable(),
  qty_on_hand: z.number().or(z.string().transform(Number)).optional().nullable(),
  description: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
});

export type ProductRow = z.infer<typeof ProductRowSchema>;

// Schema for category response
export const CategoryRowSchema = z.object({
  id: z.string(),
  slug: z.string().optional().nullable(),
  name: z.string(),
  emoji: z.string().optional().nullable(),
  parent_id: z.string().optional().nullable(),
  display_order: z.number().optional().nullable(),
  active: z.boolean().optional().nullable(),
});

export type CategoryRow = z.infer<typeof CategoryRowSchema>;



// Custom error for schema mismatches
export class SchemaMismatchError extends Error {
  constructor(
    message: string,
    public readonly zodError: z.ZodError
  ) {
    super(`Schema mismatch: ${message}`);
    this.name = 'SchemaMismatchError';
  }
}

// Validation helper
export function validateProductRow(row: unknown): ProductRow {
  const result = ProductRowSchema.safeParse(row);
  if (!result.success) {
    throw new SchemaMismatchError('Invalid product row', result.error);
  }
  return result.data;
}

export function validateCategoryRow(row: unknown): CategoryRow {
  const result = CategoryRowSchema.safeParse(row);
  if (!result.success) {
    throw new SchemaMismatchError('Invalid category row', result.error);
  }
  return result.data;
}

/**
 * Non-throwing validator for list-rendering paths.
 * Returns null (and logs a warning) instead of crashing SSR on a single bad row.
 * Use validateProductRow where strict enforcement is required.
 */
export function tryValidateProductRow(row: unknown): ProductRow | null {
  const result = ProductRowSchema.safeParse(row);
  if (!result.success) {
    console.warn('[products] Row failed validation, skipping:', {
      issues: result.error.format(),
      rowPreview:
        typeof row === 'object' && row !== null
          ? { name: (row as any).name, price: (row as any).price, id: (row as any).id ?? (row as any).item_id }
          : row,
    });
    return null;
  }
  return result.data;
}
