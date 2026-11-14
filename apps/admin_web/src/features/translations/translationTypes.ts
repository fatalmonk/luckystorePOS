export type TranslationReviewStatus = 'draft' | 'reviewed' | 'published';
export type TranslationKind = 'item' | 'category';
export type TranslationAction = 'save_draft' | 'mark_reviewed' | 'publish';

export interface TranslationEvidenceSnapshot {
  entityId: string;
  sourceName: string;
  sourceDescription: string | null;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  packageText: string | null;
  sourceUris: string[];
  observedAt: string;
}

export interface LocalizedProductDetails {
  summary?: string;
  highlights?: string[];
  specifications?: Array<{ label: string; value: string }>;
  usageDirections?: string;
  storageInstructions?: string;
  faqs?: Array<{ question: string; answer: string }>;
}

export interface CanonicalTranslationSource {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  packageText: string | null;
}

interface TranslationCommon {
  id: string;
  tenant_id: string;
  locale: 'bn';
  name: string;
  description: string | null;
  search_terms: string[];
  review_status: TranslationReviewStatus;
  evidence_snapshot: TranslationEvidenceSnapshot | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_by: string | null;
  published_at: string | null;
  updated_at: string;
}

// Local discriminator is supplied by the table selected in TranslationsPage.
// The database has distinct entity tables, not a runtime `kind` column.
export interface ItemTranslationRow extends TranslationCommon {
  kind: 'item';
  item_id: string;
  category_id?: never;
  details: LocalizedProductDetails | null;
  seo_title?: never;
  seo_description?: never;
}

export interface CategoryTranslationRow extends TranslationCommon {
  kind: 'category';
  category_id: string;
  item_id?: never;
  seo_title: string | null;
  seo_description: string | null;
  details?: never;
}

export type TranslationRow = ItemTranslationRow | CategoryTranslationRow;

export interface TranslationTransitionContext {
  action: TranslationAction;
  actor: { id: string; tenantId: string; role: string } | null;
  translation: TranslationRow;
  source: CanonicalTranslationSource | null;
  humanReviewConfirmed: boolean;
}
