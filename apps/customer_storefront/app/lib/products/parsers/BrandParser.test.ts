import { describe, it, expect } from 'vitest';
import { RuleBasedBrandParser } from './BrandParser';

describe('RuleBasedBrandParser', () => {
  const parser = new RuleBasedBrandParser();

  it('extracts known brand from first word', () => {
    expect(parser.parse('Polar Ice Cream 1L')).toBe('Polar');
    expect(parser.parse('Pran Mango Juice')).toBe('Pran');
  });

  it('is case-insensitive', () => {
    expect(parser.parse('POLAR Ice Cream')).toBe('Polar');
    expect(parser.parse('polar ice cream')).toBe('Polar');
  });

  it('returns undefined for unknown brands', () => {
    expect(parser.parse('Organic Banana')).toBeUndefined();
    expect(parser.parse('Premium Milk 500ml')).toBeUndefined();
  });

  it('returns undefined for empty input', () => {
    expect(parser.parse('')).toBeUndefined();
  });

  it('accepts custom brands list', () => {
    const custom = new RuleBasedBrandParser(['Acme', 'Globex']);
    expect(custom.parse('Acme Widget')).toBe('Acme');
    expect(custom.parse('Polar Widget')).toBeUndefined();
  });

  it('handles whitespace-padded names', () => {
    expect(parser.parse('  Polar  Ice Cream  ')).toBe('Polar');
  });
});

