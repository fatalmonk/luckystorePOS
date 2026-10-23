/** Prefer an explicit pack size in the product name when catalog data only says "pc". */
export function getDisplayProductUnit(name: string, unit?: string | null): string | undefined {
  if (!unit) return undefined;
  if (!/^(?:pc|pcs|piece|pieces)$/i.test(unit.trim())) return unit;

  const packSize = name.match(/\b(?:\d+(?:\.\d+)?|\d+\s*\/\s*\d+|[½¼¾])\s*(?:ml|millilit(?:er|re)s?|l|lit(?:er|re)s?|kg|kilograms?|g|grams?)\b/i)?.[0];
  return packSize || unit;
}
