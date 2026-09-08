import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCachedProductBySlug } from '../../lib/products/getCachedProduct';
import {
  getCachedCrossSellProducts,
  prepareCrossSell,
} from '../../lib/products/getCachedCrossSell';
import { toProductSlug } from '../../lib/products/slugify';
import { getEnrichedProductData } from '../../lib/products/productEnrichment';
import {
  formatProductMetaTitle,
  formatProductMetaDescription,
} from '../../lib/products/productMetadata';
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
  const canonicalUrl = `https://luckystore1947.com/product/${canonicalSlug}`;
  const title = formatProductMetaTitle(effectiveName, product.price, product.unit);
  const description = formatProductMetaDescription(
    effectiveName,
    product.price,
    product.unit,
    enrichment?.summary
  );
  const imageUrl = product.image_url || '/lucky-store-social-share.jpg';

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: 'en_BD',
      url: canonicalUrl,
      siteName: 'Lucky Store',
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: effectiveName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
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
  const enrichment = getEnrichedProductData(slug) || getEnrichedProductData(product.id);

  return <ProductClient product={product} crossSell={crossSellProducts} enrichment={enrichment} />;
}
