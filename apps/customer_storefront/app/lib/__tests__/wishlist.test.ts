import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWishlistItem, deleteWishlistItem, fetchWishlistItems } from '../wishlist';

describe('createWishlistItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a wishlist item successfully', async () => {
    const mockItem = {
      id: 'wl-1',
      product_id: 'prod-1',
      customer_fingerprint: 'fp-123',
      product_name: 'Milk',
      created_at: new Date().toISOString(),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ item: mockItem }),
      })
    );

    const result = await createWishlistItem('prod-1', 'fp-123', 'Milk');
    expect(result.product_id).toBe('prod-1');
    expect(result.customer_fingerprint).toBe('fp-123');
    expect(fetch).toHaveBeenCalledWith('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'prod-1', fingerprint: 'fp-123', productName: 'Milk', phone: undefined }),
    });
  });

  it('creates a wishlist item with phone', async () => {
    const mockItem = {
      id: 'wl-2',
      product_id: 'prod-2',
      customer_fingerprint: 'fp-456',
      customer_phone: '+880****5678',
      product_name: 'Bread',
      created_at: new Date().toISOString(),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ item: mockItem }),
      })
    );

    const result = await createWishlistItem('prod-2', 'fp-456', 'Bread', '+880****5678');
    expect(result.customer_phone).toBe('+880****5678');
  });

  it('throws on duplicate (23505 error code)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Already on wishlist' }),
      })
    );

    await expect(createWishlistItem('prod-1', 'fp-123', 'Milk')).rejects.toThrow('Already on wishlist');
  });

  it('throws on other DB errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'permission denied' }),
      })
    );

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
  });

  it('deletes successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
    );

    await expect(deleteWishlistItem('prod-1', 'fp-123')).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      '/api/wishlist?productId=prod-1&fingerprint=fp-123',
      { method: 'DELETE' }
    );
  });

  it('throws on DB error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'RLS violation' }),
      })
    );

    await expect(deleteWishlistItem('prod-1', 'fp-123')).rejects.toThrow('RLS violation');
  });

  it('throws when productId is empty', async () => {
    await expect(deleteWishlistItem('', 'fp-123')).rejects.toThrow('productId required');
  });
});

describe('fetchWishlistItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of product_ids', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ productIds: ['prod-1', 'prod-2'] }),
      })
    );

    const result = await fetchWishlistItems('fp-123');
    expect(result).toEqual(['prod-1', 'prod-2']);
    expect(fetch).toHaveBeenCalledWith('/api/wishlist?fingerprint=fp-123');
  });

  it('returns empty array when no items', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ productIds: [] }),
      })
    );

    const result = await fetchWishlistItems('fp-123');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty fingerprint', async () => {
    const result = await fetchWishlistItems('');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'connection failed' }),
      })
    );

    await expect(fetchWishlistItems('fp-123')).rejects.toThrow('connection failed');
  });
});