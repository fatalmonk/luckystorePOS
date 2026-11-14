import type {
  CanonicalTranslationSource,
  LocalizedProductDetails,
  TranslationEvidenceSnapshot,
  TranslationReviewStatus,
  TranslationTransitionContext,
} from './translationTypes';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;
const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && timestamp.test(value) && Number.isFinite(Date.parse(value));
const isText = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

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
    && value.sourceUris.every((uri) => typeof uri === 'string' && /^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(uri));
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
  if (to === 'draft') return action === 'save_draft';
  if (translation.id.startsWith('new:') || !context.humanReviewConfirmed
    || !matchesTranslationEvidence(translation.evidence_snapshot, source)) return false;
  if (from === 'draft' && to === 'reviewed') return action === 'mark_reviewed';
  return from === 'reviewed' && to === 'published' && action === 'publish'
    && typeof translation.reviewed_by === 'string' && uuid.test(translation.reviewed_by)
    && isTimestamp(translation.reviewed_at);
}
