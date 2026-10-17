import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buyingGuideSchema, guideContentHash, type BuyingGuide } from '../../lib/buying-guides/model';
import { REVIEW_GUIDES } from '../../lib/buying-guides/research';
import { resolveGuideProducts } from '../../lib/buying-guides/catalogue';

const { records, getProducts } = vi.hoisted(() => ({ records: [] as unknown[], getProducts: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../../lib/buying-guides/registry', () => ({ BUYING_GUIDES: records }));
vi.mock('../../lib/buying-guides/catalogue', async importOriginal => ({ ...await importOriginal<object>(), getGuideProducts: getProducts }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
vi.mock('../../components/buying-guides/GuideTracking', () => ({
  GuideView: () => null,
  GuideAddToCartButton: ({ product }: { product: { name: string } }) => <button type="button">Add to cart<span className="sr-only"> {product.name}</span></button>,
  GuideProductLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
import BuyingGuidePage, { generateMetadata } from './[slug]/page';
import BuyingGuidesIndex, { generateMetadata as indexMetadata } from './page';
import styles from '../../components/buying-guides/buying-guides.module.css';

function fixture(): BuyingGuide {
  const draft = buyingGuideSchema.parse({ ...structuredClone(REVIEW_GUIDES[0]),
    author: { name: 'Synthetic editor', kind: 'Organization', profileUrl: 'https://example.com/editor' },
    publishedAt: '2026-10-15T12:00:00Z', updatedAt: '2026-10-15T12:00:00Z' });
  return buyingGuideSchema.parse({ ...draft, state: 'published', approval: {
    revision: draft.revision, contentHash: guideContentHash(draft), verifiedBy: 'Test verifier', verifiedAt: '2026-10-15T10:00:00Z',
    approvedBy: 'Test approver', approvedAt: '2026-10-15T11:00:00Z',
  } });
}

describe('buying-guide server routes', () => {
  beforeEach(() => { records.splice(0); vi.clearAllMocks(); });
  it('404s invalid, draft, review and archived slugs before fetching any catalogue', async () => {
    const guide = fixture();
    for (const state of ['draft', 'review', 'archived'] as const) {
      records.splice(0, records.length, { ...guide, state });
      await expect(BuyingGuidePage({ params: Promise.resolve({ slug: guide.slug }) })).rejects.toThrow('NOT_FOUND');
      await expect(generateMetadata({ params: Promise.resolve({ slug: guide.slug }) })).rejects.toThrow('NOT_FOUND');
    }
    await expect(BuyingGuidePage({ params: Promise.resolve({ slug: '../checkout' }) })).rejects.toThrow('NOT_FOUND');
    await expect(BuyingGuidePage({ params: Promise.resolve({ slug: 'missing' }) })).rejects.toThrow('NOT_FOUND');
    expect(getProducts).not.toHaveBeenCalled();
  });
  it('renders crawlable semantic content, exact schema and current offers without client JavaScript', async () => {
    const guide = fixture(); records.push(guide);
    const rows = guide.products.map((p, i) => ({
      id: p.id, name: p.verifiedName, brand: 'Olympic', sku: `SKU-${i + 1}`,
      price: 30 + i, qty_on_hand: i ? 0 : 5, sellable_qty: i ? 0 : 5,
      category_id: guide.category.id, image_url: `https://images.luckystore1947.com/products/${p.id}.webp`,
    }));
    getProducts.mockResolvedValue(resolveGuideProducts(guide, rows));
    const html = renderToStaticMarkup(await BuyingGuidePage({ params: Promise.resolve({ slug: guide.slug }) }));
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelectorAll('table')).toHaveLength(2);
    expect(document.querySelectorAll('th[scope="col"]').length).toBeGreaterThan(5);
    expect(document.querySelectorAll('[data-comparison-criteria] li')).toHaveLength(4);
    expect(html).toContain('৳30');
    expect(html).toContain('Currently out of stock');
    expect(html.match(/Shop this product/g)).toHaveLength(1);
    expect(html.match(/Add to cart/g)).toHaveLength(1);
    expect(document.querySelectorAll('img[alt*="Olympic"]')).toHaveLength(3);
    const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(schema['@graph'][0]).toMatchObject({ '@type': 'Article', headline: guide.title, dateModified: guide.updatedAt });
    expect(schema['@graph'].filter((n: Record<string, unknown>) => n['@type'] === 'Product')).toHaveLength(3);
    expect(schema['@graph'][2]).toMatchObject({
      image: rows[0].image_url,
      sku: rows[0].sku,
      brand: { '@type': 'Brand', name: 'Olympic' },
    });
    expect(schema['@graph'][3].offers.availability).toBe('https://schema.org/OutOfStock');
    expect(html).not.toContain('AggregateRating');
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: guide.slug }) });
    expect(metadata.alternates?.canonical).toBe(`https://www.luckystore1947.com/best/${guide.slug}`);
    // Optional, clearly labelled synthetic render for local responsive inspection only.
    if (process.env.BUYING_GUIDE_PREVIEW_PATH) {
      const css = readFileSync('app/components/buying-guides/buying-guides.module.css', 'utf8')
        .replace(/\.([a-zA-Z][a-zA-Z0-9]*)/g, (match, name) => styles[name] ? `.${styles[name]}` : match);
      writeFileSync(process.env.BUYING_GUIDE_PREVIEW_PATH, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Synthetic buying-guide layout test</title><style>body{margin:0;font-family:system-ui;background:#faf7f0;color:#23352c}*{box-sizing:border-box}${css}</style></head><body><aside style="padding:1rem;background:#ffe8a3">TEST FIXTURE — synthetic approval, prices and author. Not a published guide.</aside>${html}</body></html>`);
    }
  });
  it('propagates upstream failures instead of rendering a successful empty comparison', async () => {
    const guide = fixture(); records.push(guide); getProducts.mockRejectedValue(new Error('Catalogue unavailable'));
    await expect(BuyingGuidePage({ params: Promise.resolve({ slug: guide.slug }) })).rejects.toThrow('Catalogue unavailable');
  });
  it('marks the empty guide index noindex and exposes only published guide links', () => {
    records.push(...REVIEW_GUIDES);
    expect(indexMetadata().robots).toEqual({ index: false, follow: true });
    expect(renderToStaticMarkup(<BuyingGuidesIndex />)).not.toContain('/best/biscuits-bangladesh');
    records.splice(0, records.length, fixture());
    expect(renderToStaticMarkup(<BuyingGuidesIndex />)).toContain('/best/biscuits-bangladesh');
  });
  it('escapes script-like editorial content inside structured data and visible text', async () => {
    const guide = fixture(); guide.title = '</script><script>alert(1)</script>';
    guide.approval!.contentHash = guideContentHash(guide); records.push(guide);
    getProducts.mockResolvedValue(resolveGuideProducts(guide, []));
    const html = renderToStaticMarkup(await BuyingGuidePage({ params: Promise.resolve({ slug: guide.slug }) }));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('\\u003c/script\\u003e');
  });
});
