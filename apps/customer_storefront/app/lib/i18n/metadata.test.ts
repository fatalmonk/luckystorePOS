import { describe, expect, it } from 'vitest';
import { buildLocaleAlternates } from './metadata';

describe('buildLocaleAlternates', () => {
  it.each([
    ['/', 'https://www.luckystore1947.com', 'https://www.luckystore1947.com/bn'],
    [
      '/category/rice-and-grain',
      'https://www.luckystore1947.com/category/rice-and-grain',
      'https://www.luckystore1947.com/bn/category/rice-and-grain',
    ],
    ['/bn', 'https://www.luckystore1947.com', 'https://www.luckystore1947.com/bn'],
    ['/bn/', 'https://www.luckystore1947.com', 'https://www.luckystore1947.com/bn'],
    [
      '/bn/about/',
      'https://www.luckystore1947.com/about',
      'https://www.luckystore1947.com/bn/about',
    ],
    [
      '/bn/category/rice-and-grain',
      'https://www.luckystore1947.com/category/rice-and-grain',
      'https://www.luckystore1947.com/bn/category/rice-and-grain',
    ],
    [
      '/category/rice-and-grain///',
      'https://www.luckystore1947.com/category/rice-and-grain',
      'https://www.luckystore1947.com/bn/category/rice-and-grain',
    ],
  ] as const)('builds self-canonicals and reciprocal hreflang for %s', (path, englishUrl, bengaliUrl) => {
    const englishAlternates = buildLocaleAlternates(path, 'en');
    const bengaliAlternates = buildLocaleAlternates(path, 'bn');
    const languages = {
      'en-BD': englishUrl,
      'bn-BD': bengaliUrl,
      'x-default': englishUrl,
    };

    expect(englishAlternates).toEqual({ canonical: englishUrl, languages });
    expect(bengaliAlternates).toEqual({ canonical: bengaliUrl, languages });
    expect(bengaliAlternates.canonical).not.toBe(englishUrl);
  });
});
