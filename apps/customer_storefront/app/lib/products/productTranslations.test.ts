import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state: {
    response: { data: unknown[] | null; error: { code?: string; message?: string } | null };
  } = {
    response: { data: [], error: null },
  };
  const query: Record<string, any> = {};
  query.select = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(state.response).then(resolve, reject);

  return {
    state,
    query,
    from: vi.fn(() => query),
    getAnonymousStorefrontClient: vi.fn(),
    globalFrom: vi.fn(() => {
      throw new Error('mutable global Supabase client used');
    }),
  };
});

vi.mock('../supabase', () => ({
  supabase: { from: mocks.globalFrom },
}));

vi.mock('../supabase/anonymousStorefront', () => ({
  getAnonymousStorefrontClient: mocks.getAnonymousStorefrontClient,
}));

import { getPublishedItemTranslations } from './productTranslations';

const ITEM_ID = '10000000-0000-4000-8000-000000000001';
const OTHER_ITEM_ID = '10000000-0000-4000-8000-000000000002';

function evidenceSnapshot(entityId = ITEM_ID) {
  return {
    entityId,
    sourceName: 'Ispahani Mirzapore Best Leaf Tea 500 g',
    sourceDescription: 'Canonical catalog description',
    sku: 'TEA-ISP-500',
    barcode: '8900000000001',
    brand: 'Ispahani',
    packageText: '500 g',
    sourceUris: ['https://example.com/evidence/tea-500g'],
    observedAt: '2026-11-12T10:00:00.000Z',
  };
}

function publishedRow(overrides: Record<string, unknown> = {}) {
  return {
    item_id: ITEM_ID,
    locale: 'bn',
    name: 'ইস্পাহানি মির্জাপুর বেস্ট লিফ চা 500 g',
    description: 'পর্যালোচিত বাংলা পণ্যের বিবরণ।',
    origin: 'বাংলাদেশ',
    search_terms: ['ইস্পাহানি চা', 'ispahani cha', 'ispahani tea'],
    details: {
      summary: 'পর্যালোচিত বাংলা সারাংশ।',
      highlights: ['সামনের প্যাকেট থেকে যাচাইকৃত তথ্য'],
      specifications: [{ label: 'প্যাকের ধরন', value: 'পাউচ' }],
      usageDirections: 'প্যাকেটের নির্দেশনা অনুসরণ করুন।',
      storageInstructions: 'ঠান্ডা ও শুষ্ক স্থানে রাখুন।',
      faqs: [{ question: 'এটি কোথায় তৈরি?', answer: 'প্যাকেটে বাংলাদেশ লেখা আছে।' }],
    },
    evidence_snapshot: evidenceSnapshot(),
    review_status: 'published',
    reviewed_at: '2026-11-12T11:00:00.000Z',
    published_at: '2026-11-12T12:00:00.000Z',
    reviewed_by: '20000000-0000-4000-8000-000000000001',
    published_by: '30000000-0000-4000-8000-000000000001',
    ...overrides,
  };
}

describe('getPublishedItemTranslations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.response = { data: [], error: null };
    mocks.getAnonymousStorefrontClient.mockReturnValue({ from: mocks.from });
  });

  it('returns only evidence-backed reviewed publications and validates every structured detail field', async () => {
    mocks.state.response = {
      data: [
        publishedRow(),
        publishedRow({
          item_id: OTHER_ITEM_ID,
          evidence_snapshot: null,
        }),
      ],
      error: null,
    };

    const translations = await getPublishedItemTranslations([ITEM_ID, OTHER_ITEM_ID, ITEM_ID]);

    expect([...translations.keys()]).toEqual([ITEM_ID]);
    expect(translations.get(ITEM_ID)).toEqual({
      itemId: ITEM_ID,
      locale: 'bn',
      name: 'ইস্পাহানি মির্জাপুর বেস্ট লিফ চা 500 g',
      description: 'পর্যালোচিত বাংলা পণ্যের বিবরণ।',
      origin: 'বাংলাদেশ',
      searchTerms: ['ইস্পাহানি চা', 'ispahani cha', 'ispahani tea'],
      details: {
        summary: 'পর্যালোচিত বাংলা সারাংশ।',
        highlights: ['সামনের প্যাকেট থেকে যাচাইকৃত তথ্য'],
        specifications: [{ label: 'প্যাকের ধরন', value: 'পাউচ' }],
        usageDirections: 'প্যাকেটের নির্দেশনা অনুসরণ করুন।',
        storageInstructions: 'ঠান্ডা ও শুষ্ক স্থানে রাখুন।',
        faqs: [{ question: 'এটি কোথায় তৈরি?', answer: 'প্যাকেটে বাংলাদেশ লেখা আছে।' }],
      },
      reviewedAt: '2026-11-12T11:00:00.000Z',
      publishedAt: '2026-11-12T12:00:00.000Z',
      reviewedBy: '20000000-0000-4000-8000-000000000001',
      publishedBy: '30000000-0000-4000-8000-000000000001',
    });
    expect(mocks.query.in).toHaveBeenCalledWith('item_id', [ITEM_ID, OTHER_ITEM_ID]);
    expect(mocks.query.select).toHaveBeenCalledWith(expect.stringContaining('evidence_snapshot'));
    expect(mocks.query.select).toHaveBeenCalledWith(expect.stringContaining('details'));
    expect(mocks.getAnonymousStorefrontClient).toHaveBeenCalledOnce();
    expect(mocks.globalFrom).not.toHaveBeenCalled();
  });

  it('excludes a published row when structured details are malformed', async () => {
    mocks.state.response = {
      data: [publishedRow({ details: { specifications: [{ label: 'পরিমাণ', value: 500 }] } })],
      error: null,
    };

    await expect(getPublishedItemTranslations([ITEM_ID])).resolves.toEqual(new Map());
  });

  it('excludes rows with mismatched evidence identity or an invalid review timeline', async () => {
    mocks.state.response = {
      data: [
        publishedRow({ evidence_snapshot: evidenceSnapshot(OTHER_ITEM_ID) }),
        publishedRow({ reviewed_at: '2026-11-13T12:00:00.000Z', published_at: '2026-11-12T12:00:00.000Z' }),
      ],
      error: null,
    };

    await expect(getPublishedItemTranslations([ITEM_ID])).resolves.toEqual(new Map());
  });

  it('excludes evidence snapshots that omit required canonical identity fields', async () => {
    const { sku: _missingSku, ...incompleteEvidence } = evidenceSnapshot();
    mocks.state.response = {
      data: [publishedRow({ evidence_snapshot: incompleteEvidence })],
      error: null,
    };

    await expect(getPublishedItemTranslations([ITEM_ID])).resolves.toEqual(new Map());
  });

  it('excludes snapshots with an unverified digest claim', async () => {
    mocks.state.response = {
      data: [publishedRow({ evidence_snapshot: { ...evidenceSnapshot(), snapshotSha256: 'a'.repeat(64) } })],
      error: null,
    };

    await expect(getPublishedItemTranslations([ITEM_ID])).resolves.toEqual(new Map());
  });

  it('excludes rows lacking valid reviewer or publisher UUID attribution', async () => {
    mocks.state.response = {
      data: [
        publishedRow({ reviewed_by: null }),
        publishedRow({ published_by: 'not-a-uuid' }),
        publishedRow({ reviewed_by: '10000000-0000-4000-8000-000000000009', published_by: '' }),
      ],
      error: null,
    };

    await expect(getPublishedItemTranslations([ITEM_ID])).resolves.toEqual(new Map());
  });

  it('fails closed when the publication schema is unavailable', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.state.response = {
      data: null,
      error: { code: 'PGRST204', message: "Could not find the 'details' column" },
    };

    await expect(getPublishedItemTranslations([ITEM_ID])).resolves.toEqual(new Map());
    expect(errorSpy).toHaveBeenCalledWith(
      'Bengali product translations are unavailable; treating requested products as unpublished.',
      { code: 'PGRST204' },
    );
    errorSpy.mockRestore();
  });

  it('propagates unexpected query failures instead of misreporting an outage as missing publication', async () => {
    const queryError = { code: '08006', message: 'connection failure' };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.state.response = { data: null, error: queryError };

    await expect(getPublishedItemTranslations([ITEM_ID])).rejects.toBe(queryError);
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to read Bengali product translations.',
      { code: '08006' },
    );
    errorSpy.mockRestore();
  });
});
