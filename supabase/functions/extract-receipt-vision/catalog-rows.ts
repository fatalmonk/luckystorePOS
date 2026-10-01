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
  const detectedNames = new Set(activeRows.map(normalizeRowName));
  const extractedPurchased = items.filter(item => item.isPurchased);
  const reconciled = extractedPurchased.filter(item => detectedNames.has(normalizeRowName(item.name))
    && (item.quantity != null || item.unitPrice != null || item.total != null));
  return {
    items: reconciled,
    reviewRequired: activeRows.length === 0 || reconciled.length === 0 || reconciled.length !== extractedPurchased.length,
  };
}
