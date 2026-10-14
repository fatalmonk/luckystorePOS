/** Only emit publication timestamps supplied by the provider and valid on the calendar. */
export function getBlogPublicationDate(value: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return undefined;
  const date = new Date(value);
  // Validate the calendar day independently of the timestamp's timezone offset.
  const day = value.slice(0, 10);
  const calendar = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day) return undefined;
  return value;
}

export function getBlogCanonicalUrl(slug: string): string {
  return `https://www.luckystore1947.com/blog/${encodeURIComponent(slug)}`;
}
