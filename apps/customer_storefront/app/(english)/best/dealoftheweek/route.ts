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
  sellable_qty?: number | string | null;
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
  verifiedDiscountPercent?: number;
};

function formatEditionPeriod(rows: CampaignRow[]): string {
  const startsAt = Math.min(...rows.map((row) => Date.parse(row.starts_at)));
  const endsAt = Math.max(...rows.map((row) => Date.parse(row.ends_at)));
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt >= endsAt) return '';
  const format = (date: Date) => date.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Dhaka', day: 'numeric', month: 'long', year: 'numeric',
  });
  return `${format(new Date(startsAt))}–${format(new Date(endsAt - 1))} (Asia/Dhaka)`;
}

function hasWeeklyEvidence(row: CampaignRow): boolean {
  return Boolean(
    row.selection_reason?.trim()
    && row.offer_terms?.trim()
    && row.evidence_source?.trim()
    && row.evidence_checked_at
    && Number.isFinite(Date.parse(row.evidence_checked_at))
    && Date.parse(row.evidence_checked_at) <= Date.parse(row.starts_at),
  );
}

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
  // Fail closed if the catalogue projection does not provide reservation-aware
  // availability. Raw on-hand quantity can include stock already committed.
  const stock = Number(row.sellable_qty ?? 0);
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

function formatPrice(price: number): string {
  return price.toLocaleString('en-BD', { maximumFractionDigits: 2 });
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
  const discountBadge = product.verifiedDiscountPercent !== undefined
    ? `<span class="discount-badge">${product.verifiedDiscountPercent}% below verified MRP</span>`
    : '';
  const image = product.imageUrl
    ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" width="480" height="360">`
    : '<span class="image-placeholder" aria-hidden="true">LUCKY<br><strong>1947</strong></span>';
  const onlinePrice = activeEdition && product.onlinePrice !== undefined
    ? `<p class="online-price"><strong>Online checkout ৳${formatPrice(product.onlinePrice)}</strong><span>Extra 5% off this week</span></p>`
    : '';
  const reason = product.reason ? `<p class="pick-reason">${escapeHtml(product.reason)}</p>` : '';
  return `<article class="card"><a class="product-image" href="${escapeHtml(href)}" tabindex="-1" aria-hidden="true">${image}${discountBadge}</a><div class="card-content"><h3><a href="${escapeHtml(href)}">${escapeHtml(product.name)}</a></h3><div class="price-row"><strong class="price">৳${formatPrice(product.price)}</strong>${discountBadge ? `<del class="mrp">৳${formatPrice(product.mrp)}</del>` : ''}</div><p class="stock"><span class="stock-dot" aria-hidden="true"></span>${product.stock} in stock when checked</p>${onlinePrice}${reason}<a class="product-link" href="${escapeHtml(href)}">View product<span aria-hidden="true">→</span></a></div></article>`;
}

function renderPage(products: GuideProduct[], activeEdition: boolean, editionPeriod: string): string {
  const canonical = `${BASE_URL}/best/dealoftheweek`;
  const title = 'Deal of the Week: Current Store Offers | Lucky Store';
  const description = activeEdition
    ? 'Browse this week’s editor-selected, unranked offers across Lucky Store products. Check current prices, availability and terms before ordering.'
    : 'Browse current eligible offers across Lucky Store products, shown without ranking. Check prices, pack sizes and availability before ordering.';
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
  const heroIntro = activeEdition
    ? 'A considered shortlist of this week’s editor-selected offers, with clear prices and direct links to each product.'
    : 'Browse current offers across Lucky Store products, with clear prices and direct links to check details and availability.';
  const editorialNote = activeEdition
    ? '<p class="editorial-note"><strong>Selected and sold by Lucky Store.</strong> Picks qualify through a verified offer or at least a 10% comparable discount; editors check product identity, comparison price, validity dates and terms. <a href="/best/editorial">Editorial policy</a>.</p>'
    : '';
  const list = products.length
    ? `<div class="grid">${products.map((product) => productCard(product, activeEdition)).join('')}</div>`
    : '<div class="empty-state"><span class="empty-mark" aria-hidden="true">✦</span><h3>No eligible deals right now</h3><p>Check back soon or browse the full deals category for current listings.</p><a class="product-link" href="/category?theme=deals">Browse all deals <span aria-hidden="true">→</span></a></div>';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#FDFBF7">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index,follow">
  <script type="application/ld+json">${jsonLd(articleSchema)}</script>
  <script type="application/ld+json">${jsonLd(breadcrumbSchema)}</script>
  <style>
    :root{color-scheme:light;--paper:#FDFBF7;--surface:#fff;--ink:#0B0B0D;--muted:#62615f;--accent:#f0c444;--accent-dark:#8a6500;--line:#E8E4DC;--success:#27834a}
    *,*::before,*::after{box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
    a{color:inherit}
    a:focus-visible{outline:3px solid var(--accent-dark);outline-offset:3px;border-radius:4px}
    .skip-link{position:absolute;left:16px;top:-60px;z-index:10;background:var(--accent);color:var(--ink);padding:12px 16px;border-radius:8px;font-weight:800}
    .skip-link:focus{top:12px}
    .site-header{background:var(--paper);border-bottom:1px solid var(--line)}
    .header-inner,.content{width:min(1240px,calc(100% - 40px));margin:0 auto}
    .header-inner{height:82px;display:flex;align-items:center;justify-content:space-between;gap:24px}
    .brand{display:inline-flex;align-items:center;min-width:0;text-decoration:none}
    .brand img{display:block;width:220px;height:auto}
    .header-nav{display:flex;align-items:center;gap:26px;font-size:14px;font-weight:650}
    .header-nav a{text-decoration:none}
    .header-nav a:not(.header-cta):hover,.breadcrumb a:hover{color:var(--accent-dark)}
    .header-cta{min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0 18px;background:var(--accent);border:1px solid var(--accent);border-radius:999px;color:var(--ink);font-weight:800;transition:transform .18s ease,background .18s ease}
    .header-cta:hover,.hero-cta:hover{transform:translateY(-2px);background:#f6d56f}
    .content{padding-bottom:72px}
    .breadcrumb{display:flex;align-items:center;gap:9px;margin:18px 0 14px;color:var(--muted);font-size:13px}
    .breadcrumb a{text-decoration:none}
    .breadcrumb-current{color:var(--ink);font-weight:650}
    .hero{position:relative;isolation:isolate;overflow:hidden;display:grid;grid-template-columns:1fr;align-items:center;min-height:0;padding:24px 32px;border-radius:22px;background:linear-gradient(120deg,#0B0B0D 0%,#151518 64%,#282218 100%);color:#fff;box-shadow:0 18px 44px rgba(11,11,13,.12)}
    .hero::before{position:absolute;z-index:-1;content:"";width:390px;height:390px;right:4%;top:-42%;border-radius:50%;background:radial-gradient(circle,rgba(240,196,68,.24),rgba(240,196,68,0) 70%)}
    .hero::after{position:absolute;z-index:-1;content:"";right:0;bottom:0;width:38%;height:5px;background:linear-gradient(90deg,transparent,var(--accent))}
    .hero-copy{max-width:780px}
    .hero-kicker{display:inline-flex;align-items:center;gap:9px;margin:0 0 7px;color:var(--accent);font-size:10px;font-weight:850;letter-spacing:.16em;text-transform:uppercase}
    .hero-kicker::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 18px rgba(240,196,68,.7)}
    h1{max-width:650px;margin:0;font-size:clamp(38px,4.7vw,56px);line-height:1;letter-spacing:-.055em;font-weight:850}
    h1 span{color:var(--accent)}
    .hero-intro{max-width:680px;margin:9px 0 0;color:rgba(255,255,255,.76);font-size:16px;line-height:1.45}
    .hero-actions{display:flex;align-items:center;flex-wrap:wrap;gap:16px;margin-top:12px}
    .hero-cta{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:12px;padding:0 18px;border-radius:999px;background:var(--accent);color:var(--ink);font-size:13px;font-weight:850;text-decoration:none;transition:transform .18s ease,background .18s ease}
    .hero-cta span,.product-link span{font-size:20px;line-height:1}
    .hero-footnote{color:rgba(255,255,255,.58);font-size:12px}
    .section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:0 0 16px}
    .section-eyebrow{margin:0 0 7px;color:var(--accent-dark);font-size:11px;font-weight:850;letter-spacing:.15em;text-transform:uppercase}
    .section-heading h2{margin:0;font-size:clamp(25px,3vw,34px);line-height:1.15;letter-spacing:-.04em}
    .section-heading p{margin:7px 0 0;color:var(--muted);font-size:14px}
    .editorial-note{margin:0 0 20px;color:var(--muted);font-size:12px;line-height:1.55}
    .editorial-note strong{color:var(--ink)}
    .editorial-note a{color:var(--accent-dark);font-weight:750;text-underline-offset:2px}
    .deal-count{flex:0 0 auto;padding:8px 13px;border:1px solid var(--line);border-radius:999px;background:#fff;font-size:12px;font-weight:750}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
    .card{min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:0 3px 12px rgba(11,11,13,.035);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
    .card:hover{transform:translateY(-4px);border-color:#d6c99e;box-shadow:0 14px 30px rgba(11,11,13,.1)}
    .product-image{position:relative;display:grid;place-items:center;overflow:hidden;aspect-ratio:4/3;background:#f6f3ec;text-decoration:none}
    .product-image img{display:block;width:100%;height:100%;padding:18px;object-fit:contain;mix-blend-mode:multiply;transition:transform .25s ease}
    .card:hover .product-image img{transform:scale(1.045)}
    .discount-badge{position:absolute;top:12px;left:12px;padding:7px 10px;border-radius:999px;background:var(--accent);color:var(--ink);font-size:11px;font-weight:900;letter-spacing:.015em}
    .image-placeholder{color:#8a8275;font-size:16px;font-weight:850;line-height:.96;letter-spacing:.08em;text-align:center;opacity:.55}
    .image-placeholder strong{display:inline-block;margin-top:5px;color:var(--accent-dark);font-size:12px}
    .card-content{display:flex;flex-direction:column;min-height:228px;padding:16px}
    .card h3{display:-webkit-box;overflow:hidden;min-height:42px;margin:0 0 14px;font-size:14px;font-weight:720;line-height:1.5;letter-spacing:-.015em;-webkit-box-orient:vertical;-webkit-line-clamp:2}
    .card h3 a{text-decoration:none}
    .card h3 a:hover{color:var(--accent-dark)}
    .price-row{display:flex;align-items:baseline;gap:8px}
    .price{font-size:21px;font-weight:850;letter-spacing:-.04em}
    .mrp{color:#89857c;font-size:12px}
    .stock{display:flex;align-items:center;gap:7px;margin:7px 0 12px;color:#5e655b;font-size:11px}
    .stock-dot{width:7px;height:7px;border-radius:50%;background:var(--success)}
    .online-price{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 11px;padding:9px 10px;border-radius:10px;background:#fff7d8;color:#4f3b00;font-size:11px}
    .online-price strong{font-size:12px}
    .online-price span{color:#786423}
    .pick-reason{margin:0 0 12px;color:var(--muted);font-size:12px;line-height:1.5}
    .product-link{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:42px;margin-top:auto;padding:0 13px;border:1px solid var(--ink);border-radius:10px;background:var(--ink);color:#fff;font-size:12px;font-weight:800;text-decoration:none;transition:background .16s ease,color .16s ease,border-color .16s ease}
    .product-link:hover{border-color:var(--accent);background:var(--accent);color:var(--ink)}
    .empty-state{padding:52px 24px;border:1px dashed #cbc5b8;border-radius:20px;background:rgba(255,255,255,.6);text-align:center}
    .empty-mark{display:grid;place-items:center;width:48px;height:48px;margin:0 auto 14px;border-radius:15px;background:#fff5cf;color:#735400;font-size:22px}
    .empty-state h3{margin:0;font-size:20px}
    .empty-state p{margin:7px 0 20px;color:var(--muted);font-size:14px}
    .empty-state .product-link{display:inline-flex;min-width:190px;margin:0}
    .bottom-cta{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:48px;padding:28px 32px;border-radius:20px;background:#111114;color:#fff}
    .bottom-cta h2{margin:0;font-size:21px;letter-spacing:-.03em}
    .bottom-cta p{margin:5px 0 0;color:rgba(255,255,255,.65);font-size:13px}
    .bottom-cta .hero-cta{flex:0 0 auto;min-height:46px}
    .site-footer{border-top:1px solid var(--line);background:#f8f5ef}
    .footer-inner{display:flex;align-items:center;justify-content:space-between;gap:20px;width:min(1240px,calc(100% - 40px));margin:0 auto;padding:22px 0;color:var(--muted);font-size:11px}
    .footer-inner img{width:146px;height:auto}
    @media(max-width:1000px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:700px){.header-inner,.content,.footer-inner{width:min(100% - 28px,560px)}.header-inner{height:70px}.brand img{width:178px}.header-nav{gap:12px}.header-nav>a:first-child{display:none}.header-cta{min-height:42px;padding:0 14px;font-size:12px}.breadcrumb{margin:18px 0 14px}.hero{padding:20px 22px;border-radius:18px}.hero::before{right:-10%;top:-36%;width:220px;height:220px}.hero-kicker{margin-bottom:6px;font-size:9px}.hero-intro{margin-top:7px;font-size:14px}.hero-actions{margin-top:10px}.section-heading{align-items:flex-start}.deal-count{padding:7px 10px;font-size:10px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card-content{min-height:220px;padding:13px}.card h3{font-size:13px}.price{font-size:19px}.bottom-cta{align-items:flex-start;flex-direction:column;margin-top:36px;padding:24px}.footer-inner img{width:120px}}
    @media(max-width:390px){.header-inner,.content,.footer-inner{width:calc(100% - 24px)}.brand img{width:150px}.header-nav{gap:8px}.header-cta{min-height:40px;padding:0 11px}.hero{padding:18px}.hero-actions{align-items:flex-start;flex-direction:column;gap:9px}.grid{grid-template-columns:1fr}.product-image{aspect-ratio:1.45/1}.card-content{min-height:0}.card h3{min-height:0}.bottom-cta .hero-cta{width:100%}.footer-inner{align-items:flex-start;flex-direction:column}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{transition:none!important;animation:none!important}}
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to deals</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="Lucky Store home"><img src="/logo-main.png" alt="Lucky Store, since 1947" width="640" height="146"></a>
      <nav class="header-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/category?theme=deals">Weekly deals</a><a class="header-cta" href="/category?theme=deals">Shop online <span aria-hidden="true">→</span></a></nav>
    </div>
  </header>
  <main id="main-content" class="content">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span class="breadcrumb-current">Deal of the Week</span></nav>
    <section class="hero" aria-labelledby="page-title">
      <div class="hero-copy">
        <p class="hero-kicker">Lucky Store · ${activeEdition ? 'Weekly value' : 'Current offers'}</p>
        <h1 id="page-title">Deal of the <span>Week</span></h1>
        <p class="hero-intro">${heroIntro}</p>
        <div class="hero-actions"><a class="hero-cta" href="#weekly-deals">${activeEdition ? 'Explore this week’s picks' : 'Browse current offers'} <span aria-hidden="true">↓</span></a>${activeEdition ? '<span class="hero-footnote">Selected and sold by Lucky Store · Unranked picks</span>' : '<span class="hero-footnote">Live catalogue · Unranked deals</span>'}</div>
      </div>
    </section>
    <section id="weekly-deals" aria-labelledby="deals-heading">
      <div class="section-heading"><div><p class="section-eyebrow">${activeEdition ? 'Selected by Lucky Store' : 'Current store offers'}</p><h2 id="deals-heading">${activeEdition ? 'This week’s unranked picks' : 'Current unranked store deals'}</h2><p>${activeEdition ? `Weekly edition · ${escapeHtml(editionPeriod)}` : 'Live catalogue offers across Lucky Store products.'}</p></div><span class="deal-count">${products.length} ${products.length === 1 ? 'deal' : 'deals'}</span></div>
      ${editorialNote}
      ${list}
    </section>
    <section class="bottom-cta" aria-label="Browse all deals"><div><h2>Looking for something else?</h2><p>Browse all current offers in the Lucky Store deals category.</p></div><a class="hero-cta" href="/category?theme=deals">Browse all deals <span aria-hidden="true">→</span></a></section>
  </main>
  <footer class="site-footer"><div class="footer-inner"><img src="/logo-main.png" alt="Lucky Store" width="640" height="146" loading="lazy"><span>Since 1947 · Prices and availability are checked against the live catalogue.</span></div></footer>
</body>
</html>`;
}

export async function GET(): Promise<Response> {
  const now = new Date();
  try {
    const catalog = await loadCatalog();
    let allCampaignRows: CampaignRow[] = [];
    try {
      allCampaignRows = await loadCurrentStorefrontDealCampaign(supabase, now) as CampaignRow[];
    } catch {
      // A missing or temporarily unavailable weekly edition must not hide the
      // independently verified, unranked catalogue fallback.
      console.warn('Weekly deal edition could not be verified; showing current unranked deals.');
    }
    const activeRows = getActiveWeeklyDealEdition(allCampaignRows, now) as CampaignRow[];
    const activeEdition = activeRows.length >= 12 && activeRows.every(hasWeeklyEvidence);
    const verifiedRows = activeEdition ? activeRows : [];
    const byId = new Map(catalog.map((product) => [product.id, product]));
    let eligible: GuideProduct[];

    if (activeEdition) {
      eligible = verifiedRows.flatMap((row) => {
        const product = byId.get(row.item_id);
        if (!product || product.name !== row.expected_name || product.price !== Number(row.expected_price) || product.mrp !== Number(row.expected_mrp) || product.price > Math.round(product.mrp * 0.9 * 100) / 100) return [];
        const promotion = row as StorefrontItemPromotion;
        return [{ ...product, verifiedDiscountPercent: Math.floor(((product.mrp - product.price) / product.mrp) * 100), reason: [row.selection_reason, row.offer_terms].filter(Boolean).join(' '), onlinePrice: getPromotionalPrice({ id: product.id, name: product.name, price: product.price, mrp: product.mrp, stock: product.stock }, [promotion], now) }];
      });
    } else {
      eligible = catalog
        .filter((product) => product.price <= Math.round(product.mrp * 0.9 * 100) / 100)
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    }

    return new Response(renderPage(eligible, activeEdition, activeEdition ? formatEditionPeriod(verifiedRows) : ''), {
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
