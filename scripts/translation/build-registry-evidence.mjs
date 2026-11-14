import { build } from 'esbuild';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const entry = path.join(root, 'apps/customer_storefront/app/lib/products/productEnrichmentRegistry.ts');
const output = path.join(root, 'supabase/functions/_shared/product-enrichment-evidence.json');
const built = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64');
const { PRODUCT_ENRICHMENTS } = await import(moduleUrl);
const records = Object.fromEntries(Object.entries(PRODUCT_ENRICHMENTS).map(([key, data]) => {
  const evidenceManifest = Object.fromEntries(Object.entries(data.evidenceManifest || {})
    .filter(([, record]) => record.source === 'MANUFACTURER' || record.source === 'PACKAGING')
    .map(([ref, record]) => [ref, {
      source: record.source, evidenceRef: record.evidenceRef?.slice(0, 300) ?? '',
      sourceTitle: record.sourceTitle ?? null, sourceUrl: record.sourceUrl ?? null,
      skuScope: record.skuScope ?? null, verifiedAt: record.verifiedAt ?? null,
    }]));
  const usableRefs = new Set(Object.entries(evidenceManifest)
    .filter(([, record]) => record.source === 'MANUFACTURER' && record.sourceUrl?.startsWith('https://'))
    .map(([ref]) => ref));
  return [key.toLowerCase(), {
    slugPrefix: data.slugPrefix, exactName: data.exactName, brand: data.brand,
    netQuantity: data.netQuantity,
    specifications: data.specifications.filter(spec => spec.evidenceRefs?.length > 0 &&
      spec.evidenceRefs.every(ref => usableRefs.has(ref))).slice(0, 8),
    evidenceManifest,
  }];
}));
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(records) + '\n', 'utf8');
console.log('Wrote ' + Object.keys(records).length + ' exact-key evidence records.');
