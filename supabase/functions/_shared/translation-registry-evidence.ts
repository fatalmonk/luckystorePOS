import registry from './product-enrichment-evidence.json' with { type: 'json' };
import { registryOverrides, registrySupplements } from './translation-registry-overrides.ts';

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
  missing: string[]; supportedFacts: string | null; identityMatched: boolean;
  issueCode: 'NO_REGISTRY_ENTRY' | 'NAME_VARIANT_MISMATCH' | 'PACKAGE_MISMATCH' | 'BRAND_MISMATCH' | 'IDENTITY_ONLY' | 'MISSING_MANUFACTURER_URL' | null;
};

const records = registry as Record<string, RegistryEntry>;
const packageToken = /\b((?:\d+\s*\/\s*\d+|\d+(?:\.\d+)?))(?:\s*x\s*\d+)?\s*(kg|grams?|gm|g|ml|liters?|litres?|ltr|l|tea\s*bags?|bags?|pieces?|pcs?|sheets?)\b/i;
const quantity = (raw: string) => {
  const match = raw.match(packageToken);
  if (!match) return null;
  const units: Record<string, string> = {
    gram: 'g', grams: 'g', gm: 'g', g: 'g', kg: 'kg', ml: 'ml', l: 'l', ltr: 'l',
    liter: 'l', liters: 'l', litre: 'l', litres: 'l', bag: 'bags', bags: 'bags',
    'tea bag': 'bags', 'tea bags': 'bags', pc: 'pcs', pcs: 'pcs', piece: 'pcs', pieces: 'pcs',
    sheet: 'sheets', sheets: 'sheets',
  };
  const rawNumber = match[1].replace(/\s/g, '');
  const value = rawNumber.includes('/')
    ? rawNumber.split('/').map(Number).reduce((numerator, denominator) => numerator / denominator)
    : Number(rawNumber);
  return value + units[match[2].toLowerCase().replace(/\s+/g, ' ')];
};
const normalizeName = (name: string) => name.toLowerCase().replace(/(\d)\s*(?:grams?|gm)\b/g, '$1g').replace(/\bgrams?\b|\bgm\b/g, 'g').replace(/[^a-z0-9]+/g, '');
const safeUrl = (value: string | null) => value && /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(value);
const aliases: Record<string, string[]> = {
  '4d20b020': ['BelleAme Chocolate Digestive Biscuits 135g'],
  '31d78d91': ['Dano Delight 500 g'],
  '2c367e44': ['Polar Robusto (Salted Caramel)'],
  'be49558d': ['Polar Zafran Malai 1 Liter'],
  'bc7de70f': ['Polar Red Velvet 1L'],
  'fcefa591': ['Polar Tornado (Strawberry)'],
  '2e948079': ['Polar Coffee 1L'],
  'f2d567f0': ['Polar Mango 1L'],
  'eae60c9b': ['Polar Choco Bar (Chocolate)'],
  '38befb1a': ['Polar Tornado (Green Apple)'],
  'c00f9f4b': ['Polar Robusto (Chocolate)'],
  '93930edd': ['Polar Tornado (Mango)'],
  '54a7520e': ['Polar Doi 1 Liter'],
  'c1895793': ['Polar Kheer 1 Liter'],
  '0611e651': ['Polar Robusto (Vanilla)'],
  '79e0ece1': ['Polar Kheer 1/2 Liter'],
  '029b62d8': ['Radhuni Holud Gura 100 g'],
  '1f4650a7': ['Radhuni Dhoniya Gura 500 g'],
  '38ee3e1a': ['Radhuni Shorisha Oil 500 ml'],
};

export function resolveRegistryEvidence(source: ProductIdentity): RegistryEvidenceResult {
  const skuKey = source.sku?.match(/^CANVA-TEST-([a-f0-9]{8})$/i)?.[1].toLowerCase();
  // Testing SKUs carry explicit production IDs; normal catalog records use their UUID prefix.
  const key = skuKey || (source.sku?.startsWith('CANVA-TEST-') ? null : source.id.slice(0,8).toLowerCase());
  const empty = (issue: string, entry: RegistryEntry | null = null, issueCode: RegistryEvidenceResult['issueCode'] = null): RegistryEvidenceResult => ({
    key, matched: false, issue, entry, links: [], missing: [], supportedFacts: null, identityMatched: false, issueCode,
  });
  if (!key || !/^[a-f0-9]{8}$/.test(key)) return empty('No valid production registry mapping on this product.', null, 'NO_REGISTRY_ENTRY');
  const supplement = registrySupplements[key];
  const baseEntry = supplement ? {
    ...(records[key] ?? { slugPrefix: key, specifications: [] }),
    slugPrefix: key,
    exactName: supplement.exactName,
    brand: supplement.brand,
    netQuantity: supplement.netQuantity,
    evidenceManifest: {
      ...(records[key]?.evidenceManifest ?? {}),
      MFR_SPEC: {
        ...(records[key]?.evidenceManifest?.MFR_SPEC ?? {}),
        source: 'MANUFACTURER',
        evidenceRef: supplement.manufacturerUrl ?? supplement.exactName,
        sourceTitle: supplement.manufacturerTitle,
        sourceUrl: supplement.manufacturerUrl,
        skuScope: supplement.exactName,
        verifiedAt: '2026-11-16',
      },
    },
  } : records[key];
  if (!baseEntry || baseEntry.slugPrefix.toLowerCase() !== key) return empty('No enrichment registry entry for the mapped production ID.', null, 'NO_REGISTRY_ENTRY');
  const override = registryOverrides[key];
  const entry = override ? {
    ...baseEntry,
    ...(override.netQuantity ? { netQuantity: override.netQuantity } : {}),
    evidenceManifest: {
      ...baseEntry.evidenceManifest,
      MFR_SPEC: {
        ...baseEntry.evidenceManifest.MFR_SPEC,
        source: 'MANUFACTURER',
        sourceTitle: override.manufacturerTitle,
        sourceUrl: override.manufacturerUrl,
        verifiedAt: '2026-11-16',
      },
    },
  } : baseEntry;
  const accepted = [entry.exactName, ...(aliases[key] ?? [])];
  if (!accepted.some(name => normalizeName(name) === normalizeName(source.name))) {
    return empty('Product name or variant does not match the exact production registry entry.', entry, 'NAME_VARIANT_MISMATCH');
  }
  if (source.brand && normalizeName(source.brand) !== normalizeName(entry.brand)) {
    return empty('Product brand conflicts with the matched registry record.', entry, 'BRAND_MISMATCH');
  }
  const identityMatched = true;
  const entries = Object.entries(entry.evidenceManifest ?? {});
  const links = entries.filter(([, record]) => record.source === 'MANUFACTURER' && safeUrl(record.sourceUrl))
    .map(([, record]) => ({
      title: record.sourceTitle || 'Manufacturer source', url: record.sourceUrl!, verifiedAt: record.verifiedAt,
      evidenceRef: record.evidenceRef,
    })).filter((record, index, all) => all.findIndex(other => other.url === record.url) === index);
  const missing = entries.filter(([,record]) => (record.source === 'PACKAGING' || record.source === 'MANUFACTURER') && !safeUrl(record.sourceUrl))
    .map(([,record]) => (record.sourceTitle || record.source) + ': recorded claim has no openable source link.');
  if (links.length === 0) missing.unshift('No product-specific manufacturer or packaging source link is available. Keep this item in draft.');
  if (supplement?.identityOnly) {
    return {
      key, matched: false,
      issue: 'Catalog identity is grounded, but exact package/manufacturer evidence is incomplete; keep this item in draft.',
      entry, links, missing, supportedFacts: null, identityMatched, issueCode: 'IDENTITY_ONLY',
    };
  }
  const identityText = [source.name, source.description ?? ''].join(' ');
  const actualSizes = [...identityText.matchAll(new RegExp(packageToken.source, 'gi'))].map(match => quantity(match[0]));
  const registrySize = quantity(entry.netQuantity);
  if (!registrySize || !actualSizes.includes(registrySize)) {
    return { ...empty('Product package size does not match the production registry entry.', entry, 'PACKAGE_MISMATCH'), identityMatched };
  }
  const supportedRefs = new Set(entries.filter(([,record]) => record.source === 'MANUFACTURER' && safeUrl(record.sourceUrl)).map(([ref]) => ref));
  const supportedSpecs = (entry.specifications ?? []).filter(spec =>
    spec.evidenceRefs.length > 0 && spec.evidenceRefs.every(ref => supportedRefs.has(ref))).slice(0, 8);
  const supportedFacts = links.length && supportedSpecs.length
    ? ['Exact item: ' + entry.exactName, 'Pack size: ' + entry.netQuantity,
        ...supportedSpecs.map(spec => spec.label + ': ' + spec.value)].join('\n')
    : null;
  return { key, matched: true, issue: null, entry, links, missing, supportedFacts, identityMatched,
    issueCode: links.length ? null : 'MISSING_MANUFACTURER_URL' };
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
