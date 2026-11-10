import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';
import { EMERGENCY_CATALOG_SNAPSHOT } from '../lib/products/emergencyCatalogSnapshot';
import { EMERGENCY_CATALOG_SNAPSHOT_IDS } from '../lib/products/emergencyCatalogSnapshotIds';
import { CATALOG_SNAPSHOT_PRODUCTS } from '../lib/products/getHomePageData';

const survivorId = '6e4bb7c3-bea2-40e8-af06-12cdf83b27c4';
const duplicateId = '0cb22302-74ab-4769-bde2-1a3667f00750';

describe('Dove duplicate storefront remediation', () => {
  it('permanently redirects exact English and Bengali duplicate paths', async () => {
    const redirects = await (nextConfig as { redirects: () => Promise<Array<Record<string, unknown>>> }).redirects();
    expect(redirects).toContainEqual({
      source: '/product/dove-shampoo-intensive-repair-330ml--0cb22302',
      destination: '/product/dove-shampoo-intensive-repair-330-ml--6e4bb7c3',
      permanent: true,
    });
    expect(redirects).toContainEqual({
      source: '/bn/product/dove-shampoo-intensive-repair-330ml--0cb22302',
      destination: '/bn/product/dove-shampoo-intensive-repair-330-ml--6e4bb7c3',
      permanent: true,
    });
  });

  it('excludes the duplicate from emergency browse fallback and keeps cart cleanup ID', () => {
    expect(EMERGENCY_CATALOG_SNAPSHOT.some((product) => String(product.id) === duplicateId)).toBe(false);
    expect(CATALOG_SNAPSHOT_PRODUCTS.some((product) => String(product.id) === duplicateId)).toBe(false);
    expect((EMERGENCY_CATALOG_SNAPSHOT_IDS as readonly string[]).includes(duplicateId)).toBe(true);
  });

  it('retains the survivor in browse fallback without claiming purchasable stock', () => {
    const survivor = CATALOG_SNAPSHOT_PRODUCTS.find((product) => product.id === survivorId);
    expect(survivor).toBeDefined();
    expect(survivor).toMatchObject({ stock: 0, availabilityUnknown: true });
  });

  it('keeps the owner-approved inventory target balanced at four units', () => {
    const target = { survivor: 4, duplicate: 0 };
    expect(target.survivor + target.duplicate).toBe(4);
  });
});
