/**
 * Product Enrichment Module
 *
 * Facade re-exporting enrichment types, registry records, and lookup utilities.
 */

import type { ProductEnrichment } from './productEnrichmentTypes';
import { PRODUCT_ENRICHMENTS } from './productEnrichmentRegistry';

// Re-export types and constants
export {
  EVIDENCE_SOURCES,
  type EvidenceSource,
  type EvidenceRecord,
  type ProductSpecification,
  type ProductFaq,
  type ProductFieldEvidence,
  type ProductEnrichment,
  GLOBAL_STORE_INSPECTION_POLICY,
  PILOT_STORE_INSPECTION_POLICY,
} from './productEnrichmentTypes';

// Re-export registry data
export {
  PRODUCT_ENRICHMENTS,
  PILOT_ENRICHED_PRODUCTS,
} from './productEnrichmentRegistry';

/**
 * Retrieve verified enrichment content for a product by slug or UUID prefix.
 *
 * Lookup order:
 * 1. Exact 8-char prefix match in PRODUCT_ENRICHMENTS
 * 2. Prefix extracted from slug suffix (--[8char])
 * 3. Fallback: undefined (renders standard base catalog presentation)
 */
export function getEnrichedProductData(slugOrId: string): ProductEnrichment | undefined {
  if (!slugOrId) return undefined;

  const normalized = slugOrId.toLowerCase().trim();

  // 1. Direct key match (e.g. 'b8a7c6c6')
  const directMatch = PRODUCT_ENRICHMENTS[normalized];
  if (directMatch) return directMatch;

  // 2. Extract prefix from canonical slug format: name-words--[prefix]
  const doubleHyphenParts = normalized.split('--');
  if (doubleHyphenParts.length > 1) {
    const candidatePrefix = doubleHyphenParts[doubleHyphenParts.length - 1];
    const match = PRODUCT_ENRICHMENTS[candidatePrefix];
    if (match) return match;
  }

  // 3. Extract prefix from single hyphen standard slug or raw UUID
  const singleHyphenParts = normalized.split('-');
  const lastPart = singleHyphenParts[singleHyphenParts.length - 1];
  if (lastPart && lastPart.length >= 8) {
    const candidatePrefix = lastPart.slice(0, 8);
    const match = PRODUCT_ENRICHMENTS[candidatePrefix];
    if (match) return match;
  }

  // 4. Raw UUID format (first segment of 8-4-4-4-12)
  const firstPart = singleHyphenParts[0];
  if (firstPart && firstPart.length === 8 && /^[0-9a-f]{8}$/i.test(firstPart)) {
    const match = PRODUCT_ENRICHMENTS[firstPart.toLowerCase()];
    if (match) return match;
  }

  // 5. Preserve compatibility with legacy slugs that contain a known prefix
  // outside the canonical suffix position.
  for (const [prefix, data] of Object.entries(PRODUCT_ENRICHMENTS)) {
    if (normalized.includes(prefix)) return data;
  }

  return undefined;
}
