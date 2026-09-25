import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));

import { inventory } from './inventory';

describe('inventory API', () => {
  beforeEach(() => rpc.mockReset());

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
});
