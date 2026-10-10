/**
 * Product Enrichment Types & Constants
 *
 * Hard Evidence Gate:
 * Every factual customer-visible field in this registry MUST map to one or more registered
 * evidence records in the SKU's normalized evidence manifest.
 *
 * Permitted Evidence Sources:
 * - PACKAGING: Directly printed on physical packaging or container label.
 * - MANUFACTURER: Published specification or declaration from the verified manufacturer for this SKU.
 * - LUCKY_STORE_CATALOG: Store catalog database attributes (SKU, catalog category, database product record).
 * - LUCKY_STORE_POLICY: Verified operational policy (1 km Chawkbazar delivery radius, ৳500+ free threshold, 100% doorstep inspection).
 * - CALCULATED_FROM_VERIFIED_FACTS: Transparent mathematical derivations explicitly labeled as calculations.
 *
 * Referential Integrity:
 * Every `evidenceRefs` key across specifications, FAQs, and field-level evidence MUST resolve to
 * a registered record in `evidenceManifest`. Dangling or undeclared evidence references are forbidden.
 */

export const EVIDENCE_SOURCES = [
  'PACKAGING',
  'MANUFACTURER',
  'LUCKY_STORE_CATALOG',
  'LUCKY_STORE_POLICY',
  'CALCULATED_FROM_VERIFIED_FACTS',
] as const;

export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export interface EvidenceRecord {
  source: EvidenceSource;
  evidenceRef: string;
  sourceTitle?: string;
  sourceUrl?: string;
  skuScope?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
  evidenceRefs: string[];
}

export interface ProductFaq {
  question: string;
  answer: string;
  evidenceRefs: string[];
}

export interface ProductFieldEvidence {
  exactName: string[];
  brand: string[];
  netQuantity: string[];
  category: string[];
  summary: string[];
  highlights?: string[][];
  usageDirections?: string[];
  storageInstructions?: string[];
}

export interface ProductEnrichment {
  /** 8-character UUID hex prefix matching slug suffix */
  slugPrefix: string;
  /** Exact canonical product name [PACKAGING/MANUFACTURER] */
  exactName: string;
  /** Verified brand name [PACKAGING/MANUFACTURER] */
  brand: string;
  /** Verified net quantity or volume [PACKAGING] */
  netQuantity: string;
  /** Verified canonical category name [LUCKY_STORE_CATALOG] */
  category: string;
  /** Answer-first opening summary (factual, concise, local purchase context) */
  summary: string;
  /** Structured tabular specifications with machine-readable provenance */
  specifications: ProductSpecification[];
  /** Packaging-supported key highlights [PACKAGING/MANUFACTURER/CALCULATED] */
  highlights?: string[];
  /** Practical preparation or culinary usage directions [PACKAGING] */
  usageDirections?: string;
  /** Storage instructions [PACKAGING] */
  storageInstructions?: string;
  /** Concise factual product Q&As [PACKAGING/MANUFACTURER/LUCKY_STORE_POLICY/CALCULATED] */
  faqs: ProductFaq[];
  /** Normalized evidence manifest for referential integrity */
  evidenceManifest: Record<string, EvidenceRecord>;
  /** Field-level provenance mappings to evidenceManifest keys */
  fieldEvidence: ProductFieldEvidence;
}

/**
 * Standard global store inspection policy manifest record.
 * Shared across catalog enrichment entries to eliminate redundant inline definitions.
 */
export const GLOBAL_STORE_INSPECTION_POLICY: EvidenceRecord = {
  source: 'LUCKY_STORE_POLICY',
  evidenceRef: 'https://luckystore1947.com/delivery',
  sourceTitle: 'Lucky Store 100% Doorstep Inspection Policy',
  verifiedAt: '2026-09-16',
  skuScope: 'GLOBAL',
};

/**
 * Legacy pilot inspection policy manifest record for pilot catalog cohort.
 */
export const PILOT_STORE_INSPECTION_POLICY: EvidenceRecord = {
  source: 'LUCKY_STORE_POLICY',
  evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
  sourceTitle: 'Lucky Store Inspection Policy',
  verifiedAt: '2026-09-16',
};
