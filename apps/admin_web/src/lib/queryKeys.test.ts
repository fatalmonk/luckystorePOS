import { describe, expect, it, vi } from 'vitest';
import { settingsQueryKeys } from './queryKeys';

describe('settings query keys', () => {
  it('uses the same store-scoped payment-method key for reads and invalidation', () => {
    const readKey = settingsQueryKeys.paymentMethods('store-1');
    const invalidateQueries = vi.fn();
    invalidateQueries({ queryKey: settingsQueryKeys.paymentMethods('store-1') });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: readKey });
  });
});
