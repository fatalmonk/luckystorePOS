import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from './updated/Header';
import { Footer } from './updated/Footer';
import { BottomNav } from './BottomNav';
import { CatalogLayout } from './CatalogLayout';
import { Breadcrumbs } from './ui/Breadcrumbs';
import { JsonLd } from './seo/JsonLd';
import { toProductSlug } from '../lib/products/slugify';
import type { Locale } from '../lib/i18n/config';
import { withLocale } from '../lib/i18n/config';
import type { BrandDefinition } from '../lib/brandsData';
import type { Product, Category } from '../lib/types';

const BASE_URL = 'https://www.luckystore1947.com';

interface BrandShellProps {
  brand: BrandDefinition;
  products: Product[];
  categories: { id: string; slug: Category; name: string; emoji: string }[];
  locale?: Locale;
  searchParams?: Record<string, string | string[] | undefined>;
}

export function BrandShell({
  brand,
  products,
  categories,
  locale = 'en',
  searchParams = {},
}: BrandShellProps) {
  const isBn = locale === 'bn';
  const displayName = isBn ? brand.bengaliName : brand.name;
  const displayBadge = isBn ? brand.badgeBn : brand.badgeEn;
  const displaySummary = isBn ? brand.summaryBn : brand.summaryEn;

  const brandSchema = {
    '@context': 'https://schema.org',
    '@type': 'Brand',
    name: brand.name,
    alternateName: brand.bengaliName,
    url: `${BASE_URL}${withLocale(`/brand/${brand.slug}`, locale)}`,
    description: isBn ? brand.descBn : brand.descEn,
    ...(brand.sameAs && brand.sameAs.length > 0 ? { sameAs: [...brand.sameAs] } : {}),
  };

  const hasActiveFilters = Boolean(
    searchParams?.price ||
    searchParams?.availability ||
    searchParams?.category ||
    searchParams?.brand ||
    searchParams?.sort
  );

  const itemListSchema = !hasActiveFilters && products.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: displayName,
        description: isBn ? brand.descBn : brand.descEn,
        numberOfItems: products.length,
        itemListElement: products.slice(0, 30).map((p, index) => {
          const productSlug = toProductSlug((p as any).originalName || p.name, p.id);
          const productUrl = `${BASE_URL}${withLocale(`/product/${productSlug}`, locale)}`;
          return {
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Product',
              name: p.name,
              url: productUrl,
              ...(p.image_url ? { image: p.image_url } : {}),
              offers: {
                '@type': 'Offer',
                price: p.price,
                priceCurrency: 'BDT',
                availability: (p.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              },
            },
          };
        }),
      }
    : null;

  return (
    <>
      <JsonLd data={brandSchema} />
      {itemListSchema && <JsonLd data={itemListSchema} />}
      <Header />

      <main className="flex-1 overflow-x-clip pb-16">
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
          <div className="space-y-4">
            <Breadcrumbs
              homeHref={withLocale('/', locale)}
              homeLabel={isBn ? 'হোম' : 'Home'}
              items={[
                { label: isBn ? 'ব্র্যান্ডসমূহ' : 'Brands', href: withLocale('/brand', locale) },
                { label: displayName, href: withLocale(`/brand/${brand.slug}`, locale) },
              ]}
            />

            {/* Brand Header Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-warm-border bg-gradient-to-br from-warm-surface via-warm-bg to-warm-surface p-6 sm:p-10 shadow-warm-sm">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="max-w-3xl space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-warm-border bg-warm-bg px-3.5 py-1 text-xs font-black uppercase tracking-wider text-warm-fg">
                    <span className="inline-block h-2 w-2 rounded-full bg-warm-accent" aria-hidden="true" />
                    {displayBadge}
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-warm-fg">
                    {displayName}
                  </h1>
                  <p className="text-base sm:text-lg leading-relaxed text-warm-muted">
                    {displaySummary}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-bold text-warm-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="text-warm-accent font-black">✓</span> {isBn ? '১০০% আসল ব্র্যান্ড পণ্য' : '100% Genuine Guarantee'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-warm-accent font-black">✓</span> {isBn ? 'ডোরস্টেপ পরিদর্শন সুবিধা' : 'Doorstep Inspection'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-warm-accent font-black">✓</span> {isBn ? 'চকবাজার ১ কিমি ডেলিভারি' : '1 km Chawkbazar Hub'}
                    </span>
                  </div>
                </div>
                {brand.logoUrl && (
                  <div className="relative h-20 w-36 sm:h-24 sm:w-44 shrink-0 overflow-hidden rounded-2xl border border-warm-border bg-warm-surface p-3 shadow-warm-sm flex items-center justify-center">
                    <Image
                      src={brand.logoUrl}
                      alt={`${displayName} logo`}
                      fill
                      sizes="(max-width: 640px) 144px, 176px"
                      className="object-contain p-2"
                      priority
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Catalog */}
          <CatalogLayout
            products={products}
            categorySlug="all"
            categories={categories}
            theme=""
            sort="best"
            searchParams={searchParams}
            locale={locale}
            headingLevel="h2"
            brandName={displayName}
            brandSlug={brand.slug}
          />
        </div>
        <Footer locale={locale} />
      </main>
      <BottomNav locale={locale} />
    </>
  );
}
