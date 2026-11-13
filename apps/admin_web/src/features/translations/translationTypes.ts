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

export interface TranslationRow {
  id: string;
  item_id?: string;
  category_id?: string;
  tenant_id: string;
  locale: 'bn';
  name: string;
  description: string | null;
  search_terms: string[];
  review_status: TranslationReviewStatus;
  evidence_snapshot: TranslationEvidenceSnapshot | null;
  details?: LocalizedProductDetails | null;
  seo_title?: string | null;
  seo_description?: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_by: string | null;
  published_at: string | null;
  updated_at: string;
}

export interface TranslationTransitionContext {
  action: TranslationAction;
  actor: { id: string; tenantId: string; role: string } | null;
  translation: TranslationRow;
  source: CanonicalTranslationSource | null;
  humanReviewConfirmed: boolean;
}
