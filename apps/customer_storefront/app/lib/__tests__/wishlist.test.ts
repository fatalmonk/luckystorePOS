import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create the mock before the vi.mock call
const { chainable } = vi.hoisted(() => {
  function createChainableMock() {
    const mock: any = {
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    return mock;
  }
  return { chainable: createChainableMock() };
});

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => chainable),
  },
}));

import { createWishlistItem, deleteWishlistItem, fetchWishlistItems } from '../wishlist';

describe('createWishlistItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainable.single.mockReset();
    chainable.eq.mockReset();
    chainable.eq.mockReturnThis();
  });

  it('creates a wishlist item successfully', async () => {
    chainable.single.mockResolvedValue({
      data: {
        id: 'wl-1',
        product_id: 'prod-1',
        customer_fingerprint: 'fp-123',
        product_name: 'Milk',
        created_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await createWishlistItem('prod-1', 'fp-123', 'Milk');
    expect(result.product_id).toBe('prod-1');
    expect(result.customer_fingerprint).toBe('fp-123');
  });

  it('creates a wishlist item with phone', async () => {
    chainable.single.mockResolvedValue({
      data: {
        id: 'wl-2',
        product_id: 'prod-2',
        customer_fingerprint: 'fp-456',
        customer_phone: '+880****5678',
        product_name: 'Bread',
        created_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await createWishlistItem('prod-2', 'fp-456', 'Bread', '+880****5678');
    expect(result.customer_phone).toBe('+880****5678');
  });

  it('throws on duplicate (23505 error code)', async () => {
    chainable.single.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    });

    await expect(createWishlistItem('prod-1', 'fp-123', 'Milk')).rejects.toThrow('Already on wishlist');
  });

  it('throws on other DB errors', async () => {
    chainable.single.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    });

    await expect(createWishlistItem('prod-1', 'fp-123', 'Milk')).rejects.toThrow('permission denied');
  });

  it('throws when productId is empty', async () => {
    await expect(createWishlistItem('', 'fp-123', 'Milk')).rejects.toThrow('productId required');
  });

  it('throws when fingerprint is empty', async () => {
    await expect(createWishlistItem('prod-1', '', 'Milk')).rejects.toThrow('fingerprint required');
  });
});

describe('deleteWishlistItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainable.single.mockReset();
    chainable.eq.mockReset();
    chainable.delete.mockReturnThis();
    chainable.select.mockReturnThis();
    chainable.insert.mockReturnThis();
  });

  it('deletes successfully', async () => {
    // deleteWishlistItem chains: .delete().eq().eq() — last .eq() returns the result
    chainable.eq.mockReturnValueOnce(chainable) // first .eq() returns chainable for chaining
                    .mockResolvedValueOnce({ error: null }); // second .eq() returns result

    await expect(deleteWishlistItem('prod-1', 'fp-123')).resolves.toBeUndefined();
  });

  it('throws on DB error', async () => {
    chainable.eq.mockReturnValueOnce(chainable)
                    .mockResolvedValueOnce({ error: { message: 'RLS violation' } });

    await expect(deleteWishlistItem('prod-1', 'fp-123')).rejects.toThrow('RLS violation');
  });

  it('throws when productId is empty', async () => {
    await expect(deleteWishlistItem('', 'fp-123')).rejects.toThrow('productId required');
  });
});

describe('fetchWishlistItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainable.eq.mockReset();
    chainable.eq.mockReturnThis();
  });

  it('returns array of product_ids', async () => {
    chainable.eq.mockResolvedValue({
      data: [
        { product_id: 'prod-1' },
        { product_id: 'prod-2' },
      ],
      error: null,
    });

    const result = await fetchWishlistItems('fp-123');
    expect(result).toEqual(['prod-1', 'prod-2']);
  });

  it('returns empty array when no items', async () => {
    chainable.eq.mockResolvedValue({ data: [], error: null });

    const result = await fetchWishlistItems('fp-123');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty fingerprint', async () => {
    const result = await fetchWishlistItems('');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    chainable.eq.mockResolvedValue({ data: null, error: { message: 'connection failed' } });

    await expect(fetchWishlistItems('fp-123')).rejects.toThrow('connection failed');
  });
});