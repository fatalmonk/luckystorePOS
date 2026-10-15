import 'server-only';
import { z } from 'zod';
import { supabase } from '../supabase';
import type { BuyingGuide } from './model';
import { toProductSlug } from '../products/slugify';

const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';
const rowSchema = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1),
  price: z.number().finite().positive(), qty_on_hand: z.number().finite(),
  category_id: z.string().uuid(),
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
      available: !!current && current.qty_on_hand > 0,
      href: current ? `/product/${toProductSlug(current.name, current.id)}` : null,
      unitPrice: current ? current.price * 100 / product.quantity.value : null,
    };
  });
}

/** Public, tenant-scoped projection only. No browser session, fixtures or privileged credentials. */
export async function getGuideProducts(guide: BuyingGuide): Promise<GuideProduct[]> {
  const rows: unknown[] = [];
  const pageSize = 1000;
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase.rpc('search_storefront_catalog', {
      p_store_id: STORE_ID, p_query: '', p_category_id: guide.category.id,
      p_limit: pageSize, p_offset: page * pageSize,
    }).abortSignal(AbortSignal.timeout(8000));
    if (error || !Array.isArray(data)) throw new Error('Buying-guide catalogue is temporarily unavailable');
    rows.push(...data);
    if (data.length < pageSize) return resolveGuideProducts(guide, rows);
  }
  throw new Error('Buying-guide catalogue pagination incomplete');
}
