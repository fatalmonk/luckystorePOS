import { describe, expect, it } from 'vitest';
import { resolveRegistryEvidence, registrySnapshot } from '../../../../../supabase/functions/_shared/translation-registry-evidence';

const five = [
  { id: '29e60fea-429c-4b7d-b639-406471a6623b', name: 'BelleAme Chocolate Digestive Biscuits 135g', sku: 'CANVA-TEST-4d20b020', brand: 'BelleAme', key: '4d20b020', links: 0 },
  { id: '7e9c8b3c-a299-47f7-950d-3866b9931ae2', name: 'Chupa Chups Best of Lollipops (6Pcs Bundle) - 72g', sku: 'CANVA-TEST-a73e0ab5', brand: null, key: 'a73e0ab5', links: 0 },
  { id: '58d3f6c1-5fb8-4328-814d-42d491ce2dd7', name: 'Marks Powder 1000gm', sku: 'CANVA-TEST-b8c7c186', brand: null, key: 'b8c7c186', links: 0 },
  { id: '1aafa29f-07ca-4f04-a702-549c1720bd6a', name: 'Samyang Buldak Ramen 2X Cup 70g', sku: 'CANVA-TEST-b79a6606', brand: null, key: 'b79a6606', links: 1 },
  { id: '5361dd0a-258e-4fb8-aca8-869450ba7c6a', name: 'Samyang Buldak Ramen Original Cup 70g', sku: 'CANVA-TEST-4bbb76d4', brand: null, key: '4bbb76d4', links: 1 },
] as const;
describe('Testing item to exact production registry evidence', () => {
  it.each(five)('maps $name by production prefix, name, variant and size', row => {
    const result = resolveRegistryEvidence(row);
    expect(result.matched).toBe(true);
    expect(result.key).toBe(row.key);
    expect(result.links).toHaveLength(row.links);
    expect(Boolean(result.supportedFacts)).toBe(row.links > 0);
    const source = { ...row, description: null, barcode: null, packageText: row.name.match(/\d+\s*(?:g|gm)/i)?.[0] ?? null };
    const snapshot = registrySnapshot(source);
    if (row.links) {
      expect(snapshot?.entityId).toBe(row.id);
      expect(snapshot?.sourceUris).toEqual(result.links.map(link => link.url));
    } else {
      expect(snapshot).toBeNull();
      expect(result.missing.some(message => message.includes('No product-specific'))).toBe(true);
    }
  });
  it('rejects variant substitution, wrong size, brand-only match and a forged mapping', () => {
    const original = five[4];
    expect(resolveRegistryEvidence({ ...original, name: 'Samyang Buldak Ramen 2X Cup 70g' }).matched).toBe(false);
    expect(resolveRegistryEvidence({ ...original, name: 'Samyang Buldak Ramen Original Cup 140g' }).matched).toBe(false);
    expect(resolveRegistryEvidence({ ...original, name: 'Samyang' }).matched).toBe(false);
    expect(resolveRegistryEvidence({ ...original, sku: 'CANVA-TEST-deadbeef' }).matched).toBe(false);
  });
});
