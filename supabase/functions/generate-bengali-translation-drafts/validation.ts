export type Source = { id: string; name: string; description: string | null; brand?: string | null };
export type Draft = { id: string; name: string; description: string | null; search_terms: string[] };
export const allowedOrigin = (origin: string | null) => !origin || ['https://admin.luckystore1947.com', 'http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin);
export const validRequest = (kind: unknown, limit: unknown) => (kind === 'item' || kind === 'category') && Number.isInteger(limit) && (limit as number) >= 1 && (limit as number) <= 10;
export const canGenerate = (role: unknown, profileTenant: unknown, recordTenant: unknown) =>
  (role === 'admin' || role === 'manager') && typeof profileTenant === 'string' && profileTenant === recordTenant;

const bengali = /[\u0980-\u09ff]/u;
const quantity = /\d+(?:[.,]\d+)?\s*(?:kg|g|gm|mg|ml|l|ltr|litre|liter|oz|lb|pcs?|pieces?|pack|ct|কেজি|গ্রাম|মিলি|লিটার)/giu;
const numbers = /\d+(?:[.,]\d+)?/gu;
const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '').replace(/gm/g, 'g').replace(/ltr|litre|liter/g, 'l');
const tokens = (value: string, pattern: RegExp) => [...value.matchAll(pattern)].map((match) => normalize(match[0])).sort();

export function validateDraft(source: Source, value: unknown): { draft?: Draft; error?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Invalid model row' };
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !['id', 'name', 'description', 'search_terms'].includes(key))) return { error: 'Unexpected model fields' };
  if (row.id !== source.id || typeof row.name !== 'string' || !bengali.test(row.name)
    || !row.name.trim() || row.name.length > 240) return { error: 'Invalid identity or Bengali name' };
  if (source.description === null && row.description !== null) return { error: 'Description was invented' };
  if (source.description !== null && (typeof row.description !== 'string' || !bengali.test(row.description) || row.description.length > 2000)) {
    return { error: 'Invalid Bengali description' };
  }
  const name = row.name.trim();
  const description = typeof row.description === 'string' ? row.description.trim() : null;
  for (const [canonical, translated] of [[source.name, name], [source.description ?? '', description ?? '']]) {
    if (JSON.stringify(tokens(canonical, numbers)) !== JSON.stringify(tokens(translated, numbers))
      || JSON.stringify(tokens(canonical, quantity)) !== JSON.stringify(tokens(translated, quantity))) return { error: 'Numeric or package identity changed' };
  }
  const translated = `${name} ${description ?? ''}`;
  if (source.brand && !translated.toLowerCase().includes(source.brand.toLowerCase())) return { error: 'Brand was not preserved' };
  if (!Array.isArray(row.search_terms) || row.search_terms.some((term) => typeof term !== 'string' || !term.trim() || term.length > 100)
    || row.search_terms.length > 12) return { error: 'Invalid search aliases' };
  const search_terms = [...new Set([source.name, name, ...(row.search_terms as string[]).map((term) => term.trim())])];
  return { draft: { id: source.id, name, description, search_terms } };
}

export function parseBatch(content: string, sources: Source[]): Map<string, { draft?: Draft; error?: string }> {
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { return new Map(sources.map((source) => [source.id, { error: 'Invalid model JSON' }])); }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Record<string, unknown>).translations)) {
    return new Map(sources.map((source) => [source.id, { error: 'Invalid model response' }]));
  }
  const rows = (parsed as { translations: unknown[] }).translations;
  const counts = new Map<string, number>();
  for (const row of rows) if (row && typeof row === 'object' && typeof (row as { id?: unknown }).id === 'string') {
    const id = (row as { id: string }).id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  if (rows.length !== sources.length || [...counts.keys()].some((id) => !sources.some((source) => source.id === id))) {
    return new Map(sources.map((source) => [source.id, { error: 'Model entity set mismatch' }]));
  }
  return new Map(sources.map((source) => [source.id, counts.get(source.id) === 1
    ? validateDraft(source, rows.find((row) => (row as { id?: unknown })?.id === source.id))
    : { error: 'Missing or duplicate model entity' }]));
}
