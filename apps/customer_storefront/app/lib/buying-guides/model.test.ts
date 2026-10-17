import { describe, expect, it, vi } from 'vitest';
import { buyingGuideSchema, guideContentHash, guideSitemapEntries, publishedGuides, type BuyingGuide } from './model';
import { REVIEW_GUIDES } from './research';
import { isPublicGuideSlug } from './publication';

vi.mock('server-only', () => ({}));

/** Synthetic approval used only by tests; never exported into the publication registry. */
export function approvedFixture(): BuyingGuide {
  const draft = buyingGuideSchema.parse({ ...structuredClone(REVIEW_GUIDES[0]), state: 'review',
    author: { name: 'Synthetic test editor', kind: 'Organization', profileUrl: 'https://example.com/test-editor' },
    publishedAt: '2026-10-15T14:00:00Z', updatedAt: '2026-10-15T14:00:00Z' });
  return buyingGuideSchema.parse({ ...draft, state: 'published', approval: {
    revision: draft.revision, contentHash: guideContentHash(draft), verifiedBy: 'Synthetic verifier', verifiedAt: '2026-10-15T12:00:00Z',
    approvedBy: 'Synthetic approver', approvedAt: '2026-10-15T13:00:00Z',
  } });
}

describe('buying-guide publication contract', () => {
  it('keeps actual research records private and out of the sitemap', () => {
    expect(REVIEW_GUIDES).toHaveLength(3);
    REVIEW_GUIDES.forEach(guide => expect(() => buyingGuideSchema.parse(guide)).not.toThrow());
    REVIEW_GUIDES.forEach(guide => expect(guide.criteria).toHaveLength(4));
    expect(REVIEW_GUIDES[0].criteria.map(criterion => criterion.label)).toEqual([
      'Product type', 'Declared net weight', 'Current price', 'Availability',
    ]);
    expect(REVIEW_GUIDES[0].introduction).toContain('three Olympic biscuit packs');
    expect(REVIEW_GUIDES[0].products[0].description.text).toContain('150g Energy Plus');
    expect(REVIEW_GUIDES[0].products[2].description.text).toContain('Milk Marie');
    expect(publishedGuides(REVIEW_GUIDES)).toEqual([]);
    expect(guideSitemapEntries(REVIEW_GUIDES)).toEqual([]);
  });
  it('requires a real approval, author and publication dates', () => {
    expect(() => buyingGuideSchema.parse({ ...REVIEW_GUIDES[0], state: 'published' })).toThrow('Publication requires');
  });
  it('includes only eligible published records with genuine revision timestamps', () => {
    const guide = approvedFixture();
    expect(guideSitemapEntries([guide])).toEqual([{ url: `https://www.luckystore1947.com/best/${guide.slug}`, lastModified: guide.updatedAt }]);
    expect(publishedGuides([{ ...guide, state: 'archived' }])).toEqual([]);
    expect(publishedGuides([guide], new Date('2026-10-14'))).toEqual([]);
  });
  it('invalidates approval when either content or revision changes', () => {
    const guide = approvedFixture();
    expect(() => buyingGuideSchema.parse({ ...guide, introduction: 'Changed editorial claim' })).toThrow('exact editorial revision');
    expect(() => buyingGuideSchema.parse({ ...guide, revision: 2 })).toThrow('exact editorial revision');
  });
  it('permits an approved revision without manufacturing a new original publication date', async () => {
    const guide = approvedFixture();
    guide.revision = 2;
    guide.updatedAt = '2026-10-15T14:45:00Z';
    guide.approval = { ...guide.approval!, revision: 2, verifiedAt: '2026-10-15T14:30:00Z', approvedAt: '2026-10-15T14:40:00Z', contentHash: guideContentHash(guide) };
    expect(buyingGuideSchema.parse(guide).publishedAt).toBe('2026-10-15T14:00:00Z');
    expect(await isPublicGuideSlug(guide.slug, [guide])).toBe(true);
    guide.description = 'Unapproved revision';
    expect(await isPublicGuideSlug(guide.slug, [guide])).toBe(false);
  });
  it('rejects unsafe slugs, dangling evidence, duplicate IDs and zero quantities', () => {
    const draft = structuredClone(REVIEW_GUIDES[0]);
    expect(() => buyingGuideSchema.parse({ ...draft, slug: '../checkout' })).toThrow();
    expect(() => buyingGuideSchema.parse({ ...draft, evidence: {} })).toThrow('registered evidence');
    expect(() => buyingGuideSchema.parse({ ...draft, products: [draft.products[0], draft.products[0], draft.products[2]] })).toThrow('Duplicate product');
    draft.products[0].quantity.value = 0;
    expect(() => buyingGuideSchema.parse(draft)).toThrow();
  });
  it('rejects mixed measurement units and unsupported ranks', () => {
    const guide = structuredClone(REVIEW_GUIDES[0]);
    guide.products[0].quantity.unit = 'ml';
    expect(() => buyingGuideSchema.parse(guide)).toThrow('same unit');
    expect(() => buyingGuideSchema.parse({ ...REVIEW_GUIDES[0], mode: 'ranked' })).toThrow('evidenced rationale');
  });
});
