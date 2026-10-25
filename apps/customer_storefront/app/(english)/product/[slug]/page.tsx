import * as React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCachedProductBySlug } from '../../../lib/products/getCachedProduct';
import {
  getCachedCrossSellProducts,
  getCachedRadhuniPackVariants,
  prepareCrossSell,
} from '../../../lib/products/getCachedCrossSell';
import { toProductSlug } from '../../../lib/products/slugify';
import { getEnrichedProductData } from '../../../lib/products/productEnrichment';
import { getProductGalleryImages } from '../../../lib/products/productGalleryRegistry';
import { ProductJsonLd } from '../../../components/seo/ProductJsonLd';
import {
  buildProductMetadata,
  formatProductMetaDescription,
} from '../../../lib/products/productMetadata';
import ProductClient from './ProductClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const canonicalSlug = toProductSlug(product.name, product.id);
  if (slug !== canonicalSlug) {
    permanentRedirect(`/product/${canonicalSlug}`);
  }

  const enrichment = getEnrichedProductData(slug) || getEnrichedProductData(product.id);
  const effectiveName = enrichment?.exactName || product.name;
  const galleryImages = enrichment?.galleryImages?.length
    ? enrichment.galleryImages
    : getProductGalleryImages(product.id);
  const canonicalUrl = `https://www.luckystore1947.com/product/${canonicalSlug}`;
  const description = formatProductMetaDescription(
    effectiveName,
    product.price,
    product.unit,
    enrichment?.summary
  );
  const imageUrl = galleryImages !== undefined
    ? galleryImages[0]?.url || '/lucky-store-social-share.jpg'
    : product.image_url || '/lucky-store-social-share.jpg';

  return buildProductMetadata({
    name: effectiveName,
    price: product.price,
    unit: product.unit,
    description,
    canonicalUrl,
    imageUrl,
    images: galleryImages?.map(({ url, alt }) => ({ url, alt })),
    brand: enrichment?.brand || product.brand,
    category: enrichment?.category || product.category,
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);

  if (!product) notFound();

  // Redirect bare UUIDs and outdated slugs → canonical slug URL via HTTP 308
  const canonicalSlug = toProductSlug(product.name, product.id);
  if (slug !== canonicalSlug) {
    permanentRedirect(`/product/${canonicalSlug}`);
  }

  const crossSell = await getCachedCrossSellProducts(
    product.category,
    product.categoryId || product.category_id,
    product.id
  );
  const crossSellProducts = prepareCrossSell(crossSell);
  const radhuniPackVariants = await getCachedRadhuniPackVariants(product);
  const enrichment = getEnrichedProductData(slug) || getEnrichedProductData(product.id);
  const galleryImages = enrichment?.galleryImages?.length
    ? enrichment.galleryImages
    : getProductGalleryImages(product.id);
  const canonicalUrl = `https://www.luckystore1947.com/product/${canonicalSlug}`;
  const effectiveName = enrichment?.exactName || product.name;
  const description = formatProductMetaDescription(
    effectiveName,
    product.price,
    product.unit,
    enrichment?.summary
  );

  return (
    <>
      <ProductJsonLd
        product={product}
        name={effectiveName}
        brand={enrichment?.brand}
        description={description}
        canonicalUrl={canonicalUrl}
        images={galleryImages?.map((image) => image.url)}
      />
      <ProductClient
        product={product}
        crossSell={crossSellProducts}
        radhuniPackVariants={radhuniPackVariants}
        enrichment={enrichment}
        galleryImages={galleryImages}
      />
    </>
  );
}
