import { describe, expect, it } from 'vitest';
import { catalogProductSlug, extractIdFromSlug, toProductSlug, uuidPrefixRange } from './slugify';

const DIPLOMA_ID = '95c86e99-34c8-4ed3-823d-2ca8446fdbd9';
const DIPLOMA_ENGLISH = 'Diploma Instant Full Cream Milk Powder 500 g';
const DIPLOMA_BENGALI = 'ডিপ্লোমা ইন্স্ট্যান্ট ফুল ক্রিম মিল্ক পাউডার';

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

describe('toProductSlug', () => {
  it('keeps the historical Latin slug for English catalog names', () => {
    expect(toProductSlug('Radhuni Holud Gura 100gm', '029b62d8-1111-2222-3333-444455556666'))
      .toBe('radhuni-holud-gura-100gm--029b62d8');
    expect(toProductSlug(DIPLOMA_ENGLISH, DIPLOMA_ID))
      .toBe('diploma-instant-full-cream-milk-powder-500-g--95c86e99');
  });

  it('keeps mixed Latin names on their existing slug and does not fold in stripped Bengali', () => {
    expect(toProductSlug('Milk ৫০০', DIPLOMA_ID)).toBe('milk--95c86e99');
  });

  it('shares the English catalog slug across locales when a Bengali label is displayed', () => {
    const shared = 'diploma-instant-full-cream-milk-powder-500-g--95c86e99';
    expect(toProductSlug(DIPLOMA_BENGALI, DIPLOMA_ID, { englishName: DIPLOMA_ENGLISH })).toBe(shared);
    expect(catalogProductSlug({
      id: DIPLOMA_ID,
      name: DIPLOMA_BENGALI,
      originalName: DIPLOMA_ENGLISH,
    })).toBe(shared);
    expect(toProductSlug(DIPLOMA_ENGLISH, DIPLOMA_ID)).toBe(shared);
  });

  it('transliterates a Bengali-only name instead of collapsing to an empty prefix', () => {
    expect(toProductSlug(DIPLOMA_BENGALI, DIPLOMA_ID))
      .toBe('diploma-instyant-ful-krim-milk-paudar--95c86e99');
    expect(toProductSlug('চা', DIPLOMA_ID)).toBe('cha--95c86e99');
    expect(toProductSlug('মরিচ', DIPLOMA_ID)).toBe('morich--95c86e99');
    expect(toProductSlug('৫০০ গ্রাম', DIPLOMA_ID)).toBe('500-gram--95c86e99');
    expect(extractIdFromSlug(toProductSlug(DIPLOMA_BENGALI, DIPLOMA_ID))).toBe('95c86e99');
  });

  it('keeps the legacy empty slug when there is no name to describe', () => {
    expect(toProductSlug('', DIPLOMA_ID)).toBe('--95c86e99');
    expect(toProductSlug('!!!', DIPLOMA_ID)).toBe('--95c86e99');
    expect(extractIdFromSlug('--95c86e99')).toBe('95c86e99');
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
