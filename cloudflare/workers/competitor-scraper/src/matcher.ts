import type { MatchableItem, MatchResult, NormalizedProduct } from "./types.ts";

export const MATCHER_VERSION = "matcher-v1";

const SIMILARITY_THRESHOLD = 0.92;
const AMBIGUITY_GAP = 0.03;

/**
 * Normalize a product name for fuzzy comparison.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(kg|g|gm|ml|l|liter|litre|pack|pcs|piece|pieces|bottle|can|box|bag|sachet)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type CanonicalSize = { grams: number | null; milliliters: number | null };

/**
 * Convert a standalone package unit string to canonical grams or milliliters.
 */
export function canonicalUnit(unit: string | null): CanonicalSize | null {
  if (!unit) return null;
  const u = unit.toLowerCase().trim();
  const match = u.match(/^(\d+(?:\.\d+)?)\s*(kg|g|gm|ml|l|liter|litre)$/);
  if (!match) return null;
  const rawValue = match[1];
  const rawUnit = match[2];
  if (rawValue === undefined || rawUnit === undefined) return null;
  const value = Number.parseFloat(rawValue);
  if (Number.isNaN(value) || value <= 0) return null;
  if (["kg"].includes(rawUnit)) return { grams: value * 1000, milliliters: null };
  if (["g", "gm"].includes(rawUnit)) return { grams: value, milliliters: null };
  if (["l", "liter", "litre"].includes(rawUnit)) return { grams: null, milliliters: value * 1000 };
  if (["ml"].includes(rawUnit)) return { grams: null, milliliters: value };
  return null;
}

export function parsePackageInfo(name: string): { quantity: number | null; unit: string | null } {
  const match = name.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|ml|l|liter|litre)\b/i);
  if (!match) return { quantity: null, unit: null };
  const rawValue = match[1];
  const rawUnit = match[2];
  if (rawValue === undefined || rawUnit === undefined) return { quantity: null, unit: null };
  const quantity = Number.parseFloat(rawValue);
  if (Number.isNaN(quantity)) return { quantity: null, unit: null };
  const unit = rawUnit.toLowerCase();
  return { quantity, unit };
}

function toCanonicalWeight(quantity: number, unit: string): number | null {
  const u = unit.toLowerCase();
  if (["kg"].includes(u)) return quantity * 1000;
  if (["g", "gm"].includes(u)) return quantity;
  return null;
}

function toCanonicalVolume(quantity: number, unit: string): number | null {
  const u = unit.toLowerCase();
  if (["l", "liter", "litre"].includes(u)) return quantity * 1000;
  if (["ml"].includes(u)) return quantity;
  return null;
}

function hasSize(item: MatchableItem): boolean {
  const parsed = parsePackageInfo(item.name);
  return (
    item.package_quantity !== null ||
    item.package_unit !== null ||
    (parsed.quantity !== null && parsed.unit !== null)
  );
}

function itemCanonicalSize(item: MatchableItem): CanonicalSize | null {
  if (item.package_quantity !== null && item.package_unit !== null) {
    const weight = toCanonicalWeight(item.package_quantity, item.package_unit);
    if (weight !== null) return { grams: weight, milliliters: null };
    const volume = toCanonicalVolume(item.package_quantity, item.package_unit);
    if (volume !== null) return { grams: null, milliliters: volume };
  }
  if (item.package_unit !== null) {
    return canonicalUnit(item.package_unit);
  }
  if (item.package_quantity !== null) {
    return { grams: item.package_quantity, milliliters: null };
  }
  const parsed = parsePackageInfo(item.name);
  if (parsed.quantity !== null && parsed.unit !== null) {
    const weight = toCanonicalWeight(parsed.quantity, parsed.unit);
    if (weight !== null) return { grams: weight, milliliters: null };
    const volume = toCanonicalVolume(parsed.quantity, parsed.unit);
    if (volume !== null) return { grams: null, milliliters: volume };
  }
  return null;
}

function isCompatibleSize(item: MatchableItem, product: NormalizedProduct): boolean {
  const prodParsed = parsePackageInfo(product.name);
  const itemHasSize = hasSize(item);

  if (prodParsed.quantity === null || prodParsed.unit === null) {
    return !itemHasSize;
  }
  if (!itemHasSize) return false;

  const itemCanonical = itemCanonicalSize(item);
  if (!itemCanonical) return false;

  const prodWeight = toCanonicalWeight(prodParsed.quantity, prodParsed.unit);
  const prodVolume = toCanonicalVolume(prodParsed.quantity, prodParsed.unit);

  if (prodWeight !== null && itemCanonical.grams !== null) {
    return Math.abs(prodWeight - itemCanonical.grams) < 1;
  }
  if (prodVolume !== null && itemCanonical.milliliters !== null) {
    return Math.abs(prodVolume - itemCanonical.milliliters) < 1;
  }

  return false;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => [0]);
  for (let j = 1; j <= b.length; j++) {
    const row = matrix[0];
    if (row) row[j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    const row: number[] = [];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const diagRow = matrix[i - 1];
      const diagValue = diagRow ? diagRow[j - 1] : 0;
      const diag = diagValue ?? 0;
      const left = row[j - 1] ?? i;
      const top = diagRow?.[j] ?? i;
      row[j] =
        a[i - 1] === b[j - 1]
          ? diag
          : Math.min(left + 1, top + 1, diag + 1);
    }
    matrix[i] = row;
  }
  const lastRow = matrix[a.length];
  return lastRow?.[b.length] ?? 0;
}

export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na.length === 0 || nb.length === 0) return 0;
  if (na === nb) return 1;
  const distance = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - distance / maxLen;
}

export function findBestMatch(product: NormalizedProduct, items: MatchableItem[]): MatchResult {
  // Barcode/external id exact match wins immediately before size/name checks.
  if (product.competitor_product_id) {
    for (const item of items) {
      if (
        (item.barcode && item.barcode === product.competitor_product_id) ||
        (item.sku && item.sku === product.competitor_product_id)
      ) {
        return {
          item_id: item.id,
          confidence: 1,
          matcher_version: MATCHER_VERSION,
        };
      }
    }
  }

  let bestItem: MatchableItem | null = null;
  let bestScore = 0;
  let runnerUpScore = 0;

  for (const item of items) {
    if (!isCompatibleSize(item, product)) continue;

    const score = nameSimilarity(item.name, product.name);
    if (score > bestScore) {
      runnerUpScore = bestScore;
      bestScore = score;
      bestItem = item;
    } else if (score > runnerUpScore) {
      runnerUpScore = score;
    }
  }

  if (bestScore >= SIMILARITY_THRESHOLD && bestScore - runnerUpScore > AMBIGUITY_GAP) {
    return {
      item_id: bestItem?.id ?? null,
      confidence: Number(bestScore.toFixed(4)),
      matcher_version: MATCHER_VERSION,
    };
  }

  return {
    item_id: null,
    confidence: null,
    matcher_version: MATCHER_VERSION,
  };
}

export function matchAll(products: NormalizedProduct[], items: MatchableItem[]): { product: NormalizedProduct; result: MatchResult }[] {
  return products.map((product) => ({
    product,
    result: findBestMatch(product, items),
  }));
}
