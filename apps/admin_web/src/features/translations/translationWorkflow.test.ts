import { describe, expect, it } from 'vitest';
import { canTransitionTranslation, getCanonicalPackageText, isLocalizedProductDetails, isTranslationEvidenceSnapshot,
  matchesTranslationEvidence, validateCatalogTranslation } from './translationWorkflow';
import type { CanonicalTranslationSource, TranslationEvidenceSnapshot, TranslationRow, TranslationTransitionContext } from './translationTypes';

const source: CanonicalTranslationSource = {
  id: '10000000-0000-4000-8000-000000000001', tenantId: '20000000-0000-4000-8000-000000000001',
  name: 'Ispahani Tea 500 g', description: 'Tea leaves, 500 g.', sku: 'TEA-500', barcode: '8941154321000',
  brand: 'Ispahani', packageText: '500 g', sourceVersion: 'a'.repeat(64),
};
const evidence: TranslationEvidenceSnapshot = {
  entityId: source.id, sourceName: source.name, sourceDescription: source.description, sku: source.sku,
  barcode: source.barcode, brand: source.brand, packageText: source.packageText,
  sourceUris: ['https://manufacturer.invalid/tea-500'], observedAt: '2026-11-12T10:00:00Z',
};
const translation: TranslationRow = {
  kind: 'item', id: '30000000-0000-4000-8000-000000000001', item_id: source.id, tenant_id: source.tenantId,
  locale: 'bn', name: 'ইস্পাহানি চা 500 g', description: 'চা পাতা, 500 g।', search_terms: ['চা', 'tea', 'Ispahani'],
  review_status: 'draft', source_version: source.sourceVersion, evidence_snapshot: null, details: null,
  reviewed_by: null, reviewed_at: null, published_by: null, published_at: null, updated_at: '2026-11-12T10:00:00Z',
};
const actor = { id: '40000000-0000-4000-8000-000000000001', tenantId: source.tenantId, role: 'manager' };
function context(overrides: Partial<TranslationTransitionContext> = {}): TranslationTransitionContext {
  return { action: 'publish', actor, translation, source, humanReviewConfirmed: true, ...overrides };
}

describe('catalog translation validation', () => {
  it('allows a valid translation to publish directly without manufacturer evidence', () => {
    expect(canTransitionTranslation('draft', 'published', context())).toBe(true);
    expect(canTransitionTranslation('draft', 'published', context({ humanReviewConfirmed: false }))).toBe(false);
  });

  it('requires a tenant administrator or manager and the current source version', () => {
    expect(canTransitionTranslation('draft', 'published', context({ actor: null }))).toBe(false);
    expect(canTransitionTranslation('draft', 'published', context({ actor: { ...actor, role: 'cashier' } }))).toBe(false);
    expect(canTransitionTranslation('draft', 'published', context({ actor: { ...actor, tenantId: '20000000-0000-4000-8000-000000000002' } }))).toBe(false);
    expect(canTransitionTranslation('draft', 'published', context({ translation: { ...translation, source_version: 'b'.repeat(64) } }))).toBe(false);
  });

  it('protects brand, name variants, quantities, and numeric facts', () => {
    expect(validateCatalogTranslation(source, translation).valid).toBe(true);
    expect(validateCatalogTranslation(source, { ...translation, name: 'ইস্পাহানি চা 250 g' }).issues).toContain('Catalog name numeric identity changed.');
    expect(validateCatalogTranslation(source, { ...translation, description: 'চা পাতা, 2 kg।' }).issues).toContain('Catalog description numeric identity changed.');
    expect(validateCatalogTranslation(source, { ...translation, name: 'চা 500 g' }).issues).toContain('Catalog brand was not preserved.');
  });

  it('never invents a description when the canonical description is empty', () => {
    const noDescription = { ...source, description: null };
    expect(validateCatalogTranslation(noDescription, { ...translation, description: null }).valid).toBe(true);
    expect(validateCatalogTranslation(noDescription, translation).issues).toContain('Description has no canonical catalog text to verify against.');
  });

  it('does not allow a published translation to return to draft through ordinary edits', () => {
    expect(canTransitionTranslation('published', 'draft', context({ action: 'save_draft', translation: { ...translation, review_status: 'published' } }))).toBe(false);
  });
});

describe('evidence and detail data shapes', () => {
  it('retains strict evidence shape checks for product enrichment', () => {
    expect(isTranslationEvidenceSnapshot(evidence)).toBe(true);
    expect(matchesTranslationEvidence(evidence, source)).toBe(true);
    expect(matchesTranslationEvidence({ ...evidence, sourceName: 'Different product' }, source)).toBe(false);
    expect(isTranslationEvidenceSnapshot({ ...evidence, sourceUris: [] })).toBe(false);
    expect(isTranslationEvidenceSnapshot({ ...evidence, sourceUris: ['javascript:alert(1)'] })).toBe(false);
  });

  it('extracts canonical package text and validates optional translated detail structures', () => {
    expect(getCanonicalPackageText('Ispahani Tea 500 g', null)).toBe('500 g');
    expect(getCanonicalPackageText('Loose tea', null)).toBe(null);
    expect(isLocalizedProductDetails(null)).toBe(true);
    expect(isLocalizedProductDetails({ highlights: ['চা পাতা'] })).toBe(true);
    expect(isLocalizedProductDetails({ specifications: [{ label: 'পরিমাণ' }] })).toBe(false);
  });
});
