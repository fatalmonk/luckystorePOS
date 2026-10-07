export type TranslationReviewStatus = 'draft' | 'reviewed' | 'published';

export interface ItemTranslationRecord {
  id: string;
  item_id: string;
  tenant_id: string;
  locale: 'bn';
  name: string;
  description: string | null;
  origin: string | null;
  search_terms: string[];
  review_status: TranslationReviewStatus;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}


