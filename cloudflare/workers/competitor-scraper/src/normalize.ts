import type { NormalizedProduct, ScrapedObservation } from "./types.ts";

export function extractBdtPrice(text: string): number | null {
  const match = text.match(/৳\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/);
  if (!match) return null;
  const first = match[1];
  if (first === undefined) return null;
  const cleaned = first.replace(/,/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function stripBdtCurrency(text: string): string {
  return text.replace(/৳\s*/g, "").trim();
}

export function buildRawData(product: NormalizedProduct): Record<string, unknown> {
  return product.raw_data;
}

export function observationKeysEqual(a: ScrapedObservation, b: ScrapedObservation): boolean {
  return a.observation_key === b.observation_key;
}
