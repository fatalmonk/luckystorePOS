import { supabase } from '../../../lib/supabase';
import { STOREFRONT_STORE_ID, getPromotionalPrice, getActiveWeeklyDealEdition, loadCurrentStorefrontDealCampaign, type StorefrontItemPromotion } from '../../../lib/storefront-promotions';
import { toProductSlug } from '../../../lib/products/slugify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = 'https://www.luckystore1947.com';
const PAGE_SIZE = 1000;

type CatalogRow = {
  id?: string;
  item_id?: string;
  name?: string;
  price?: number | string;
  mrp?: number | string | null;
  category?: string | null;
  image_url?: string | null;
  description?: string | null;
  unit?: string | null;
  qty_on_hand?: number | string | null;
  stock?: number | string | null;
};

type CampaignRow = StorefrontItemPromotion & { campaign_key?: string; selection_reason?: string };

type GuideProduct = {
  id: string;
  name: string;
  price: number;
  mrp: number;
  stock: number;
  category: string;
  imageUrl: string;
  reason?: string;
  onlinePrice?: number;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function toGuideProduct(row: CatalogRow): GuideProduct | null {
  const id = row.id ?? row.item_id;
  const price = Number(row.price);
  const mrp = Number(row.mrp);
  const stock = Number(row.qty_on_hand ?? row.stock ?? 0);
  if (!id || !row.name?.trim() || !Number.isFinite(price) || price <= 0 || !Number.isFinite(mrp) || mrp <= price || !Number.isFinite(stock) || stock <= 0) return null;
  return {
    id,
    name: row.name.trim(),
    price,
    mrp,
    stock,
    category: row.category?.trim() || 'Grocery',
    imageUrl: row.image_url?.trim() || '',
  };
}

async function loadCatalog(): Promise<GuideProduct[]> {
  let offset = 0;
  const products: GuideProduct[] = [];
  while (true) {
    const { data, error } = await supabase.rpc('search_storefront_catalog', {
      p_store_id: STOREFRONT_STORE_ID,
      p_query: '',
      p_category_id: null,
      p_limit: PAGE_SIZE,
      p_offset: offset,
    });
    if (error || !Array.isArray(data)) throw new Error('Storefront catalogue could not be verified');
    const rows = data as CatalogRow[];
    products.push(...rows.map(toGuideProduct).filter((product): product is GuideProduct => product !== null));
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return products;
}

function productCard(product: GuideProduct, activeEdition: boolean): string {
  const href = `${BASE_URL}/product/${toProductSlug(product.name, product.id)}`;
  const discount = Math.floor(((product.mrp - product.price) / product.mrp) * 100);
  const image = product.imageUrl
    ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" width="240" height="200">`
    : '';
  const onlinePrice = activeEdition && product.onlinePrice !== undefined
    ? `<p><strong>Online checkout price: ৳${product.onlinePrice.toFixed(2)}</strong> <span>(extra 5% off current selling price)</span></p>`
    : '';
  const reason = product.reason ? `<p>${escapeHtml(product.reason)}</p>` : '';
  return `<article class="card">${image}<p class="category">${escapeHtml(product.category)}</p><h2><a href="${escapeHtml(href)}">${escapeHtml(product.name)}</a></h2><p><strong>৳${product.price.toFixed(2)}</strong> <del>৳${product.mrp.toFixed(2)}</del> <span>${discount}% below MRP</span></p>${onlinePrice}<p>In stock when checked: ${product.stock}</p>${reason}<p><a class="button" href="${escapeHtml(href)}">View product</a></p></article>`;
}

function renderPage(products: GuideProduct[], activeEdition: boolean, now: Date): string {
  const canonical = `${BASE_URL}/best/dealoftheweek`;
  const title = 'Deal of the Week: Current Grocery Offers | Lucky Store';
  const description = activeEdition
    ? 'Browse this week’s editor-selected, unranked offers from Lucky Store. Check current prices, availability and terms before ordering.'
    : 'Browse current eligible Lucky Store deals, shown without ranking. Check the price and availability before ordering.';
  const articleSchema = {
    '@context': 'https://schema.org', '@type': 'Article', headline: title,
    description, author: { '@type': 'Organization', name: 'Lucky Store Editorial Team' },
    publisher: { '@type': 'Organization', name: 'Lucky Store' }, mainEntityOfPage: canonical,
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Deal of the Week', item: canonical },
    ],
  };
  const period = activeEdition ? '<p class="period">Weekly edition: 19–25 October 2026 (Asia/Dhaka)</p>' : '';
  const disclosure = activeEdition
    ? '<p><strong>Selected by Lucky Store.</strong> Lucky Store sells these products. Picks are unranked and selected against the visible weekly criteria.</p>'
    : '<p>Deals below are current catalogue offers, shown without ranking. Prices and stock can change.</p>';
  const criteria = activeEdition
    ? '<section><h2>How these picks were selected</h2><p>Each pick had a verified offer or at least a 10% comparable discount when reviewed. Editors checked product identity, offer basis, validity dates and terms. Out-of-stock items and offers that no longer match their verified price are removed.</p><p><a href="/best/editorial">Read our editorial policy</a></p></section>'
    : '<section><h2>Price-check guidance</h2><p>Compare the current selling price with the displayed MRP, confirm pack size and availability, and review the product details before ordering. A discount badge does not guarantee the lowest market price.</p></section>';
  const extraOffer = activeEdition
    ? '<p>The listed weekly picks receive an extra 5% off their verified current selling price in online checkout during this edition. The checkout applies it automatically while the offer and catalogue details remain valid.</p>'
    : '';
  const list = products.length
    ? `<div class="grid">${products.map((product) => productCard(product, activeEdition)).join('')}</div>`
    : '<p>There are no eligible in-stock deals to show right now. Browse the deals category for current listings.</p>';
  const updatedLabel = now.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><meta name="robots" content="index,follow"><script type="application/ld+json">${jsonLd(articleSchema)}</script><script type="application/ld+json">${jsonLd(breadcrumbSchema)}</script><style>body{margin:0;color:#211d18;background:#fffdf9;font:16px/1.6 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:28px 18px 64px}h1{font-size:clamp(2rem,5vw,3rem);line-height:1.1}.intro{font-size:1.1rem;max-width:70ch}.period{font-weight:700}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px;margin:24px 0}.card{border:1px solid #e8e0d4;border-radius:16px;padding:16px;background:#fff}.card img{display:block;width:100%;height:180px;object-fit:contain}.card h2{font-size:1.1rem;line-height:1.35}.card p{margin:.5rem 0}.category{font-size:.8rem;color:#645b50}.button{display:inline-block;border-radius:999px;background:#b42318;color:white;padding:10px 18px;font-weight:700;text-decoration:none}a{color:#a2261c}section{max-width:75ch;margin:32px 0}.policy{font-size:.9rem;color:#51483e}</style></head><body><main><nav aria-label="Breadcrumb"><a href="/">Lucky Store</a> / Deal of the Week</nav><h1>Deal of the Week</h1><p class="intro">A weekly shortlist of current grocery offers, linked directly to Lucky Store products.</p>${period}${disclosure}${criteria}${extraOffer}<p class="policy">Checked ${escapeHtml(updatedLabel)} (Asia/Dhaka). Verify price, pack size, availability and offer terms on the product page before checkout.</p><h2>${activeEdition ? 'This week’s unranked picks' : 'Current unranked deals'}</h2>${list}<p><a class="button" href="/category?theme=deals">Browse all deals</a></p></main></body></html>`;
}

export async function GET(): Promise<Response> {
  const now = new Date();
  try {
    const [catalog, allCampaignRows] = await Promise.all([loadCatalog(), loadCurrentStorefrontDealCampaign(supabase, now)]);
    const activeRows = getActiveWeeklyDealEdition(allCampaignRows, now) as CampaignRow[];
    const activeEdition = activeRows.length > 0;
    const byId = new Map(catalog.map((product) => [product.id, product]));
    let eligible: GuideProduct[];

    if (activeEdition) {
      eligible = activeRows.flatMap((row) => {
        const product = byId.get(row.item_id);
        if (!product || product.name !== row.expected_name || product.price !== Number(row.expected_price) || product.mrp !== Number(row.expected_mrp) || product.price > Math.round(product.mrp * 0.9 * 100) / 100) return [];
        const promotion = row as StorefrontItemPromotion;
        return [{ ...product, reason: [row.selection_reason, row.offer_terms].filter(Boolean).join(' '), onlinePrice: getPromotionalPrice({ id: product.id, name: product.name, price: product.price, mrp: product.mrp, stock: product.stock }, [promotion], now) }];
      });
    } else {
      eligible = catalog.filter((product) => Math.floor(((product.mrp - product.price) / product.mrp) * 100) >= 10);
    }

    return new Response(renderPage(eligible, activeEdition, now), {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  } catch {
    return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"></head><body><main><h1>Deals are temporarily unavailable</h1><p>We cannot verify current product information right now. Please try again shortly.</p></main></body></html>', {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '60' },
    });
  }
}
