import type {
  CanonicalTranslationSource,
  LocalizedProductDetails,
  TranslationEvidenceSnapshot,
  TranslationReviewStatus,
  TranslationRow,
  TranslationTransitionContext,
} from './translationTypes';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;
const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && timestamp.test(value) && Number.isFinite(Date.parse(value));
const isText = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const bengaliNameLetter = /[\u0985-\u09b9\u09dc-\u09df]/u;
const numberToken = /[0-9০-৯]+(?:[.,][0-9০-৯]+)?/gu;
const quantityToken = /[0-9০-৯]+(?:[.,][0-9০-৯]+)?\s*(?:kg|grams?|gm|mg|g|ml|liters?|litres?|ltr|l|pcs?|pieces?|pack|ct|কেজি|গ্রাম|মিলি|লিটার|পিস|প্যাক)(?![\p{L}\p{M}])/giu;
const protectedVariants = ['Original', '2X', 'Best of'];
const normalizeToken = (value: string) => value.toLowerCase()
  .replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)))
  .replace(/\s+/g, '')
  .replace(/liters?|litres?|ltr|লিটার/g, 'l')
  .replace(/গ্রাম|grams?|gm/g, 'g')
  .replace(/কেজি/g, 'kg')
  .replace(/মিলি/g, 'ml')
  .replace(/pieces?|pcs?|পিস/g, 'pcs')
  .replace(/প্যাক/g, 'pack');
const sortedTokens = (value: string, pattern: RegExp) => [...value.matchAll(pattern)]
  .map((match) => normalizeToken(match[0])).sort();

export type CatalogTranslationCheck = { valid: boolean; issues: string[] };

export async function catalogSourceVersion(source: Pick<CanonicalTranslationSource, 'id' | 'name' | 'description' | 'sku' | 'barcode' | 'brand'>): Promise<string> {
  const canonical = [source.id, source.name, source.description ?? '', source.sku ?? '', source.barcode ?? '', source.brand ?? ''].join('\u001f');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Catalog-only checks. These validate translation structure and identity
 * preservation without asserting manufacturer-backed factual claims.
 */
export function validateCatalogTranslation(
  source: CanonicalTranslationSource,
  translation: Pick<TranslationRow, 'name' | 'description'> & { search_terms?: string[] },
): CatalogTranslationCheck {
  const issues: string[] = [];
  const name = translation.name.trim();
  const description = translation.description?.trim() || null;
  const translatedText = `${name} ${description ?? ''} ${(translation.search_terms ?? []).join(' ')}`.toLowerCase();
  if (!bengaliNameLetter.test(name)) issues.push('Bengali product name is missing Bengali letters.');
  if (source.brand && !translatedText.includes(source.brand.toLowerCase())) issues.push('Catalog brand was not preserved.');
  if (JSON.stringify(sortedTokens(source.name, numberToken)) !== JSON.stringify(sortedTokens(name, numberToken))) {
    issues.push('Catalog name numeric identity changed.');
  }
  if (JSON.stringify(sortedTokens(source.name, quantityToken)) !== JSON.stringify(sortedTokens(name, quantityToken))) {
    issues.push('Catalog name package identity changed.');
  }
  for (const variant of protectedVariants) {
    if (source.name.includes(variant) && !name.includes(variant)) issues.push(`Protected variant "${variant}" changed.`);
  }
  if (source.description?.trim() && !description) issues.push('Catalog description is missing.');
  if (description && !bengaliNameLetter.test(description)) issues.push('Bengali description is missing Bengali letters.');
  if (!source.description?.trim() && description) issues.push('Description has no canonical catalog text to verify against.');
  if (source.description?.trim() && description) {
    if (JSON.stringify(sortedTokens(source.description, numberToken)) !== JSON.stringify(sortedTokens(description, numberToken))) {
      issues.push('Catalog description numeric identity changed.');
    }
    if (JSON.stringify(sortedTokens(source.description, quantityToken)) !== JSON.stringify(sortedTokens(description, quantityToken))) {
      issues.push('Catalog description package identity changed.');
    }
  }
  return { valid: issues.length === 0, issues };
}

export function getCanonicalPackageText(name: string, description: string | null): string | null {
  const quantity = /\b\d+(?:\.\d+)?\s*(?:kg|gm|g|ml|l|pcs?|pieces?|grams?|litres?|liters?)\b/i;
  return name.match(quantity)?.[0] ?? description?.match(quantity)?.[0] ?? null;
}

export function isTranslationEvidenceSnapshot(value: unknown): value is TranslationEvidenceSnapshot {
  if (!isObject(value) || 'snapshotSha256' in value || typeof value.entityId !== 'string' || !uuid.test(value.entityId)
    || !isText(value.sourceName) || !isTimestamp(value.observedAt)) return false;
  for (const key of ['sourceDescription', 'sku', 'barcode', 'brand', 'packageText']) {
    if (value[key] !== null && typeof value[key] !== 'string') return false;
  }
  return Array.isArray(value.sourceUris) && value.sourceUris.length > 0
    && value.sourceUris.every((uri) => typeof uri === 'string' && /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(uri));
}

export function matchesTranslationEvidence(value: unknown, source: CanonicalTranslationSource): boolean {
  return isTranslationEvidenceSnapshot(value)
    && value.entityId === source.id
    && value.sourceName === source.name
    && value.sourceDescription === source.description
    && value.sku === source.sku
    && value.barcode === source.barcode
    && value.brand === source.brand
    && value.packageText === source.packageText;
}

/** Verifies evidence snapshot identity only; does not validate factual claims. */
export function validateEvidenceIdentity(
  snapshot: unknown,
  source: CanonicalTranslationSource,
): CatalogTranslationCheck {
  return matchesTranslationEvidence(snapshot, source)
    ? { valid: true, issues: [] }
    : { valid: false, issues: ['Evidence snapshot does not match the current canonical catalog record.'] };
}

export function isLocalizedProductDetails(value: unknown): value is LocalizedProductDetails | null {
  if (value === null) return true;
  if (!isObject(value)) return false;
  const textKeys = ['summary', 'usageDirections', 'storageInstructions'];
  if (Object.keys(value).some((key) => ![...textKeys, 'highlights', 'specifications', 'faqs'].includes(key))) return false;
  if (textKeys.some((key) => key in value && !isText(value[key]))) return false;
  if ('highlights' in value && (!Array.isArray(value.highlights) || !value.highlights.every(isText))) return false;
  for (const [key, fields] of [['specifications', ['label', 'value']], ['faqs', ['question', 'answer']]] as const) {
    if (key in value && (!Array.isArray(value[key]) || !value[key].every((entry: unknown) =>
      isObject(entry) && Object.keys(entry).length === 2 && fields.every((field) => isText(entry[field]))))) return false;
  }
  return true;
}

export function canTransitionTranslation(
  from: TranslationReviewStatus,
  to: TranslationReviewStatus,
  context: TranslationTransitionContext,
): boolean {
  const { actor, translation, source, action } = context;
  if (!actor || !uuid.test(actor.id) || !['admin', 'manager'].includes(actor.role)
    || actor.tenantId !== translation.tenant_id || from !== translation.review_status
    || !source || source.tenantId !== translation.tenant_id
    || source.id !== (translation.item_id ?? translation.category_id)
    || translation.locale !== 'bn' || !isText(translation.name)
    || !isLocalizedProductDetails(translation.details ?? null)) return false;
  if (to === 'draft') return from !== 'published' && action === 'save_draft';
  if (translation.kind === 'item' && !source.description?.trim() && translation.details && Object.keys(translation.details).length > 0) return false;
  if (!validateCatalogTranslation(source, translation).valid) return false;
  if (translation.id.startsWith('new:')) return false;
  if (translation.source_version && source.sourceVersion && translation.source_version !== source.sourceVersion) return false;
  if (to !== 'published' || action !== 'publish' || !context.humanReviewConfirmed) return false;
  if (from === 'reviewed') return typeof translation.reviewed_by === 'string' && uuid.test(translation.reviewed_by)
    && isTimestamp(translation.reviewed_at);
  return from === 'draft';
}
