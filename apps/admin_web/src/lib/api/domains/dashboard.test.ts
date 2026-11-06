import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  range: vi.fn(),
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
    mocks.range.mockReset();

    const response = { data: [{ id: 'row-1' }], error: null };
    const builder = {
      select: mocks.select,
      eq: mocks.eq,
      order: mocks.order,
      limit: mocks.limit,
      range: mocks.range,
      then: (resolve: (value: typeof response) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(response).then(resolve, reject),
    };
    mocks.from.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.order.mockReturnValue(builder);
    mocks.limit.mockReturnValue(builder);
    mocks.range.mockReturnValue(builder);
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

  it('paginates all daily sales while retaining descending sale-date order', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, id) => ({ id, sale_date: '2026-11-06' }));
    const lastPage = [{ id: 1000, sale_date: '2026-11-05' }];
    const response = (rows: typeof firstPage) => ({ data: rows, error: null });
    const builder = {
      select: mocks.select,
      eq: mocks.eq,
      order: mocks.order,
      range: mocks.range,
      then: (resolve: (value: ReturnType<typeof response>) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(response(mocks.range.mock.calls.length === 1 ? firstPage : lastPage)).then(resolve, reject),
    };
    mocks.from.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.order.mockReturnValue(builder);
    mocks.range.mockReturnValue(builder);

    const rows = await dashboard.getDailySales('store-1');

    expect(rows).toHaveLength(1001);
    expect(rows[0].sale_date).toBe('2026-11-06');
    expect(rows.at(-1)?.sale_date).toBe('2026-11-05');
    expect(mocks.order).toHaveBeenCalledWith('sale_date', { ascending: false });
    expect(mocks.range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
  });

  it('loads expenses through the dashboard data boundary', async () => {
    await expect(dashboard.getExpenses('store-1')).resolves.toEqual([{ id: 'row-1' }]);

    expect(mocks.from).toHaveBeenCalledWith('expenses');
    expect(mocks.eq).toHaveBeenCalledWith('store_id', 'store-1');
    expect(mocks.order).toHaveBeenCalledWith('expense_date', { ascending: false });
  });

  it('paginates expenses with deterministic descending-date ordering', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, id) => ({ id, expense_date: '2026-11-06' }));
    const lastPage = [{ id: 1000, expense_date: '2026-11-05' }];
    const response = (rows: typeof firstPage) => ({ data: rows, error: null });
    const builder = {
      select: mocks.select,
      eq: mocks.eq,
      order: mocks.order,
      range: mocks.range,
      then: (resolve: (value: ReturnType<typeof response>) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(response(mocks.range.mock.calls.length === 1 ? firstPage : lastPage)).then(resolve, reject),
    };
    mocks.from.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.order.mockReturnValue(builder);
    mocks.range.mockReturnValue(builder);

    const rows = await dashboard.getExpenses('store-1');

    expect(rows).toHaveLength(1001);
    expect(rows.at(-1)?.expense_date).toBe('2026-11-05');
    expect(mocks.order).toHaveBeenNthCalledWith(1, 'expense_date', { ascending: false });
    expect(mocks.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(mocks.range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
  });
});
