import { describe, expect, it, vi } from 'vitest';
import { getCategoryBrandCounts } from './categoryBrandFacets';

describe('getCategoryBrandCounts', () => {
  it('counts complete category brands, including those absent from page one', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        ...Array.from({ length: 24 }, () => ({ name: 'Polar Vanilla', brand: 'Polar' })),
        { name: 'Igloo Chocolate', brand: 'Igloo' },
        { name: 'Igloo Mango', brand: null },
        { name: 'Unbranded Ice Cream', brand: null },
      ],
      error: null,
    });
    const counts = await getCategoryBrandCounts({ rpc } as any, 'ice-cat');
    expect(rpc).toHaveBeenCalledWith('get_storefront_category_brand_sources_v1', expect.objectContaining({
      p_category_id: 'ice-cat',
    }));
    expect(counts).toEqual({ Polar: 24, Igloo: 2 });
  });

  it('fails closed when the category facets cannot be trusted', async () => {
    await expect(getCategoryBrandCounts({
      rpc: vi.fn().mockResolvedValue({ data: undefined, error: { code: 'PGRST202' } }),
    } as any, 'ice-cat')).rejects.toThrow('unavailable');
    await expect(getCategoryBrandCounts({
      rpc: vi.fn().mockResolvedValue({ data: Array.from({ length: 1001 }, () => ({ name: 'Polar', brand: 'Polar' })), error: null }),
    } as any, 'ice-cat')).rejects.toThrow('safe facet limit');
  });
});
