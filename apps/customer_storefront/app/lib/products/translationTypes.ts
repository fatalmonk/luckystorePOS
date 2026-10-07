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

export interface LocalizedProductResult {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    compare_price?: number;
    stock: number;
    unit?: string;
    image_url?: string;
    category?: string;
    brand?: string;
    origin?: string;
    is_active?: boolean;
  };
  sourceName: string;
  isTranslated: boolean;
  published: boolean;
}
