export function formatCurrency(amount: number): string {
  const absAmountStr = Math.abs(amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return amount < 0 ? `-৳${absAmountStr}` : `৳${absAmountStr}`;
}

export function formatCurrencyCompact(amount: number): string {
  return `৳${amount.toFixed(2)}`;
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