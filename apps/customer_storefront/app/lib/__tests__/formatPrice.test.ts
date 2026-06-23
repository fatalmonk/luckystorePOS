import { describe, it, expect } from 'vitest';
import { formatBdt, formatUnitPrice } from '../formatPrice';

describe('formatBdt', () => {
  it('formats whole taka without decimals', () => {
    expect(formatBdt(100)).toBe('৳100');
    expect(formatBdt(0)).toBe('৳0');
  });

  it('formats fractional taka with 2 decimals', () => {
    expect(formatBdt(100.5)).toBe('৳100.50');
    expect(formatBdt(99.99)).toBe('৳99.99');
  });

  it('treats near-integer values as whole (within 0.005)', () => {
    expect(formatBdt(100.003)).toBe('৳100');
    expect(formatBdt(99.998)).toBe('৳100');
  });

  it('handles null and NaN gracefully', () => {
    expect(formatBdt(null)).toBe('৳—');
    expect(formatBdt(undefined)).toBe('৳—');
    expect(formatBdt(NaN)).toBe('৳—');
  });

  it('handles large values', () => {
    expect(formatBdt(10000)).toBe('৳10,000');
    expect(formatBdt(1000000)).toBe('৳1,000,000');
  });

  it('handles negative values', () => {
    expect(formatBdt(-50)).toBe('৳-50');
  });
});

describe('formatUnitPrice', () => {
  it('formats price with unit label', () => {
    expect(formatUnitPrice(12.5, 'kg')).toBe('৳12.50 / kg');
    expect(formatUnitPrice(100, 'pc')).toBe('৳100 / pc');
  });

  it('handles null/NaN', () => {
    expect(formatUnitPrice(null, 'kg')).toBe('৳— / kg');
    expect(formatUnitPrice(NaN, 'kg')).toBe('৳— / kg');
  });
});