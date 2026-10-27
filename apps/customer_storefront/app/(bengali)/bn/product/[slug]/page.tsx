import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCachedProductBySlug } from '../../../../lib/products/getCachedProduct';
import { getCachedRadhuniPackVariants } from '../../../../lib/products/getCachedCrossSell';
import { supabase } from '../../../../lib/supabase';
import { toProductSlug } from '../../../../lib/products/slugify';
import { formatBdt } from '../../../../lib/formatPrice';
import { formatBengaliProductMetaDescription } from '../../../../lib/products/productMetadata';
import { isMissingItemTranslationsTableError } from '../../../../lib/translationErrors';
import { getEnrichedProductData } from '../../../../lib/products/productEnrichment';
import { getProductGalleryImages } from '../../../../lib/products/productGalleryRegistry';
import { ProductJsonLd } from '../../../../components/seo/ProductJsonLd';
import type { Product } from '../../../../lib/products/types';
import ProductClient from '../../../../(english)/product/[slug]/ProductClient';

type LocalizedProduct = { product: Product; sourceName: string; translated: boolean };

const getCachedBengaliProduct = cache(async (slug: string): Promise<LocalizedProduct | null> => {
  const product = await getCachedProductBySlug(slug);
  if (!product) return null;

  const { data: translation, error } = await (supabase as any)
    .from('item_translations')
    .select('name, description, origin')
    .eq('item_id', product.id)
    .eq('locale', 'bn')
    .eq('review_status', 'published')
    .maybeSingle();

  // Bengali translations are an optional overlay. If the translation
  // migration has not reached an environment yet, keep the product usable
  // with its canonical English content instead of failing the route.
  if (error) {
    if (!isMissingItemTranslationsTableError(error)) {
      console.error('Failed to load Bengali product translation', {
        itemId: product.id,
        error,
      });
    }
    return {
      sourceName: product.name,
      translated: false,
      product,
    };
  }

  return {
    sourceName: product.name,
    translated: Boolean(translation),
    product: {
      ...product,
      name: translation?.name || product.name,
      description: translation?.description || product.description,
      origin: translation?.origin || product.origin,
    },
  };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const localized = await getCachedBengaliProduct(slug);
  if (!localized) notFound();

  const canonicalSlug = toProductSlug(localized.sourceName, localized.product.id);
  if (slug !== canonicalSlug) permanentRedirect(`/bn/product/${canonicalSlug}`);

  const canonicalUrl = `https://www.luckystore1947.com/bn/product/${canonicalSlug}`;
  const enrichment = getEnrichedProductData(slug) || getEnrichedProductData(localized.product.id);
  const galleryImages = enrichment?.galleryImages?.length
    ? enrichment.galleryImages
    : getProductGalleryImages(localized.product.id);
  const metadataImage = galleryImages?.[0];
  const imageUrl = galleryImages !== undefined
    ? metadataImage?.url || '/lucky-store-social-share-v2.png'
    : localized.product.image_url || '/lucky-store-social-share-v2.png';
  const imageAlt = metadataImage?.alt || localized.product.name;
  const title = `${localized.product.name} – ${formatBdt(localized.product.price)}`;
  const description = localized.product.description?.trim()
    || formatBengaliProductMetaDescription(localized.product.name, localized.product.price);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'bn-BD': canonicalUrl,
        'en-BD': `https://www.luckystore1947.com/product/${canonicalSlug}`,
        'x-default': `https://www.luckystore1947.com/product/${canonicalSlug}`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'লাকি স্টোর',
      locale: 'bn_BD',
      url: canonicalUrl,
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: imageAlt,
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

export default async function BengaliProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const localized = await getCachedBengaliProduct(slug);
  if (!localized) notFound();

  const canonicalSlug = toProductSlug(localized.sourceName, localized.product.id);
  if (slug !== canonicalSlug) permanentRedirect(`/bn/product/${canonicalSlug}`);
  const radhuniPackVariants = await getCachedRadhuniPackVariants({
    ...localized.product,
    name: localized.sourceName,
  });

  const rawEnrichment = getEnrichedProductData(slug) || getEnrichedProductData(localized.product.id);
  const enrichment = rawEnrichment && localized.translated
    ? {
        ...rawEnrichment,
        exactName: localized.product.name,
        summary: localized.product.description || rawEnrichment.summary,
      }
    : rawEnrichment;
  const galleryImages = enrichment?.galleryImages?.length
    ? enrichment.galleryImages
    : getProductGalleryImages(localized.product.id);
  const productImages = galleryImages !== undefined
    ? galleryImages.map(({ url }) => url)
    : localized.product.image_url
      ? [localized.product.image_url]
      : [];
  const canonicalUrl = `https://www.luckystore1947.com/bn/product/${canonicalSlug}`;

  return (
    <>
      <ProductJsonLd
        product={localized.product}
        name={localized.product.name}
        brand={enrichment?.brand || localized.product.brand}
        description={localized.product.description || enrichment?.summary}
        canonicalUrl={canonicalUrl}
        images={productImages}
      />
      <ProductClient
        product={localized.product}
        crossSell={[]}
        radhuniPackVariants={radhuniPackVariants}
        locale="bn"
        productUrlName={localized.sourceName}
        productCanonicalUrl={canonicalUrl}
        enrichment={enrichment}
        galleryImages={galleryImages}
      />
    </>
  );
}
