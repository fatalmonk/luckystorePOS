// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('server-rendered primary heading contract', () => {
  it('declares one locale-aware fallback H1 in the root server document', () => {
    const source = readFileSync(
      new URL('../RootLayoutDocument.tsx', import.meta.url),
      'utf8'
    );

    expect(source.match(/<h1\b/g)).toHaveLength(1);
    expect(source).toContain("lang === 'bn'");
    expect(source).toContain('Lucky Store online grocery in Chattogram');
    expect(source).toContain('লাকি স্টোর অনলাইন গ্রোসারি, চট্টগ্রাম');
  });
});
