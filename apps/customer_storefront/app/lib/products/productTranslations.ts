import { getAnonymousStorefrontClient } from '../supabase/anonymousStorefront';
import { isBareUuid } from './slugify';

export interface LocalizedProductDetails {
  summary?: string;
  highlights?: string[];
  specifications?: Array<{ label: string; value: string }>;
  usageDirections?: string;
  storageInstructions?: string;
  faqs?: Array<{ question: string; answer: string }>;
}

export interface PublishedItemTranslation {
  itemId: string;
  locale: 'bn';
  name: string;
  description: string | null;
  origin: string | null;
  searchTerms: string[];
  details: LocalizedProductDetails | null;
}

type TranslationRow = {
  item_id?: unknown;
  locale?: unknown;
  name?: unknown;
  description?: unknown;
  origin?: unknown;
  search_terms?: unknown;
  details?: unknown;
  review_status?: unknown;
};

const DETAIL_KEYS = new Set([
  'summary',
  'highlights',
  'specifications',
  'usageDirections',
  'storageInstructions',
  'faqs',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return undefined;
  return value.trim() || null;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => !nonEmptyString(item))) return null;
  return value.map((item) => item.trim());
}

function parseLocalizedProductDetails(value: unknown): LocalizedProductDetails | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || Object.keys(value).some((key) => !DETAIL_KEYS.has(key))) return undefined;

  const details: LocalizedProductDetails = {};
  for (const key of ['summary', 'usageDirections', 'storageInstructions'] as const) {
    if (value[key] === undefined) continue;
    if (!nonEmptyString(value[key])) return undefined;
    details[key] = value[key].trim();
  }

  if (value.highlights !== undefined) {
    const highlights = stringArray(value.highlights);
    if (!highlights) return undefined;
    details.highlights = highlights;
  }

  if (value.specifications !== undefined) {
    if (!Array.isArray(value.specifications)) return undefined;
    const specifications: Array<{ label: string; value: string }> = [];
    for (const specification of value.specifications) {
      if (!isRecord(specification) || !nonEmptyString(specification.label) || !nonEmptyString(specification.value)) {
        return undefined;
      }
      specifications.push({
        label: specification.label.trim(),
        value: specification.value.trim(),
      });
    }
    details.specifications = specifications;
  }

  if (value.faqs !== undefined) {
    if (!Array.isArray(value.faqs)) return undefined;
    const faqs: Array<{ question: string; answer: string }> = [];
    for (const faq of value.faqs) {
      if (!isRecord(faq) || !nonEmptyString(faq.question) || !nonEmptyString(faq.answer)) {
        return undefined;
      }
      faqs.push({ question: faq.question.trim(), answer: faq.answer.trim() });
    }
    details.faqs = faqs;
  }

  return details;
}

function parsePublishedRow(row: TranslationRow): PublishedItemTranslation | null {
  // The anon RLS predicate verifies canonical source evidence, reviewer
  // attribution and publication timing before these public columns are read.
  // Do not re-fetch internal evidence/user IDs into the public storefront.
  if (!nonEmptyString(row.item_id) || !isBareUuid(row.item_id)
      || row.locale !== 'bn' || row.review_status !== 'published'
      || !nonEmptyString(row.name)) return null;

  const description = nullableString(row.description);
  const origin = nullableString(row.origin);
  const searchTerms = stringArray(row.search_terms);
  const details = parseLocalizedProductDetails(row.details);
  if (description === undefined || origin === undefined || !searchTerms || details === undefined) return null;

  return {
    itemId: row.item_id,
    locale: 'bn',
    name: row.name.trim(),
    description,
    origin,
    searchTerms,
    details,
  };
}

function isMissingPublicationSchemaError(error: { code?: string; message?: string }): boolean {
  if (['PGRST204', 'PGRST205', '42P01', '42703'].includes(error.code || '')) return true;
  const message = (error.message || '').toLowerCase();
  return message.includes('item_translations')
    && (message.includes('schema cache') || message.includes('does not exist') || message.includes('could not find'));
}

/**
 * Reads only publication-eligible Bengali product presentation data.
 * Any query or shape failure returns no rows so callers cannot expose drafts,
 * legacy status-only publications, or malformed structured details.
 */
export async function getPublishedItemTranslations(
  itemIds: readonly string[],
): Promise<Map<string, PublishedItemTranslation>> {
  const uniqueIds = [...new Set(itemIds.filter((itemId) => isBareUuid(itemId)))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await (getAnonymousStorefrontClient() as any)
    .from('item_translations')
    .select('item_id, locale, name, description, origin, search_terms, details, review_status')
    .in('item_id', uniqueIds)
    .eq('locale', 'bn')
    .eq('review_status', 'published');

  if (error) {
    if (isMissingPublicationSchemaError(error)) {
      console.error(
        'Bengali product translations are unavailable; treating requested products as unpublished.',
        { code: error.code },
      );
      return new Map();
    }
    console.error('Failed to read Bengali product translations.', { code: error.code });
    throw error;
  }

  const translations = new Map<string, PublishedItemTranslation>();
  if (!Array.isArray(data)) return translations;

  for (const row of data as TranslationRow[]) {
    const translation = parsePublishedRow(row);
    if (translation && uniqueIds.includes(translation.itemId)) {
      translations.set(translation.itemId, translation);
    }
  }

  return translations;
}
