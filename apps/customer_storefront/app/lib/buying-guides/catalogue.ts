import 'server-only';
import { z } from 'zod';
import { supabase } from '../supabase';
import type { BuyingGuide } from './model';
import { toProductSlug } from '../products/slugify';

const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';
const rowSchema = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1),
  brand: z.string().trim().min(1).nullable(),
  sku: z.string().trim().min(1).nullable(),
  price: z.number().finite().positive(),
  qty_on_hand: z.number().finite(), sellable_qty: z.number().finite().nonnegative(),
  category_id: z.string().uuid(),
  image_url: z.string().url().nullable(),
});
export type GuideCatalogueRow = z.infer<typeof rowSchema>;
export type GuideProduct = BuyingGuide['products'][number] & {
  current: GuideCatalogueRow | null;
  available: boolean;
  href: string | null;
  unitPrice: number | null;
};

export function resolveGuideProducts(guide: BuyingGuide, rows: unknown[]): GuideProduct[] {
  const parsed = z.array(rowSchema).parse(rows);
  if (new Set(parsed.map(p => p.id)).size !== parsed.length) throw new Error('Duplicate catalogue product IDs');
  return guide.products.map(product => {
    const row = parsed.find(p => p.id === product.id && p.category_id === guide.category.id);
    // A name/pack change invalidates the product comparison, not the whole article's existence.
    const current = row?.name === product.verifiedName ? row : null;
    return {
      ...product, current,
      available: !!current && current.sellable_qty > 0,
      href: current ? `/product/${toProductSlug(current.name, current.id)}` : null,
      unitPrice: current ? current.price * 100 / product.quantity.value : null,
    };
  });
}

/** Public, tenant-scoped projection only. No browser session, fixtures or privileged credentials. */
export async function getGuideProducts(guide: BuyingGuide): Promise<GuideProduct[]> {
  const { data, error } = await supabase.rpc('search_storefront_catalog_v2', {
    p_store_id: STORE_ID,
    p_query: '',
    p_category_id: guide.category.id,
    p_item_ids: guide.products.map(product => product.id),
    p_limit: guide.products.length,
    p_offset: 0,
  }).abortSignal(AbortSignal.timeout(8000));
  if (error || !Array.isArray(data)) throw new Error('Buying-guide catalogue is temporarily unavailable');
  return resolveGuideProducts(guide, data);
}
