import registry from './product-enrichment-evidence.json' with { type: 'json' };

type EvidenceRecord = { source: string; evidenceRef: string; sourceTitle: string | null; sourceUrl: string | null; skuScope: string | null; verifiedAt: string | null };
type RegistryEntry = {
  slugPrefix: string; exactName: string; brand: string; netQuantity: string;
  evidenceManifest: Record<string, EvidenceRecord>;
  specifications: Array<{ label: string; value: string; evidenceRefs: string[] }>;
};
export type ProductIdentity = { id: string; name: string; description?: string | null; sku?: string | null; brand?: string | null };
export type RegistryEvidenceResult = {
  key: string | null; matched: boolean; issue: string | null; entry: RegistryEntry | null;
  links: Array<{ title: string; url: string; verifiedAt: string | null; evidenceRef: string }>;
  missing: string[]; supportedFacts: string | null;
};

const records = registry as Record<string, RegistryEntry>;
const packageToken = /\b(\d+(?:\.\d+)?)\s*(kg|gm|g|ml|liters?|litres?|ltr|l|pieces?|pcs?)\b/i;
const quantity = (raw: string) => {
  const match = raw.match(packageToken);
  if (!match) return null;
  const units: Record<string, string> = { gm: 'g', g: 'g', kg: 'kg', ml: 'ml', l: 'l', ltr: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l', pc: 'pcs', pcs: 'pcs', piece: 'pcs', pieces: 'pcs' };
  return Number(match[1]) + units[match[2].toLowerCase()];
};
const normalizeName = (name: string) => name.toLowerCase().replace(/\bgrams?\b/g, 'g').replace(/\bgm\b/g, 'g').replace(/[^a-z0-9]+/g, '');
const safeUrl = (value: string | null) => value && /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(value);
const aliases: Record<string, string[]> = {
  '4d20b020': ['BelleAme Chocolate Digestive Biscuits 135g'],
};

export function resolveRegistryEvidence(source: ProductIdentity): RegistryEvidenceResult {
  const skuKey = source.sku?.match(/^CANVA-TEST-([a-f0-9]{8})$/i)?.[1].toLowerCase();
  // Testing SKUs carry explicit production IDs; normal catalog records use their UUID prefix.
  const key = skuKey || (source.sku?.startsWith('CANVA-TEST-') ? null : source.id.slice(0,8).toLowerCase());
  const empty = (issue: string, entry: RegistryEntry | null = null): RegistryEvidenceResult => ({
    key, matched: false, issue, entry, links: [], missing: [], supportedFacts: null,
  });
  if (!key || !/^[a-f0-9]{8}$/.test(key)) return empty('No valid production registry mapping on this product.');
  const entry = records[key];
  if (!entry || entry.slugPrefix.toLowerCase() !== key) return empty('No enrichment registry entry for the mapped production ID.');
  const accepted = [entry.exactName, ...(aliases[key] ?? [])];
  if (!accepted.some(name => normalizeName(name) === normalizeName(source.name))) {
    return empty('Product name or variant does not match the exact production registry entry.', entry);
  }
  const actualSizes = [...source.name.matchAll(new RegExp(packageToken.source, 'gi'))].map(match => quantity(match[0]));
  const registrySize = quantity(entry.netQuantity);
  if (!registrySize || !actualSizes.includes(registrySize)) {
    return empty('Product package size does not match the production registry entry.', entry);
  }
  if (source.brand && normalizeName(source.brand) !== normalizeName(entry.brand)) {
    return empty('Product brand conflicts with the matched registry record.', entry);
  }
  const entries = Object.entries(entry.evidenceManifest ?? {});
  const links = entries.filter(([, record]) => record.source === 'MANUFACTURER' && safeUrl(record.sourceUrl))
    .map(([, record]) => ({
      title: record.sourceTitle || 'Manufacturer source', url: record.sourceUrl!, verifiedAt: record.verifiedAt,
      evidenceRef: record.evidenceRef,
    })).filter((record, index, all) => all.findIndex(other => other.url === record.url) === index);
  const missing = entries.filter(([,record]) => (record.source === 'PACKAGING' || record.source === 'MANUFACTURER') && !safeUrl(record.sourceUrl))
    .map(([,record]) => (record.sourceTitle || record.source) + ': recorded claim has no openable source link.');
  if (links.length === 0) missing.unshift('No product-specific manufacturer or packaging source link is available. Keep this item in draft.');
  const supportedRefs = new Set(entries.filter(([,record]) => record.source === 'MANUFACTURER' && safeUrl(record.sourceUrl)).map(([ref]) => ref));
  const supportedSpecs = (entry.specifications ?? []).filter(spec =>
    spec.evidenceRefs.length > 0 && spec.evidenceRefs.every(ref => supportedRefs.has(ref))).slice(0, 8);
  const supportedFacts = links.length && supportedSpecs.length
    ? ['Exact item: ' + entry.exactName, 'Pack size: ' + entry.netQuantity,
        ...supportedSpecs.map(spec => spec.label + ': ' + spec.value)].join('\n')
    : null;
  return { key, matched: true, issue: null, entry, links, missing, supportedFacts };
}

export function registrySnapshot(source: ProductIdentity & {
  description: string | null; sku: string | null; barcode: string | null; brand: string | null; packageText: string | null
}) {
  const resolved = resolveRegistryEvidence(source);
  if (!resolved.matched || !resolved.links.length) return null;
  const dates = resolved.links.map(link => link.verifiedAt).filter((date): date is string => Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date)));
  if (!dates.length) return null;
  return {
    entityId: source.id, sourceName: source.name, sourceDescription: source.description,
    sku: source.sku, barcode: source.barcode, brand: source.brand, packageText: source.packageText,
    sourceUris: resolved.links.map(link => link.url), observedAt: dates.sort().at(-1)! + 'T00:00:00Z',
  };
}
