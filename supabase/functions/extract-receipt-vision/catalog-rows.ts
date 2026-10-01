export type ExtractedRow = {
  name: string;
  isPurchased: boolean;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
};

const normalizeRowName = (name: string) => name.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();

/** Both passes must identify a row before OCR can suggest it as purchased. */
export function reconcileCatalogRows<T extends ExtractedRow>(items: T[], activeRows: string[]): { items: T[]; reviewRequired: boolean } {
  const detectedCounts = new Map<string, number>();
  for (const name of activeRows) {
    const normalized = normalizeRowName(name);
    detectedCounts.set(normalized, (detectedCounts.get(normalized) ?? 0) + 1);
  }
  const extractedPurchased = items.filter(item => item.isPurchased);
  const reconciled = extractedPurchased.filter(item => {
    const name = normalizeRowName(item.name);
    const remaining = detectedCounts.get(name) ?? 0;
    if (remaining === 0 || (item.quantity == null && item.unitPrice == null && item.total == null)) return false;
    detectedCounts.set(name, remaining - 1);
    return true;
  });
  return {
    items: reconciled,
    reviewRequired: reconciled.length === 0 || reconciled.length !== extractedPurchased.length
      || [...detectedCounts.values()].some(count => count > 0),
  };
}
