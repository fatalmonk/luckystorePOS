export function formatCurrency(amount: number): string {
  const absAmountStr = Math.abs(amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return amount < 0 ? `-৳${absAmountStr}` : `৳${absAmountStr}`;
}

export function formatCurrencyValue(amount: number): string {
  return Math.abs(amount).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatCurrencyCompact(amount: number): string {
  const absAmountStr = Math.abs(amount).toFixed(2);
  return amount < 0 ? `-৳${absAmountStr}` : `৳${absAmountStr}`;
}

export function downloadCSV(rows: Record<string, unknown>[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        const s = String(v);
        // Prevent CSV formula injection: prefix dangerous leading chars with apostrophe
        const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
        return safe.includes(',') || safe.includes('"') || safe.includes('\n')
          ? `"${safe.replace(/"/g, '""')}"`
          : safe;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Calculates gross profit margin percentage: ((price - cost) / price) * 100
 * Returns null if cost or price is invalid / non-positive.
 */
export function calcMargin(cost?: number | null, price?: number | null): number | null {
  if (typeof cost !== 'number' || typeof price !== 'number' || price <= 0 || cost <= 0) return null;
  return ((price - cost) / price) * 100;
}

export function calcMarginRounded(cost?: number | null, price?: number | null): number | null {
  const m = calcMargin(cost, price);
  return m !== null ? Math.round(m) : null;
}