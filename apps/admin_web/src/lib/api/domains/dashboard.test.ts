import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from } }));

import { dashboard } from './dashboard';

describe('dashboard API queries', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.select.mockReset();
    mocks.eq.mockReset();
    mocks.order.mockReset();
    mocks.limit.mockReset();

    const response = { data: [{ id: 'row-1' }], error: null };
    const builder = {
      select: mocks.select,
      eq: mocks.eq,
      order: mocks.order,
      limit: mocks.limit,
      then: (resolve: (value: typeof response) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(response).then(resolve, reject),
    };
    mocks.from.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.order.mockReturnValue(builder);
    mocks.limit.mockReturnValue(builder);
  });

  it('loads five recent delivery orders for the selected store', async () => {
    await expect(dashboard.getDeliveryOrders('store-1')).resolves.toEqual([{ id: 'row-1' }]);

    expect(mocks.from).toHaveBeenCalledWith('orders');
    expect(mocks.select).toHaveBeenCalledWith('*');
    expect(mocks.eq).toHaveBeenCalledWith('store_id', 'store-1');
    expect(mocks.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mocks.limit).toHaveBeenCalledWith(5);
  });

  it('loads daily sales through the dashboard data boundary', async () => {
    await expect(dashboard.getDailySales('store-1')).resolves.toEqual([{ id: 'row-1' }]);

    expect(mocks.from).toHaveBeenCalledWith('daily_sales');
    expect(mocks.eq).toHaveBeenCalledWith('store_id', 'store-1');
    expect(mocks.order).toHaveBeenCalledWith('sale_date', { ascending: false });
  });

  it('loads expenses through the dashboard data boundary', async () => {
    await expect(dashboard.getExpenses('store-1')).resolves.toEqual([{ id: 'row-1' }]);

    expect(mocks.from).toHaveBeenCalledWith('expenses');
    expect(mocks.eq).toHaveBeenCalledWith('store_id', 'store-1');
    expect(mocks.order).toHaveBeenCalledWith('expense_date', { ascending: false });
  });
});
