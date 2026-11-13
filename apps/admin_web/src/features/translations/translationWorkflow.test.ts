import { describe, expect, it } from 'vitest';
import {
  canTransitionTranslation,
  getCanonicalPackageText,
  isLocalizedProductDetails,
  isTranslationEvidenceSnapshot,
  matchesTranslationEvidence,
} from './translationWorkflow';
import type {
  CanonicalTranslationSource,
  TranslationEvidenceSnapshot,
  TranslationRow,
  TranslationTransitionContext,
} from './translationTypes';

const source: CanonicalTranslationSource = {
  id: '10000000-0000-4000-8000-000000000001',
  tenantId: '20000000-0000-4000-8000-000000000001',
  name: 'Ispahani Tea 500 g',
  description: 'Tea leaves, 500 g.',
  sku: 'TEA-500',
  barcode: '8941154321000',
  brand: 'Ispahani',
  packageText: '500 g',
};
const evidence: TranslationEvidenceSnapshot = {
  entityId: source.id,
  sourceName: 'Ispahani Tea 500 g',
  sourceDescription: 'Tea leaves, 500 g.',
  sku: 'TEA-500',
  barcode: '8941154321000',
  brand: 'Ispahani',
  packageText: '500 g',
  sourceUris: ['https://manufacturer.invalid/tea-500'],
  observedAt: '2026-11-12T10:00:00Z',
};
const translation: TranslationRow = {
  id: '30000000-0000-4000-8000-000000000001',
  item_id: source.id,
  tenant_id: source.tenantId,
  locale: 'bn',
  name: 'ইস্পাহানি চা 500 g',
  description: 'চা পাতা, 500 g।',
  search_terms: ['চা', 'cha', 'tea', 'Ispahani'],
  review_status: 'draft',
  evidence_snapshot: evidence,
  details: { summary: 'চা পাতা।', specifications: [{ label: 'পরিমাণ', value: '500 g' }] },
  reviewed_by: null,
  reviewed_at: null,
  published_by: null,
  published_at: null,
  updated_at: '2026-11-12T10:00:00Z',
};

function context(overrides: Partial<TranslationTransitionContext> = {}): TranslationTransitionContext {
  return {
    action: 'mark_reviewed',
    actor: { id: '40000000-0000-4000-8000-000000000001', tenantId: source.tenantId, role: 'manager' },
    translation,
    source,
    humanReviewConfirmed: true,
    ...overrides,
  };
}

describe('canTransitionTranslation', () => {
  it('rejects direct draft publication even with complete evidence', () => {
    expect(canTransitionTranslation('draft', 'published', context({ action: 'publish' }))).toBe(false);
  });

  it('requires the explicit review action and human confirmation', () => {
    expect(canTransitionTranslation('draft', 'reviewed', context())).toBe(true);
    expect(canTransitionTranslation('draft', 'reviewed', context({ action: 'save_draft' }))).toBe(false);
    expect(canTransitionTranslation('draft', 'reviewed', context({ humanReviewConfirmed: false }))).toBe(false);
  });

  it('requires a real tenant-scoped administrator or manager as reviewer', () => {
    expect(canTransitionTranslation('draft', 'reviewed', context({ actor: null }))).toBe(false);
    expect(canTransitionTranslation('draft', 'reviewed', context({ actor: { id: '', tenantId: source.tenantId, role: 'admin' } }))).toBe(false);
    expect(canTransitionTranslation('draft', 'reviewed', context({ actor: { id: '40000000-0000-4000-8000-000000000001', tenantId: source.tenantId, role: 'cashier' } }))).toBe(false);
    expect(canTransitionTranslation('draft', 'reviewed', context({ actor: { id: '40000000-0000-4000-8000-000000000001', tenantId: '20000000-0000-4000-8000-000000000002', role: 'admin' } }))).toBe(false);
  });

  it.each(['sku', 'barcode', 'brand', 'packageText'] as const)('requires canonical %s evidence when it exists', (field) => {
    expect(canTransitionTranslation('draft', 'reviewed', context({ translation: { ...translation, evidence_snapshot: { ...evidence, [field]: null } } }))).toBe(false);
  });

  it('rejects absent evidence, a different catalog entity, and malformed details', () => {
    expect(canTransitionTranslation('draft', 'reviewed', context({ translation: { ...translation, evidence_snapshot: null } }))).toBe(false);
    expect(canTransitionTranslation('draft', 'reviewed', context({ source: { ...source, id: '10000000-0000-4000-8000-000000000002' } }))).toBe(false);
    expect(canTransitionTranslation('draft', 'reviewed', context({ translation: { ...translation, details: { highlights: [4] } as never } }))).toBe(false);
  });

  it('requires a separate publish action after attributed review, not a different person', () => {
    const reviewed = { ...translation, review_status: 'reviewed' as const, reviewed_by: '40000000-0000-4000-8000-000000000001', reviewed_at: '2026-11-12T11:00:00Z' };
    const publish = context({ action: 'publish', translation: reviewed });
    expect(canTransitionTranslation('reviewed', 'published', publish)).toBe(true);
    expect(canTransitionTranslation('reviewed', 'published', { ...publish, action: 'mark_reviewed' })).toBe(false);
    expect(canTransitionTranslation('reviewed', 'published', { ...publish, humanReviewConfirmed: false })).toBe(false);
    expect(canTransitionTranslation('reviewed', 'published', { ...publish, translation: { ...reviewed, reviewed_by: null } })).toBe(false);
    expect(canTransitionTranslation('reviewed', 'published', { ...publish, translation: { ...reviewed, reviewed_at: 'not-a-date' } })).toBe(false);
  });

  it('rejects publication if the canonical source changed since review', () => {
    const reviewed = { ...translation, review_status: 'reviewed' as const, reviewed_by: '40000000-0000-4000-8000-000000000001', reviewed_at: '2026-11-12T11:00:00Z' };
    expect(canTransitionTranslation('reviewed', 'published', context({ action: 'publish', translation: reviewed, source: { ...source, sku: 'TEA-250' } }))).toBe(false);
  });

  it('allows edited publications to return to draft only through Save Draft', () => {
    const published = { ...translation, review_status: 'published' as const };
    expect(canTransitionTranslation('published', 'draft', context({ action: 'save_draft', translation: published }))).toBe(true);
    expect(canTransitionTranslation('published', 'draft', context({ action: 'publish', translation: published }))).toBe(false);
    expect(canTransitionTranslation('draft', 'reviewed', context({ translation: published }))).toBe(false);
  });

  it('applies the same evidence and actor gates to categories', () => {
    const categorySource = { ...source, name: 'Tea', description: null, sku: null, barcode: null, brand: null, packageText: null };
    const category = { ...translation, item_id: undefined, category_id: source.id, evidence_snapshot: { ...evidence, sourceName: 'Tea', sourceDescription: null, sku: null, barcode: null, brand: null, packageText: null }, details: undefined, seo_title: 'চা', seo_description: 'চা কিনুন।' };
    expect(canTransitionTranslation('draft', 'reviewed', context({ source: categorySource, translation: category }))).toBe(true);
    expect(canTransitionTranslation('draft', 'published', context({ action: 'publish', source: categorySource, translation: category }))).toBe(false);
  });
});

describe('translation evidence and details boundaries', () => {
  it.each([
    { ...evidence, snapshotSha256: 'a'.repeat(64) },
    { ...evidence, sourceUris: [] },
    { ...evidence, sourceUris: ['javascript:alert(1)'] },
    { ...evidence, observedAt: 'not-a-date' },
    { ...evidence, sku: undefined },
    { ...evidence, sourceName: '' },
  ])('rejects incomplete or malformed evidence: %#', (value) => {
    expect(isTranslationEvidenceSnapshot(value)).toBe(false);
  });

  it('compares identity and factual fields with the canonical source, not just evidence presence', () => {
    expect(matchesTranslationEvidence(evidence, source)).toBe(true);
    expect(matchesTranslationEvidence({ ...evidence, sourceDescription: 'Different product' }, source)).toBe(false);
    expect(matchesTranslationEvidence({ ...evidence, sourceName: 'Another tea' }, source)).toBe(false);
    expect(matchesTranslationEvidence({ ...evidence, barcode: '000' }, source)).toBe(false);
  });

  it('extracts Latin package quantities without changing catalog identity', () => {
    expect(getCanonicalPackageText('Ispahani Tea 500 g', null)).toBe('500 g');
    expect(getCanonicalPackageText('Mojo 250ml', null)).toBe('250ml');
    expect(getCanonicalPackageText('Tea', 'Pack of 1 kg.')).toBe('1 kg');
    expect(getCanonicalPackageText('Loose tea', null)).toBe(null);
  });

  it('validates complete optional localized detail structures', () => {
    expect(isLocalizedProductDetails(null)).toBe(true);
    expect(isLocalizedProductDetails({ summary: 'চা।', highlights: ['চা পাতা'], specifications: [{ label: 'পরিমাণ', value: '500 g' }], usageDirections: 'গরম পানিতে দিন।', storageInstructions: 'শুকনো স্থানে রাখুন।', faqs: [{ question: 'পরিমাণ?', answer: '500 g' }] })).toBe(true);
    expect(isLocalizedProductDetails({ specifications: [{ label: 'পরিমাণ' }] })).toBe(false);
    expect(isLocalizedProductDetails({ faqs: [{ question: 'পরিমাণ?', answer: 500 }] })).toBe(false);
    expect(isLocalizedProductDetails({ highlights: 'not-an-array' })).toBe(false);
    expect(isLocalizedProductDetails({ inventedClaim: 'Unreviewed' })).toBe(false);
  });
});
