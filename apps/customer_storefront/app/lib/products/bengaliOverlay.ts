import type { SupabaseClient } from '@supabase/supabase-js';
import { isMissingItemTranslationsTableError } from '../translationErrors';

/** Minimal product shape the overlay needs. */
export interface BengaliOverlaySource {
  id: string;
  /** Populated by the shared search overlay when a published bn row exists. */
  bengaliName?: string;
  bengaliDescription?: string;
}

/** Resolved Bengali copy for a product id, when a published translation exists. */
export interface BengaliOverlay {
  name?: string;
  description?: string;
}

const BATCH_SIZE = 100;

/**
 * Resolve published Bengali translations for a set of products.
 *
 * Products that already carry `bengaliName`/`bengaliDescription` (attached by
 * the shared storefront search overlay) are reused in memory. Only products
 * without an in-memory overlay — e.g. static snapshot/fallback catalogue rows —
 * trigger a batched `item_translations` read. This removes the duplicate
 * per-render translation query on the live Bengali routes without changing the
 * resolved output.
 *
 * Tenant/locale semantics are unchanged: locale `bn`, `review_status`
 * `published`, projection limited to `item_id, name, description`.
 */
export async function resolveBengaliOverlays(
  supabase: SupabaseClient | any,
  products: readonly BengaliOverlaySource[],
): Promise<Map<string, BengaliOverlay>> {
  const overlays = new Map<string, BengaliOverlay>();
  const missingIds: string[] = [];

  for (const product of products) {
    const id = String(product.id ?? '');
    if (!id) continue;

    // A defined bengali field means the shared search overlay already saw a
    // published bn row for this product (even if the value is an empty string).
    if (product.bengaliName !== undefined || product.bengaliDescription !== undefined) {
      overlays.set(id, {
        name: product.bengaliName,
        description: product.bengaliDescription,
      });
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) return overlays;

  for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
    const chunk = missingIds.slice(i, i + BATCH_SIZE);
    try {
      const { data, error } = await (supabase as any)
        .from('item_translations')
        .select('item_id, name, description')
        .in('item_id', chunk)
        .eq('locale', 'bn')
        .eq('review_status', 'published');

      if (error) {
        // Preserve existing graceful-degradation contract: a missing table is
        // expected in environments where the migration has not landed.
        if (!isMissingItemTranslationsTableError(error)) {
          console.error('Failed to load Bengali translations for overlay:', error);
        }
        continue;
      }

      for (const row of (data ?? []) as Array<{ item_id: string; name?: string; description?: string }>) {
        const id = String(row.item_id ?? '');
        if (!id) continue;
        overlays.set(id, { name: row.name, description: row.description });
      }
    } catch (err) {
      console.error('Unexpected error loading Bengali translations for overlay:', err);
    }
  }

  return overlays;
}
