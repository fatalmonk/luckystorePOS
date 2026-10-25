import type { Product } from './types';

const RADHUNI_SPICE_FAMILY = /^Radhuni\s+(Dhoniya|Holud|Jira|Morich)\s+Gura\b/i;

export function getRadhuniSpiceFamily(name: string): string | null {
  return name.match(RADHUNI_SPICE_FAMILY)?.[1]?.toLowerCase() ?? null;
}

function getPackGrams(name: string): number {
  const match = name.match(/\b(\d+(?:\.\d+)?)\s*(?:g|gm)\b/i);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

export function filterRadhuniPackVariants(currentProduct: Product, candidates: Product[]): Product[] {
  const family = getRadhuniSpiceFamily(currentProduct.name);
  if (!family) return [];

  return candidates
    .filter((candidate) => (
      candidate.id !== currentProduct.id
      && candidate.stock > 0
      && getRadhuniSpiceFamily(candidate.name) === family
    ))
    .sort((a, b) => getPackGrams(a.name) - getPackGrams(b.name) || a.name.localeCompare(b.name));
}
