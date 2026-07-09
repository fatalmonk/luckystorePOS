/**
 * BDT price formatting helper.
 * - Shows whole taka when the value is an integer (or very close).
 * - Shows 2 decimals only when the value is genuinely fractional.
 * - Always uses the Bengali taka sign (৳).
 * - DETERMINISTIC: Avoids toLocaleString() to prevent SSR/client hydration mismatches.
 */
export function formatBdt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '৳—';

  const rounded = Math.round(value);
  const isFractional = Math.abs(value - rounded) > 0.005;

  // Manual formatting to ensure identical output on server (Node.js) and client (Browser)
  const formatNumber = (num: number, decimals: number) => {
    const fixed = num.toFixed(decimals);
    const [integer, fraction] = fixed.split('.');
    // Add commas for thousands separators
    const withCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fraction ? `${withCommas}.${fraction}` : withCommas;
  };

  const formatted = isFractional
    ? formatNumber(value, 2)
    : formatNumber(rounded, 0);

  return `৳${formatted}`;
}

/** Format a unit price with the unit label, e.g. "৳12.50 / kg". */
export function formatUnitPrice(value: number | null | undefined, unit: string): string {
  if (value == null || Number.isNaN(value)) return `৳— / ${unit}`;
  return `${formatBdt(value)} / ${unit}`;
}
