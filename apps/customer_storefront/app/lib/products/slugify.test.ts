import { describe, expect, it } from 'vitest';
import { uuidPrefixRange, extractIdFromSlug } from './slugify';

describe('extractIdFromSlug', () => {
  it('extracts prefix from standard double-hyphen slug', () => {
    expect(extractIdFromSlug('radhuni-jira-gura-100-g--045df58d')).toBe('045df58d');
  });

  it('extracts prefix from unicode en-dash slug', () => {
    expect(extractIdFromSlug('radhuni-jira-gura-100-g–045df58d')).toBe('045df58d');
  });

  it('extracts prefix from unicode em-dash slug', () => {
    expect(extractIdFromSlug('radhuni-jira-gura-100-g—045df58d')).toBe('045df58d');
  });

  it('extracts prefix from URI-encoded en-dash slug', () => {
    expect(extractIdFromSlug('radhuni-jira-gura-100-g%E2%80%93045df58d')).toBe('045df58d');
  });

  it('falls back cleanly when no separator is found', () => {
    expect(extractIdFromSlug('045df58d')).toBe('045df58d');
  });
});

describe('uuidPrefixRange', () => {
  it('returns inclusive/exclusive bounds for an 8-char hex prefix', () => {
    expect(uuidPrefixRange('029b62d8')).toEqual({
      gte: '029b62d8-0000-0000-0000-000000000000',
      lt: '029b62d9-0000-0000-0000-000000000000',
    });
  });

  it('omits an upper bound for the final hex prefix', () => {
    expect(uuidPrefixRange('ffffffff')).toEqual({
      gte: 'ffffffff-0000-0000-0000-000000000000',
      lt: null,
    });
  });

  it('rejects full UUIDs and short prefixes', () => {
    expect(uuidPrefixRange('ae09a3ef-1111-2222-3333-444455556666')).toBeNull();
    expect(uuidPrefixRange('029b')).toBeNull();
    expect(uuidPrefixRange('not-a-prefix')).toBeNull();
  });
});
