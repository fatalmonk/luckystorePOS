import type { ProductMatchStatus } from '../types';
import { calculatePriceGapFraction } from './priceGap';

type ProductDescription = {
  name: string;
  brand?: string | null;
  barcode?: string | null;
};

type MatchOptions = { previouslyVerified?: boolean };

type PackageDetails = {
  dimension: 'mass' | 'volume' | 'count';
  quantity: number;
  packCount: number;
};

const VARIANTS = [
  'extra hot', 'unsalted', 'salted', 'lemon', 'orange', 'chocolate', 'strawberry',
  'vanilla', 'mint', 'spicy', 'mild', 'original', 'classic', 'regular', 'sugar free',
];

const QUANTITY_PATTERN = /(\d+(?:\.\d+)?)\s*(kg|kilo|g|gm|grams?|ml|l|ltr|liters?|litres?|pcs?|pieces?)\b/gi;
const PACK_COUNT_PATTERN = /(?:\b(\d+)\s*[x×]\s*(?=\d)|\bpack\s+of\s+(\d+)\b|\b(\d+)\s*[- ]?pack\b)/gi;
const REVERSE_PACK_COUNT_PATTERN = /\d+(?:\.\d+)?\s*(?:kg|kilo|g|gm|grams?|ml|l|ltr|liters?|litres?|pcs?|pieces?)\s*[x×]\s*(\d+)/gi;
const NON_FAMILY_WORDS = new Set(['and', 'with', 'the', 'pack', 'of', 'for', 'size']);

export function resolveProductMatchStatus(
  matcherVersion: string | null | undefined,
  matchMetadata?: Record<string, unknown> | null,
  itemId?: string | null,
  source?: 'scraper' | 'manual',
  isOverrideActive?: boolean,
): ProductMatchStatus {
  if (source === 'manual' && isOverrideActive) return 'VERIFIED';
  const version = matcherVersion ?? '';
  const prefixStatus = version.match(/^safe-v2:(VERIFIED|PROBABLE|AMBIGUOUS|REJECTED):/i)?.[1];
  if (prefixStatus) return prefixStatus.toUpperCase() as ProductMatchStatus;
  if (version === 'url-direct-user-v2') return 'VERIFIED';

  const metadataStatus = matchMetadata?.match_status;
  if (metadataStatus === 'PROBABLE' || metadataStatus === 'AMBIGUOUS'
      || metadataStatus === 'REJECTED') {
    return metadataStatus;
  }
  if (metadataStatus === 'VERIFIED'
      && (matchMetadata?.verification_source === 'user-confirmed'
        || matchMetadata?.verification_source === 'attribute-exact')) {
    return 'VERIFIED';
  }
  if (/^(none|unlinked-)/i.test(version)) return 'REJECTED';
  if (itemId && version) return 'PROBABLE';
  return 'AMBIGUOUS';
}

function packageDetails(name: string): PackageDetails | null {
  const text = name.toLowerCase();
  const quantities = [...text.matchAll(QUANTITY_PATTERN)];
  if (quantities.length !== 1) return null;

  const match = quantities[0];
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(value) || value <= 0) return null;

  let dimension: PackageDetails['dimension'];
  let quantity = value;
  if (['kg', 'kilo', 'g', 'gm', 'gram', 'grams'].includes(unit)) {
    dimension = 'mass';
    if (unit === 'kg' || unit === 'kilo') quantity *= 1000;
  } else if (['ml', 'l', 'ltr', 'liter', 'liters', 'litre', 'litres'].includes(unit)) {
    dimension = 'volume';
    if (unit !== 'ml') quantity *= 1000;
  } else {
    dimension = 'count';
  }

  const packMatches = [...text.matchAll(PACK_COUNT_PATTERN)];
  const reversePackMatches = [...text.matchAll(REVERSE_PACK_COUNT_PATTERN)];
  const counts = [
    ...packMatches.map((item) => Number(item[1] || item[2] || item[3])),
    ...reversePackMatches.map((item) => Number(item[1])),
  ];
  const uniqueCounts = [...new Set(counts)];
  if (uniqueCounts.length > 1 || uniqueCounts.some((count) => count <= 0)) return null;

  return { dimension, quantity, packCount: uniqueCounts[0] ?? 1 };
}

function validGtin(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[\s-]/g, '');
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits)) return null;

  const body = digits.slice(0, -1);
  const expected = Number(digits.at(-1));
  const weightedSum = [...body].reverse().reduce(
    (sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 3 : 1),
    0,
  );
  return (10 - (weightedSum % 10)) % 10 === expected ? digits : null;
}

function normalizedBrand(product: ProductDescription): string {
  return (product.brand?.trim() || product.name.trim().split(/\s+/)[0] || '').toLowerCase();
}

function foundVariants(name: string): string[] {
  const lower = name.toLowerCase();
  return VARIANTS.filter((variant) => new RegExp(`\\b${variant.replace(/ /g, '\\s+')}\\b`).test(lower));
}

function familyTokens(product: ProductDescription): string[] {
  const lower = product.name.toLowerCase()
    .replace(REVERSE_PACK_COUNT_PATTERN, ' ')
    .replace(QUANTITY_PATTERN, ' ')
    .replace(PACK_COUNT_PATTERN, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ');
  const brand = normalizedBrand(product);
  return [...new Set(lower.split(/\s+/).filter((word) => word && word !== brand && !NON_FAMILY_WORDS.has(word)))];
}

function samePackage(left: PackageDetails, right: PackageDetails): boolean {
  return left.dimension === right.dimension
    && left.quantity === right.quantity
    && left.packCount === right.packCount;
}

export function classifyCompetitorProductMatch(
  observed: ProductDescription,
  catalog: ProductDescription,
  options: MatchOptions = {},
): { status: ProductMatchStatus; reason: string } {
  const hasExplicitBrandEvidence = Boolean(observed.brand?.trim() && catalog.brand?.trim());
  const observedGtin = validGtin(observed.barcode);
  const catalogGtin = validGtin(catalog.barcode);
  if (observed.barcode && catalog.barcode && observedGtin !== catalogGtin) {
    return { status: 'REJECTED', reason: 'barcode-conflict' };
  }

  const observedPackage = packageDetails(observed.name);
  const catalogPackage = packageDetails(catalog.name);
  if (observedPackage && catalogPackage && !samePackage(observedPackage, catalogPackage)) {
    return { status: 'REJECTED', reason: 'package-conflict' };
  }

  const observedVariants = foundVariants(observed.name);
  const catalogVariants = foundVariants(catalog.name);
  if (observedVariants.length && catalogVariants.length
      && observedVariants.join('|') !== catalogVariants.join('|')) {
    return { status: 'REJECTED', reason: 'variant-conflict' };
  }

  if (observedGtin && catalogGtin && observedGtin === catalogGtin) {
    return { status: 'VERIFIED', reason: 'gtin-and-attributes-compatible' };
  }
  if (options.previouslyVerified) {
    return { status: 'VERIFIED', reason: 'previously-verified-mapping' };
  }

  const observedBrand = normalizedBrand(observed);
  const catalogBrand = normalizedBrand(catalog);
  if (!observedBrand || !catalogBrand || observedBrand !== catalogBrand) {
    return { status: 'AMBIGUOUS', reason: 'brand-not-established' };
  }
  if (!observedPackage || !catalogPackage) {
    return { status: 'AMBIGUOUS', reason: 'package-quantity-missing-or-ambiguous' };
  }
  if (observedVariants.length !== catalogVariants.length) {
    return { status: 'AMBIGUOUS', reason: 'variant-evidence-incomplete' };
  }

  const observedFamily = familyTokens(observed);
  const catalogFamily = familyTokens(catalog);
  const intersection = observedFamily.filter((token) => catalogFamily.includes(token));
  if (intersection.length < 2) {
    return { status: 'AMBIGUOUS', reason: 'product-family-not-established' };
  }

  const union = new Set([...observedFamily, ...catalogFamily]);
  const similarity = intersection.length / union.size;
  if (similarity === 1) {
    return hasExplicitBrandEvidence
      ? { status: 'VERIFIED', reason: 'brand-variant-package-exact' }
      : { status: 'PROBABLE', reason: 'brand-not-independently-established' };
  }
  if (similarity >= 0.8) return { status: 'PROBABLE', reason: 'brand-package-name-similar' };
  return { status: 'AMBIGUOUS', reason: 'product-family-not-established' };
}

export function calculateVerifiedPriceGap(
  status: ProductMatchStatus,
  ourPrice: number | null | undefined,
  competitorPrice: number | null | undefined,
): number | null {
  if (status !== 'VERIFIED') return null;
  return calculatePriceGapFraction(ourPrice, competitorPrice);
}
