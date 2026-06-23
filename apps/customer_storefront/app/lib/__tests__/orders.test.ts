import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase module
vi.mock('../supabase', () => {
  const mockRpc = vi.fn();
  const mockChannel = vi.fn(() => ({
    subscribe: vi.fn((cb: (status: string) => void) => {
      // Simulate successful subscription
      setTimeout(() => cb('SUBSCRIBED'), 0);
      return { send: vi.fn().mockResolvedValue(undefined) };
    }),
    send: vi.fn().mockResolvedValue(undefined),
  }));
  const mockRemoveChannel = vi.fn();

  return {
    supabase: {
      rpc: mockRpc,
      channel: mockChannel,
      removeChannel: mockRemoveChannel,
    },
  };
});

import { createOrder } from '../orders';

const validInput = {
  orderNumber: 'LSO-20260101-ABCD1234',
  customerName: 'Karim Ahmed',
  customerPhone: '01712345678',
  customerAddress: '123 Test Road, Chittagong',
  items: [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Milk', price: 80, qty: 2 }],
  subtotal: 160,
  deliveryFee: 40,
  total: 200,
};

describe('createOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns created order on success', async () => {
    const { supabase } = await import('../supabase');
    (supabase.rpc as any).mockResolvedValue({
      data: { id: 'order-123', order_number: 'LSO-20260101-ABCD1234' },
      error: null,
    });

    const result = await createOrder(validInput);
    expect(result.id).toBe('order-123');
    expect(result.order_number).toBe('LSO-20260101-ABCD1234');
  });

  it('throws on validation failure (invalid phone)', async () => {
    await expect(
      createOrder({ ...validInput, customerPhone: '12345' })
    ).rejects.toThrow();
  });

  it('throws on validation failure (empty items)', async () => {
    await expect(
      createOrder({ ...validInput, items: [] })
    ).rejects.toThrow();
  });

  it('throws on validation failure (empty order number)', async () => {
    await expect(
      createOrder({ ...validInput, orderNumber: '' })
    ).rejects.toThrow();
  });

  it('throws when RPC returns error', async () => {
    const { supabase } = await import('../supabase');
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'Insufficient stock for item xyz' },
    });

    await expect(createOrder(validInput)).rejects.toThrow('Insufficient stock');
  });

  it('passes Zod-validated data to RPC (not raw input)', async () => {
    const { supabase } = await import('../supabase');
    (supabase.rpc as any).mockResolvedValue({
      data: { id: 'order-456', order_number: 'LSO-20260101-ABCD1234' },
      error: null,
    });

    await createOrder(validInput);

    // Verify RPC was called
    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_order_with_stock',
      expect.objectContaining({
        p_order_number: 'LSO-20260101-ABCD1234',
        p_customer_name: 'Karim Ahmed',
        p_customer_phone: '01712345678',
        p_customer_address: '123 Test Road, Chittagong',
        p_items: validInput.items,
        p_subtotal: 160,
        p_delivery_fee: 40,
        p_total: 200,
      })
    );
  });

  it('passes notes and deliverySlot as null when not provided', async () => {
    const { supabase } = await import('../supabase');
    (supabase.rpc as any).mockResolvedValue({
      data: { id: 'order-789', order_number: 'LSO-20260101-ABCD1234' },
      error: null,
    });

    await createOrder(validInput);

    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_order_with_stock',
      expect.objectContaining({
        p_notes: null,
        p_delivery_slot: null,
      })
    );
  });
});