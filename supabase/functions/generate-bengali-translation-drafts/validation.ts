export type Source = { id: string; name: string; description: string | null; brand?: string | null; sku?: string | null; evidenceDescription?: string | null };
export type Draft = { id: string; name: string; description: string | null; search_terms: string[] };
export const allowedOrigin = (origin: string | null) => !origin || ['https://admin.luckystore1947.com', 'http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin);
export const validRequest = (kind: unknown, limit: unknown) => (kind === 'item' || kind === 'category') && Number.isInteger(limit) && (limit as number) >= 1 && (limit as number) <= 10;
export const boundedGenerationLimit = (requested: number) => Math.min(Math.max(1, requested), 3);
export const canGenerate = (role: unknown, profileTenant: unknown, recordTenant: unknown) =>
  (role === 'admin' || role === 'manager') && typeof profileTenant === 'string' && profileTenant === recordTenant;

const bengali = /[\u0980-\u09ff]/u;
// Match longer ASCII units first. Bengali numerals are normalized before
// comparing source quantities, so they cannot bypass numeric-claim guards.
const quantity = /[0-9\u09e6-\u09ef]+(?:[.,][0-9\u09e6-\u09ef]+)?\s*(?:kg|grams?|gm|mg|g|ml|liters?|litres?|ltr|lb|l|oz|pieces?|pcs?|pack|ct|কেজি|গ্রাম|মিলি|লিটার|পিস|প্যাক)(?![\p{L}\p{M}])/giu;
const numbers = /[0-9\u09e6-\u09ef]+(?:[.,][0-9\u09e6-\u09ef]+)?/gu;
const bengaliDigits = '০১২৩৪৫৬৭৮৯';
const normalize = (value: string) => value.toLowerCase()
  .replace(/[০-৯]/g, digit => String(bengaliDigits.indexOf(digit)))
  .replace(/\s+/g, '')
  .replace(/liters?|litres?|ltr|লিটার/g, 'l')
  .replace(/গ্রাম|grams?|gm/g, 'g').replace(/কেজি/g, 'kg').replace(/মিলি/g, 'ml')
  .replace(/pieces?|pcs?|পিস/g, 'pcs').replace(/প্যাক/g, 'pack');
const tokens = (value: string, pattern: RegExp) => [...value.matchAll(pattern)].map((match) => normalize(match[0])).sort();

export function validateDraft(source: Source, value: unknown, verifiedDescription?: string): { draft?: Draft; error?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Invalid model row' };
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !['id', 'name', 'description', 'search_terms'].includes(key))) return { error: 'Unexpected model fields' };
  if (row.id !== source.id || typeof row.name !== 'string' || !bengali.test(row.name)
    || !row.name.trim() || row.name.length > 240) return { error: 'Invalid identity or Bengali name' };
  const hasCanonicalDescription = Boolean(source.description?.trim());
  const hasEvidence = Boolean(source.evidenceDescription?.trim());
  if (!hasCanonicalDescription && !hasEvidence && row.description !== null) return { error: 'Description lacks evidence' };
  if ((hasCanonicalDescription || hasEvidence) && row.description === null) return { error: 'Bengali description is required when supported facts exist' };
  if ((hasCanonicalDescription || hasEvidence) && row.description !== null && (typeof row.description !== 'string' || !bengali.test(row.description) || row.description.length > 2000)) {
    return { error: 'Invalid Bengali description' };
  }
  const name = row.name.trim();
  const description = typeof row.description === 'string' ? row.description.trim() : null;
  if ((hasCanonicalDescription || hasEvidence) && !description) return { error: 'Bengali description is required when supported facts exist' };
  // Numeric checks cannot verify semantic claims in Bengali. Evidence-only copy must be a vetted template.
  if (!hasCanonicalDescription && hasEvidence && description !== verifiedDescription) return { error: 'Description contains unverified claims' };
  for (const [canonical, translated] of [[source.name, name], ...(hasCanonicalDescription ? [[source.description ?? '', description ?? '']] : [])]) {
    if (JSON.stringify(tokens(canonical, numbers)) !== JSON.stringify(tokens(translated, numbers))
      || JSON.stringify(tokens(canonical, quantity)) !== JSON.stringify(tokens(translated, quantity))) return { error: 'Numeric or package identity changed' };
  }
  for (const variant of ['Original', '2X', 'Best of']) {
    if (source.name.includes(variant) && !name.includes(variant)) return { error: 'Protected variant changed' };
  }
  if (!hasCanonicalDescription && hasEvidence && source.evidenceDescription && description) {
    const facts = source.evidenceDescription;
    for (const token of tokens(description, numbers)) {
      if (!tokens(facts, numbers).includes(token)) return { error: 'Description contains unsupported numeric claim' };
    }
    for (const token of tokens(description, quantity)) {
      if (!tokens(facts, quantity).includes(token)) return { error: 'Description contains unsupported package claim' };
    }
  }
  const translated = `${name} ${description ?? ''}`;
  if (source.brand && !translated.toLowerCase().includes(source.brand.toLowerCase())) return { error: 'Brand was not preserved' };
  if (!Array.isArray(row.search_terms) || row.search_terms.some((term) => typeof term !== 'string' || !term.trim() || term.length > 100)
    || row.search_terms.length > 12) return { error: 'Invalid search aliases' };
  const search_terms = [...new Set([source.name, name, ...(row.search_terms as string[]).map((term) => term.trim())])];
  return { draft: { id: source.id, name, description, search_terms } };
}

export function parseBatch(content: string, sources: Source[]): Map<string, { draft?: Draft; error?: string }> {
  // The JSON Schema contract is checked again locally: an extra or malformed row
  // must never be saved as a different product. Partial valid responses may be
  // saved individually instead of discarding the entire batch.
  const trimmed = content.trim();
  const candidate = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim()
    : trimmed;
  let parsed: unknown;
  try { parsed = JSON.parse(candidate); } catch {
    return new Map(sources.map((source) => [source.id, { error: 'Model returned invalid JSON' }]));
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
    || Object.keys(parsed).some(key => key !== 'translations')
    || !Array.isArray((parsed as Record<string, unknown>).translations)) {
    return new Map(sources.map(source => [source.id, { error: 'Invalid structured model response' }]));
  }
  const rows = (parsed as { translations: unknown[] }).translations;
  const counts = new Map<string, number>();
  const byId = new Map<string, unknown>();
  for (const row of rows) {
    if (row && typeof row === 'object' && !Array.isArray(row)
      && typeof (row as { id?: unknown }).id === 'string') {
      const id = (row as { id: string }).id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
      byId.set(id, row);
    }
  }
  return new Map(sources.map(source => [source.id, counts.get(source.id) === 1
    ? validateDraft(source, byId.get(source.id))
    : { error: 'Model omitted or duplicated this product' }]));
}
