import { cache } from 'react';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Header } from '../../../../components/updated/Header';
import { BottomNav } from '../../../../components/BottomNav';
import { ProductJsonLd } from '../../../../components/seo/ProductJsonLd';
import { getCachedProductBySlug } from '../../../../lib/products/getCachedProduct';
import { getPublishedItemTranslations, type PublishedItemTranslation } from '../../../../lib/products/productTranslations';
import { toProductSlug } from '../../../../lib/products/slugify';
import { formatBdt } from '../../../../lib/formatPrice';
import { buildProductAlternateLanguages } from '../../../../lib/seo/productAlternates';
import { getEnrichedProductData } from '../../../../lib/products/productEnrichment';
import { getProductGalleryImages } from '../../../../lib/products/productGalleryRegistry';
import type { ProductEnrichment } from '../../../../lib/products/productEnrichmentTypes';
import type { Product } from '../../../../lib/products/types';
import ProductClient from '../../../../(english)/product/[slug]/ProductClient';

export const revalidate = 120;

type BengaliProductRecord = {
  product: Product;
  sourceName: string;
  translation: PublishedItemTranslation | null;
};

const getCachedBengaliProduct = cache(async (slug: string): Promise<BengaliProductRecord | null> => {
  const product = await getCachedProductBySlug(slug);
  if (!product) return null;

  const sourceName = product.originalName || product.name;
  const translation = (await getPublishedItemTranslations([product.id])).get(product.id) ?? null;

  return { product, sourceName, translation };
});

function getLocalizedGalleryImages(
  sourceProduct: Product,
  slug: string,
  translatedName: string,
): ProductEnrichment['galleryImages'] {
  const enrichment = getEnrichedProductData(slug) || getEnrichedProductData(sourceProduct.id);
  const galleryImages = enrichment?.galleryImages?.length
    ? enrichment.galleryImages
    : getProductGalleryImages(sourceProduct.id);

  return galleryImages?.map((image) => ({ url: image.url, alt: translatedName }));
}

function buildBengaliTitle(name: string, price: number, unit?: string): string {
  const unitSuffix = unit && unit !== 'pc' ? `/${unit}` : '';
  return `${name} – ${formatBdt(price)}${unitSuffix} | লাকি স্টোর`;
}

function getPublishedDescription(translation: PublishedItemTranslation): string {
  return translation.details?.summary
    || translation.description
    || `${translation.name} সম্পর্কে যাচাইকৃত বাংলা পণ্যের তথ্য।`;
}

function underReviewMetadata(canonicalUrl: string): Metadata {
  const title = 'পণ্যের বাংলা তথ্য পর্যালোচনাধীন | লাকি স্টোর';
  const description = 'এই পণ্যের বাংলা তথ্য যাচাই ও পর্যালোচনা করা হচ্ছে।';

  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      siteName: 'লাকি স্টোর',
      locale: 'bn_BD',
      url: canonicalUrl,
      title,
      description,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const record = await getCachedBengaliProduct(slug);
  if (!record) notFound();

  const canonicalSlug = toProductSlug(record.sourceName, record.product.id);
  if (slug !== canonicalSlug) permanentRedirect(`/bn/product/${canonicalSlug}`);

  const canonicalUrl = `https://www.luckystore1947.com/bn/product/${canonicalSlug}`;
  if (!record.translation) return underReviewMetadata(canonicalUrl);

  const canonicalEnUrl = `https://www.luckystore1947.com/product/${canonicalSlug}`;
  const galleryImages = getLocalizedGalleryImages(record.product, slug, record.translation.name);
  const imageUrl = galleryImages !== undefined
    ? galleryImages[0]?.url || '/lucky-store-social-share-v2.png'
    : record.product.image_url || '/lucky-store-social-share-v2.png';
  const title = buildBengaliTitle(record.translation.name, record.product.price, record.product.unit);
  const description = getPublishedDescription(record.translation);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildProductAlternateLanguages({
        canonicalEnUrl,
        canonicalBnUrl: canonicalUrl,
        isBengaliIndexable: true,
      }),
    },
    openGraph: {
      type: 'website',
      siteName: 'লাকি স্টোর',
      locale: 'bn_BD',
      url: canonicalUrl,
      title,
      description,
      images: [{ url: imageUrl, alt: record.translation.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

function BengaliProductUnderReview() {
  return (
    <>
      <Header locale="bn" />
      <main id="main-content" className="mx-auto flex min-h-[55vh] max-w-2xl flex-col justify-center px-4 py-12 text-center">
        <p className="text-sm font-bold text-warm-accent">বাংলা ক্যাটালগ</p>
        <h1 className="mt-3 text-2xl font-extrabold text-warm-fg sm:text-3xl">
          পণ্যের বাংলা তথ্য পর্যালোচনাধীন
        </h1>
        <p className="mt-4 text-sm leading-7 text-warm-muted sm:text-base">
          যাচাই শেষ হলে এই পণ্যের বাংলা নাম, বিবরণ ও অন্যান্য তথ্য এখানে প্রকাশ করা হবে।
        </p>
        <Link
          href="/bn/category"
          className="mx-auto mt-7 inline-flex min-h-11 items-center rounded-warm-control bg-warm-accent px-5 py-3 text-sm font-bold text-warm-accent-text"
        >
          প্রকাশিত বাংলা পণ্য দেখুন
        </Link>
      </main>
      <BottomNav locale="bn" />
    </>
  );
}

export default async function BengaliProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await getCachedBengaliProduct(slug);
  if (!record) notFound();

  const canonicalSlug = toProductSlug(record.sourceName, record.product.id);
  if (slug !== canonicalSlug) permanentRedirect(`/bn/product/${canonicalSlug}`);
  if (!record.translation) return <BengaliProductUnderReview />;

  const galleryImages = getLocalizedGalleryImages(record.product, slug, record.translation.name);
  const productImages = galleryImages !== undefined
    ? galleryImages.map(({ url }) => url)
    : record.product.image_url
      ? [record.product.image_url]
      : [];
  const canonicalUrl = `https://www.luckystore1947.com/bn/product/${canonicalSlug}`;
  const description = getPublishedDescription(record.translation);

  return (
    <>
      <ProductJsonLd
        product={record.product}
        name={record.translation.name}
        brand={record.product.brand}
        description={description}
        canonicalUrl={canonicalUrl}
        images={productImages}
      />
      <ProductClient
        product={record.product}
        crossSell={[]}
        radhuniPackVariants={[]}
        locale="bn"
        productUrlName={record.sourceName}
        productCanonicalUrl={canonicalUrl}
        localizedProduct={{
          name: record.translation.name,
          description: record.translation.description,
          origin: record.translation.origin,
        }}
        localizedDetails={record.translation.details ?? undefined}
        galleryImages={galleryImages}
      />
    </>
  );
}
