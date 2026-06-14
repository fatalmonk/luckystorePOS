/**
 * BDT price formatting helper.
 * - Shows whole taka when the value is an integer (or very close).
 * - Shows 2 decimals only when the value is genuinely fractional.
 * - Always uses the Bengali taka sign (৳).
 */
export function formatBdt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '৳—';

  const isFractional = !Number.isInteger(value) && Math.abs(value - Math.round(value)) > 0.001;

  const formatted = isFractional
    ? value.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(value).toLocaleString('en-BD');

  return `৳${formatted}`;
}

/** Format a unit price with the unit label, e.g. "৳12.50 / kg". */
export function formatUnitPrice(value: number | null | undefined, unit: string): string {
  if (value == null || Number.isNaN(value)) return `৳— / ${unit}`;
  return `${formatBdt(value)} / ${unit}`;
}
