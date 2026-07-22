import { describe, it, expect } from 'vitest';
import { WordMatchEmojiResolver } from './EmojiResolver';

describe('WordMatchEmojiResolver', () => {
  const resolver = new WordMatchEmojiResolver();

  it('prefers DB emoji when valid', () => {
    expect(resolver.resolve('dairy', '🐄')).toBe('🐄');
  });

  it('ignores DB emoji when it is the default 📦', () => {
    expect(resolver.resolve('dairy', '📦')).toBe('🥛');
  });

  it('ignores DB emoji when empty or whitespace', () => {
    expect(resolver.resolve('dairy', '')).toBe('🥛');
    expect(resolver.resolve('dairy', '  ')).toBe('🥛');
    expect(resolver.resolve('dairy', null)).toBe('🥛');
    expect(resolver.resolve('dairy', undefined)).toBe('🥛');
  });

  it('matches words in category name', () => {
    expect(resolver.resolve('Fresh Fruit')).toBe('🍎');
    expect(resolver.resolve('Cleaning Supplies')).toBe('🧼');
    expect(resolver.resolve('frozen food')).toBe('🧊');
  });

  it('returns 📦 for unrecognized categories', () => {
    expect(resolver.resolve('miscellaneous')).toBe('📦');
    expect(resolver.resolve('')).toBe('📦');
  });

  it('is case-insensitive', () => {
    expect(resolver.resolve('DAIRY')).toBe('🥛');
    expect(resolver.resolve('Bakery')).toBe('🥐');
  });

  it('accepts custom icon map', () => {
    const custom = new WordMatchEmojiResolver({ custom: '🎉' });
    expect(custom.resolve('custom items')).toBe('🎉');
    expect(custom.resolve('dairy')).toBe('📦'); // default map not loaded
  });
});


