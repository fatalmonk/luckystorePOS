'use client';

import Link from 'next/link';
import { toProductSlug } from '../../lib/products/slugify';
import { withLocale, type Locale } from '../../lib/i18n/config';
import { useEffect } from 'react';
import { Header } from '../../components/updated/Header';
import { BottomNav } from '../../components/BottomNav';
import { useToast } from '../../components/Toast';
import { useCartContext } from '../../components/CartProvider';
import { QtyNumber } from '../../components/ui/QtyNumber';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { ProductJsonLd } from '../../components/seo/ProductJsonLd';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { formatBdt } from '../../lib/formatPrice';
import type { Product, ProductEnrichment } from '../../lib/products';
import { TrustStrip } from '../../components/product/TrustStrip';
import { ProductCarousel } from '../../components/product/ProductCarousel';
import { ProductImage } from '../../components/product/ProductImage';
import { trackViewItem } from '../../lib/analytics';
import { DELIVERY_POLICY } from '../../delivery/deliveryData';

interface ProductClientProps {
  product: Product;
  crossSell: Product[];
  locale?: Locale;
  productUrlName?: string;
  productCanonicalUrl?: string;
  enrichment?: ProductEnrichment;
}

export function getCategoryBreadcrumbHref(category: string, locale: Locale): string {
  return withLocale(`/category/${encodeURIComponent(category)}`, locale);
}

function ProductContent({ product, crossSell, locale = 'en', productUrlName, productCanonicalUrl, enrichment }: ProductClientProps) {
  const { showToast } = useToast();
  const { cart, addToCart, updateQty } = useCartContext();
  const { addViewed } = useRecentlyViewed();

  // Record product view post-mount
  useEffect(() => {
    if (product?.id) {
      addViewed(product.id);
      trackViewItem(product);
    }
  }, [product, addViewed]);

  const qtyInCart = cart.find((c) => c.id === product.id)?.qty || 0;

  const stockStatus =
    product.stock <= 0
      ? { text: 'Out of Stock', color: 'text-warm-danger', bg: 'bg-warm-danger-bg', aria: 'Out of stock' }
      : product.stock <= 5
      ? { text: `Only ${product.stock} left`, color: 'text-warm-warning', bg: 'bg-warm-warning-bg', aria: `Low stock, only ${product.stock} left` }
      : { text: 'In Stock', color: 'text-warm-success', bg: 'bg-warm-success-bg', aria: 'In stock' };

  const handleAdd = () => {
    if (product.stock <= 0) {
      showToast('Sorry, this item is out of stock');
      return;
    }
    addToCart(product);
    showToast(`Added ${product.name} to cart`);
  };

  const handleUpdateQty = (delta: number) => {
    if (qtyInCart + delta <= 0) {
      updateQty(product.id, -1);
    } else {
      updateQty(product.id, delta);
    }
  };

  const productUrl = withLocale(`/product/${toProductSlug(productUrlName ?? product.name, product.id)}`, locale);
  const displayName = enrichment?.exactName || product.name;
  const overviewText = enrichment?.summary || product.description || `Order ${displayName} for local doorstep delivery in Chattogram.`;

  // Specifications: derive catalog SKU dynamically, then append editorial or fallback specs
  const specifications = [
    ...(product.sku ? [{ label: 'Store SKU', value: product.sku }] : []),
    ...(enrichment?.specifications || [
      ...(product.brand ? [{ label: 'Brand', value: product.brand }] : []),
      ...(product.category ? [{ label: 'Category', value: product.category }] : []),
      ...(product.unit ? [{ label: 'Net Quantity', value: product.unit }] : []),
      { label: 'Fulfillment', value: 'Direct from Lucky Store Chawkbazar' },
      { label: 'Inspection Guarantee', value: '100% doorstep inspection prior to payment' },
    ]),
  ];

  return (
    <>
      <ProductJsonLd
        product={product}
        name={displayName}
        brand={enrichment?.brand}
        description={overviewText}
        canonicalUrl={productCanonicalUrl}
      />
      <Header />

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto mt-2 min-h-full max-w-[var(--container-storefront)] rounded-t-warm-panel bg-warm-bg px-[var(--space-page-x)] md:mt-6">
          {/* Breadcrumb Navigation */}
          <div className="pt-2 md:pt-0">
      <Breadcrumbs
        homeHref={withLocale('/', locale)}
        homeLabel={locale === 'bn' ? 'হোম' : 'Home'}
        items={[
                { label: product.category, href: getCategoryBreadcrumbHref(product.category, locale) },
                { label: displayName, href: productUrl },
              ]}
            />
          </div>

          {/* Hero / Buying Panel */}
          <div className="grid gap-6 py-5 md:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] md:items-start md:gap-8 lg:gap-10">
            <div className="mx-auto w-full max-w-[420px] md:sticky md:top-24 md:max-w-none">
              <div className="relative aspect-square overflow-hidden rounded-warm-sheet border border-warm-image-well-border bg-warm-image-well">
                <ProductImage
                  src={product.image_url}
                  alt={displayName}
                  category={product.category}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  imageClassName="w-full h-full object-contain p-6 sm:p-8 lg:p-10"
                  priority
                  iconSize={64}
                />
              </div>
            </div>

            <div className="rounded-warm-panel border border-warm-border bg-warm-bg p-4 shadow-warm-panel sm:p-6 lg:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-warm-fg mb-1">
                    {displayName}
                  </h1>
                  <p className="text-sm text-warm-muted">
                    {enrichment?.netQuantity || product.unit}
                    {product.brand ? ` · ${product.brand}` : ''}
                  </p>
                </div>
                <div aria-live="polite" aria-atomic="true" className="shrink-0">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-warm-control text-xs font-bold ${stockStatus.bg} ${stockStatus.color}`}
                    aria-label={stockStatus.aria}
                  >
                    {stockStatus.text}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-mono text-4xl font-extrabold text-warm-fg">
                  {formatBdt(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-base text-warm-muted line-through font-mono">
                    {formatBdt(product.originalPrice)}
                  </span>
                )}
              </div>

              {/* Action Area — Desktop & Inline */}
              <div className="mt-6">
                <TrustStrip className="mb-4" />
                {qtyInCart > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleUpdateQty(-1)}
                      className="w-12 h-12 rounded-warm-control border-2 border-warm-accent bg-warm-image-well text-warm-fg flex items-center justify-center text-base font-bold hover:bg-warm-accent active:scale-95 transition-all press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <QtyNumber
                      qty={qtyInCart}
                      className="font-bold text-sm min-w-[28px] text-center"
                      aria-label={`Quantity ${qtyInCart} in cart`}
                    />
                    <button
                      onClick={() => handleUpdateQty(1)}
                      disabled={qtyInCart >= product.stock}
                      className="w-12 h-12 rounded-warm-control border-2 border-warm-accent bg-warm-image-well text-warm-fg flex items-center justify-center text-base font-bold hover:bg-warm-accent active:scale-95 transition-all press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:opacity-50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                    <span className="ml-2 text-sm font-semibold text-warm-muted">
                      {formatBdt(product.price * qtyInCart)} total
                    </span>
                  </div>
                ) : product.stock <= 0 ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      disabled
                      className="h-12 flex-1 cursor-not-allowed rounded-warm-control border border-warm-border bg-warm-bg px-5 text-sm font-bold text-warm-muted"
                      aria-label={`${displayName} is out of stock`}
                    >
                      Out of stock
                    </button>
                    {product.category && (
                      <Link
                        href={`/category/${encodeURIComponent(product.category)}`}
                        className="h-12 px-5 rounded-warm-control bg-warm-image-well text-warm-fg text-sm font-bold hover:bg-warm-border-light active:scale-[0.98] transition-all flex items-center justify-center"
                      >
                        See Similar Items
                      </Link>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleAdd}
                    className="h-12 px-8 rounded-warm-control bg-warm-accent text-warm-accent-text text-sm font-bold hover:bg-warm-accent-hover active:scale-[0.98] transition-all press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                  >
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Answer-First Overview */}
          <section className="border-t border-warm-border px-4 py-6 sm:px-6 lg:px-8">
            <h2 className="text-base font-bold mb-3 text-warm-fg">Product Overview</h2>
            <p className="text-sm text-warm-muted leading-relaxed max-w-3xl">
              {overviewText}
            </p>
          </section>

          {product.nutrition && (
            <section className="border-t border-warm-border px-4 py-6 sm:px-6 lg:px-8">
              <h2 className="text-base font-bold mb-3 text-warm-fg">Nutrition per 100ml</h2>
              <p className="text-sm text-warm-muted leading-relaxed max-w-3xl">
                {product.nutrition}
              </p>
            </section>
          )}

          {/* Section 2: Verified Specifications Table */}
          <section className="border-t border-warm-border px-4 py-6 sm:px-6 lg:px-8">
            <h2 className="text-base font-bold mb-4 text-warm-fg">Product Specifications</h2>
            <div className="overflow-hidden rounded-warm-panel border border-warm-border max-w-3xl">
              <table className="w-full text-left text-sm">
                <tbody>
                  {specifications.map((spec, idx) => (
                    <tr
                      key={spec.label}
                      className={idx % 2 === 0 ? 'bg-warm-bg' : 'bg-warm-image-well/40'}
                    >
                      <th
                        scope="row"
                        className="py-3 px-4 font-semibold text-warm-fg w-1/3 border-b border-warm-border/60 text-xs sm:text-sm"
                      >
                        {spec.label}
                      </th>
                      <td className="py-3 px-4 text-warm-muted border-b border-warm-border/60 text-xs sm:text-sm">
                        {spec.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Highlights & Guidance (if available) */}
          {enrichment?.highlights && enrichment.highlights.length > 0 && (
            <section className="border-t border-warm-border px-4 py-6 sm:px-6 lg:px-8">
              <h2 className="text-base font-bold mb-3 text-warm-fg">Key Features</h2>
              <ul className="space-y-2 max-w-3xl text-sm text-warm-muted">
                {enrichment.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2.5">
                    <span className="text-warm-accent font-bold mt-0.5" aria-hidden="true">✓</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(enrichment?.usageDirections || enrichment?.storageInstructions) && (
            <section className="border-t border-warm-border px-4 py-6 sm:px-6 lg:px-8">
              <div className="grid gap-6 sm:grid-cols-2 max-w-3xl">
                {enrichment.usageDirections && (
                  <div>
                    <h3 className="text-sm font-bold text-warm-fg mb-1.5">Usage & Preparation</h3>
                    <p className="text-xs sm:text-sm text-warm-muted leading-relaxed">
                      {enrichment.usageDirections}
                    </p>
                  </div>
                )}
                {enrichment.storageInstructions && (
                  <div>
                    <h3 className="text-sm font-bold text-warm-fg mb-1.5">Storage Instructions</h3>
                    <p className="text-xs sm:text-sm text-warm-muted leading-relaxed">
                      {enrichment.storageInstructions}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 4: Verified Delivery & Doorstep Inspection Callout */}
          <section className="border-t border-warm-border px-4 py-6 sm:px-6 lg:px-8">
            <div className="rounded-warm-panel border border-warm-accent/30 bg-warm-image-well/40 p-5 max-w-3xl">
              <div className="flex items-start gap-3.5">
                <div className="rounded-warm-control p-2 bg-warm-accent/10 text-warm-accent shrink-0 mt-0.5">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-warm-fg mb-1">
                    Direct Chattogram Store Fulfillment
                  </h3>
                  <p className="text-xs sm:text-sm text-warm-muted leading-relaxed mb-3">
                    Dispatched from our Chawkbazar store strictly within our verified {DELIVERY_POLICY.radiusLabel}. Orders ৳500+ receive <strong>FREE delivery</strong> (৳40 flat below ৳500). Delivery hours: {DELIVERY_POLICY.deliveryHours.display}.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-warm-fg">
                    <span className="flex items-center gap-1.5">
                      <span className="text-warm-accent">✓</span> 100% Doorstep Inspection
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-warm-accent">✓</span> Cash on Delivery & bKash
                    </span>
                    <Link
                      href="/delivery"
                      className="text-warm-accent hover:underline inline-flex items-center gap-1"
                    >
                      View Delivery Boundaries & FAQs →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Factual Product Q&A */}
          {enrichment?.faqs && enrichment.faqs.length > 0 && (
            <section className="border-t border-warm-border px-4 py-6 sm:px-6 lg:px-8">
              <h2 className="text-base font-bold mb-4 text-warm-fg">Frequently Asked Questions</h2>
              <div className="space-y-3 max-w-3xl">
                {enrichment.faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="group rounded-warm-panel border border-warm-border bg-warm-bg p-4 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer items-center justify-between font-semibold text-sm text-warm-fg focus:outline-none">
                      <span>{faq.question}</span>
                      <span className="transition group-open:rotate-180 text-warm-muted">▼</span>
                    </summary>
                    <p className="mt-2.5 text-xs sm:text-sm text-warm-muted leading-relaxed">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Section 6: Cross-Sell Carousel */}
          <ProductCarousel title="More to explore" products={crossSell} />
        </div>
      </main>

      {/* Sticky Mobile Add-to-Cart Bar */}
      <div className="fixed bottom-[var(--bottom-nav-height)] left-0 right-0 z-40 bg-warm-bg/95 backdrop-blur-md border-t border-warm-border p-3 px-4 flex items-center justify-between shadow-warm-lg md:hidden">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-warm-fg line-clamp-1">{displayName}</span>
          <span className="text-sm font-black text-warm-fg">{formatBdt(product.price)}</span>
        </div>
        <div>
          {qtyInCart > 0 ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleUpdateQty(-1)}
                className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-warm-control border-2 border-warm-accent bg-warm-image-well text-warm-fg flex items-center justify-center font-bold text-base active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <QtyNumber
                qty={qtyInCart}
                className="font-bold text-sm min-w-[24px] text-center"
                aria-label={`Quantity ${qtyInCart} in cart`}
              />
              <button
                onClick={() => handleUpdateQty(1)}
                disabled={qtyInCart >= product.stock}
                className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-warm-control border-2 border-warm-accent bg-warm-image-well text-warm-fg flex items-center justify-center font-bold text-base active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:opacity-50"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={product.stock <= 0}
              className="px-5 py-2.5 h-11 min-h-[44px] rounded-warm-control bg-warm-accent text-warm-accent-text font-extrabold text-xs shadow-warm-card-hover hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:opacity-50"
            >
              {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </>
  );
}

export default function ProductClient({ product, crossSell, locale, productUrlName, productCanonicalUrl, enrichment }: ProductClientProps) {
  return (
    <ProductContent
      product={product}
      crossSell={crossSell}
      locale={locale}
      productUrlName={productUrlName}
      productCanonicalUrl={productCanonicalUrl}
      enrichment={enrichment}
    />
  );
}
