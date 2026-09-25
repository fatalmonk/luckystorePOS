import { describe, expect, it } from 'vitest';
import { hasActivePaymentMethod } from './setupChecklistState';

describe('setup checklist state', () => {
  it('does not complete payment setup when every method is inactive', () => {
    expect(hasActivePaymentMethod([{ is_active: false }, { is_active: false }])).toBe(false);
  });

  it('completes payment setup when at least one method is active', () => {
    expect(hasActivePaymentMethod([{ is_active: false }, { is_active: true }])).toBe(true);
  });
});
