import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc, signal } = vi.hoisted(() => ({ rpc: vi.fn(), signal: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../supabase', () => ({ supabase: { rpc } }));
import { getGuideProducts, resolveGuideProducts } from './catalogue';
import { REVIEW_GUIDES } from './research';

const guide = REVIEW_GUIDES[0];
const rows = guide.products.map(p => ({
  id: p.id,
  name: p.verifiedName,
  brand: 'Olympic',
  sku: `SKU-${p.id.slice(0, 8)}`,
  price: 30,
  mrp: 35,
  qty_on_hand: 2,
  sellable_qty: 2,
  category_id: guide.category.id,
  image_url: `https://images.luckystore1947.com/products/${p.id}.webp`,
}));

describe('buying-guide live catalogue', () => {
  beforeEach(() => { vi.clearAllMocks(); rpc.mockReturnValue({ abortSignal: signal }); });
  it('requests only the selected IDs from the fixed public storefront projection', async () => {
    signal.mockResolvedValue({ data: rows, error: null });
    const result = await getGuideProducts(guide);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('search_storefront_catalog_v2', {
      p_store_id: '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
      p_query: '',
      p_category_id: guide.category.id,
      p_item_ids: guide.products.map(product => product.id),
      p_limit: guide.products.length,
      p_offset: 0,
    });
    expect(result[0]).toMatchObject({
      available: true,
      unitPrice: 20,
      current: { brand: 'Olympic', mrp: 35, sellable_qty: 2, image_url: expect.stringContaining('images.luckystore1947.com') },
    });
    expect(result[0].href).toContain('/product/olympic-energy-plus');
  });
  it('keeps editorial order and gates availability on sellable rather than physical stock', () => {
    const result = resolveGuideProducts(guide, [
      { ...rows[2], price: 1 },
      { ...rows[0], qty_on_hand: 9, sellable_qty: 0 },
      { ...rows[1], name: 'Different pack' },
    ]);
    expect(result.map(p => p.id)).toEqual(guide.products.map(p => p.id));
    expect(result[0]).toMatchObject({ available: false, current: { qty_on_hand: 9, sellable_qty: 0 } });
    expect(result[1]).toMatchObject({ available: false, current: null, href: null, unitPrice: null });
  });
  it('does not show foreign-category rows, deleted items or fallback fixtures', () => {
    const result = resolveGuideProducts(guide, [{ ...rows[0], category_id: '9fbe1ff0-575b-483c-b276-19bd9be03ba8' }]);
    expect(result.every(p => !p.available && p.current === null)).toBe(true);
  });
  it('rejects missing, invalid and duplicate authoritative data', () => {
    expect(() => resolveGuideProducts(guide, [{ ...rows[0], price: null }])).toThrow();
    expect(() => resolveGuideProducts(guide, [rows[0], rows[0]])).toThrow('Duplicate');
  });
  it('surfaces upstream errors instead of returning fake products or a false 404', async () => {
    signal.mockResolvedValue({ data: null, error: { message: 'upstream failure' } });
    await expect(getGuideProducts(guide)).rejects.toThrow('temporarily unavailable');
    signal.mockRejectedValue(new Error('Timeout'));
    await expect(getGuideProducts(guide)).rejects.toThrow('Timeout');
  });
});
