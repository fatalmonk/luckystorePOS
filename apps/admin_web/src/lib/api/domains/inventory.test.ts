import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, from, update, eq, select } = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: { rpc, from } }));

import { inventory } from './inventory';

describe('inventory API', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    update.mockReset();
    eq.mockReset();
    select.mockReset();
    from.mockReturnValue({ update });
    update.mockReturnValue({ eq });
    eq.mockReturnValue({ select });
    select.mockResolvedValue({ data: [{ id: 'item-1' }], error: null });
  });

  it('checks inventory existence with a one-row paginated request', async () => {
    rpc.mockResolvedValueOnce({ data: [{ id: 'item-1' }], error: null });

    await expect(inventory.hasAny('store-1')).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('get_inventory_list_v2', {
      p_store_id: 'store-1',
      p_limit: 1,
      p_offset: 0,
    });
  });

  it('returns false when the paginated inventory request is empty', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(inventory.hasAny('store-1')).resolves.toBe(false);
  });

  it('sends only supported item fields to the database update', async () => {
    const updates = {
      name: 'Rice',
      last_purchased_date: '2026-11-06',
    } as Parameters<typeof inventory.updateProduct>[2];

    await inventory.updateProduct('tenant-1', 'item-1', updates);

    expect(from).toHaveBeenCalledWith('items');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rice', updated_at: expect.any(String) }),
    );
    const [payload] = update.mock.calls[0] as [Record<string, unknown>];
    expect(payload).not.toHaveProperty('last_purchased_date');
  });

  it('rejects updates with no supported fields without writing a timestamp', async () => {
    const updates = { last_purchased_date: '2026-11-06' } as Parameters<typeof inventory.updateProduct>[2];

    await expect(inventory.updateProduct('tenant-1', 'item-1', updates)).rejects.toThrow('No supported product fields provided');
    expect(from).not.toHaveBeenCalled();
  });
});
