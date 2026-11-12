import { describe, expect, it } from 'vitest';
import { dictionaries } from './dictionaries';

type Dict = typeof dictionaries.en;

function collectKeyPaths(obj: unknown, prefix = ''): string[] {
  if (obj === null || obj === undefined) return [];
  if (Array.isArray(obj)) {
    const arrayPath = prefix ? `${prefix}[]` : '[]';
    return [arrayPath, ...obj.flatMap((item) => collectKeyPaths(item, arrayPath))];
  }
  if (typeof obj === 'object') {
    return Object.entries(obj).flatMap(([key, value]) =>
      collectKeyPaths(value, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [prefix];
}

function getLeafValues(obj: unknown): string[] {
  if (obj === null || obj === undefined) return [];
  if (Array.isArray(obj)) {
    return obj.flatMap(getLeafValues);
  }
  if (typeof obj === 'object') {
    return Object.values(obj).flatMap(getLeafValues);
  }
  if (typeof obj === 'string') {
    return [obj];
  }
  return [];
}

const enPaths = collectKeyPaths(dictionaries.en).sort();
const bnPaths = collectKeyPaths(dictionaries.bn).sort();
const missingInBn = enPaths.filter((p) => !bnPaths.includes(p));
const extraInBn = bnPaths.filter((p) => !enPaths.includes(p));
const bnEmptyLeaves = getLeafValues(dictionaries.bn).filter((v) => v.trim() === '');

// Log differences for debugging
if (missingInBn.length > 0 || extraInBn.length > 0 || bnEmptyLeaves.length > 0) {
  console.log('Dictionary parity check:');
  if (missingInBn.length > 0) console.log('  Missing in bn:', missingInBn);
  if (extraInBn.length > 0) console.log('  Extra in bn:', extraInBn);
  if (bnEmptyLeaves.length > 0) console.log('  Empty bn leaves count:', bnEmptyLeaves.length);
}

describe('dictionary parity: en vs bn', () => {
  it('en and bn dictionaries have identical key shapes', () => {
    expect(missingInBn).toEqual([]);
    expect(extraInBn).toEqual([]);
  });

  it('no bn leaf string is blank', () => {
    expect(bnEmptyLeaves).toEqual([]);
  });
});
