import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCachedProductBySlug } from '../../lib/products/getCachedProduct';
import {
  getCachedCrossSellProducts,
  prepareCrossSell,
} from '../../lib/products/getCachedCrossSell';
import { toProductSlug } from '../../lib/products/slugify';
import { formatBdt } from '../../lib/formatPrice';
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

  const canonicalUrl = `https://luckystore1947.com/product/${canonicalSlug}`;
  const title = `${product.name} – ${formatBdt(product.price)}${product.unit ? `/${product.unit}` : ''}`;
  const description =
    product.description ||
    `Buy ${product.name}${product.unit ? ` (${product.unit})` : ''} online at Lucky Store Chittagong. ${product.category ? `Available in ${product.category}.` : ''} Fast home delivery and cash on delivery.`;
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
          alt: product.name,
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

  return <ProductClient product={product} crossSell={crossSellProducts} />;
}
