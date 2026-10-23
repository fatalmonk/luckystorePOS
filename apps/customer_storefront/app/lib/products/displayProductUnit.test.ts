import { describe, expect, it } from 'vitest';
import { getDisplayProductUnit } from './displayProductUnit';

describe('getDisplayProductUnit', () => {
  it('uses an explicit pack size from the product name when the catalog unit is generic', () => {
    expect(getDisplayProductUnit('Polar 2 in 1 Vanilla-Chocolate 1 Liter', 'pc')).toBe('1 Liter');
  });

  it('keeps fractional package sizes together instead of reading the denominator as the size', () => {
    expect(getDisplayProductUnit('Frozen dessert 1/2 Liter', 'pc')).toBe('1/2 Liter');
  });

  it('keeps generic units when the product name has no measurable pack size', () => {
    expect(getDisplayProductUnit('Chocolate Cup', 'pc')).toBe('pc');
  });

  it('preserves a specific catalog unit', () => {
    expect(getDisplayProductUnit('Milk', '500 ml')).toBe('500 ml');
  });
});
