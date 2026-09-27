import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { SEOHead } from '@/components/SEOHead';
import { getCachedProductBySlug } from '@/lib/products/getCachedProduct';
import { toProductSlug } from '@/lib/products/slugify';
import { getEnrichedProductData } from '@/lib/products/productEnrichment';
import { formatProductMetaTitle, formatProductMetaDescription } from '@/lib/products/productMetadata';
import ProductClient from './ProductClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);
  if (!product) notFound();

  const canonicalSlug = toProductSlug(product.name, product.id);
  if (slug !== canonicalSlug) {
    // Will be handled by redirect in page component
    return {};
  }

  const enrichment = getEnrichedProductData(slug) || getEnrichedProductData(product.id);
  const name = enrichment?.exactName || product.name;
  const price = product.price || 0;
  const unit = product.unit || '';
  const available = product.stock > 0;
  const image = product.image_url || '/lucky-store-social-share.jpg';

  // Product JSON-LD
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    image,
    description: enrichment?.summary || name,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: price.toFixed(2),
      availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://www.luckystore1947.com/product/${canonicalSlug}`,
    },
    aggregateRating: enrichment?.rating ? {
      '@type': 'AggregateRating',
      ratingValue: enrichment.rating.toFixed(1),
      bestRating: '5',
      ratingCount: enrichment.ratingCount || 0,
    } : undefined,
  };

  // BreadcrumbList JSON-LD
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.luckystore1947.com' },
      { '@type': 'ListItem', position: 2, name: 'Products', item: 'https://www.luckystore1947.com/category' },
      { '@type': 'ListItem', position: 3, name: name, item: `https://www.luckystore1947.com/product/${canonicalSlug}` },
    ],
  };

  const title = formatProductMetaTitle(name, price, unit);
  const description = formatProductMetaDescription(name, price, unit, enrichment?.summary);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `https://www.luckystore1947.com/product/${canonicalSlug}`,
      languages: {
        'en-BD': `https://www.luckystore1947.com/product/${canonicalSlug}`,
        'bn-BD': `https://www.luckystore1947.com/bn/product/${canonicalSlug}`,
        'x-default': `https://www.luckystore1947.com/product/${canonicalSlug}`,
      },
    },
    openGraph: { title, description, url: `https://www.luckystore1947.com/product/${canonicalSlug}`, images: [{ url: image, alt: name }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    other: {
      'json-ld': JSON.stringify({ '@graph': [productJsonLd, breadcrumbJsonLd] }),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);
  if (!product) notFound();

  const canonicalSlug = toProductSlug(product.name, product.id);
  if (slug !== canonicalSlug) {
    // Redirect to canonical URL
    const searchParams = new URLSearchParams();
    // Preserve any query params if present
    const url = new URL(window.location.href);
    const query = url.search.substring(1);
    const destination = `/product/${canonicalSlug}${query ? `?${query}` : ''}`;
    return Response.redirect(destination, 301);
  }

  const crossSell = await import('./getCrossSell').then(m => m.getCachedCrossSellProducts?.(product.id));
  const enrichment = getEnrichedProductData(slug) || getEnrichedProductData(product.id);

  return (
    <>
      <SEOHead
        title={formatProductMetaTitle(product.name, product.price, product.unit)}
        description={formatProductMetaDescription(product.name, product.price, product.unit, enrichment?.summary)}
        canonical={`https://www.luckystore1947.com/product/${canonicalSlug}`}
        hrefLang={{ en: `https://www.luckystore1947.com/product/${canonicalSlug}`, bn: `https://www.luckystore1947.com/bn/product/${canonicalSlug}` }}
        image={product.image_url || '/lucky-store-social-share.jpg'}
      />
      <ProductClient product={product} crossSell={crossSell} enrichment={enrichment} />
    </>
  );
}