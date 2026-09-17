import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCachedProductBySlug } from '../../../lib/products/getCachedProduct';
import { supabase } from '../../../lib/supabase';
import { toProductSlug } from '../../../lib/products/slugify';
import { formatBdt } from '../../../lib/formatPrice';
import { isMissingItemTranslationsTableError } from '../../../lib/translationErrors';
import type { Product } from '../../../lib/products/types';
import ProductClient from '../../../product/[slug]/ProductClient';

type LocalizedProduct = { product: Product; sourceName: string; translated: boolean };

const getCachedBengaliProduct = cache(async (slug: string): Promise<LocalizedProduct | null> => {
  const product = await getCachedProductBySlug(slug);
  if (!product) return null;

  const { data: translation, error } = await (supabase as any)
    .from('item_translations')
    .select('name, description')
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
  return {
    title: { absolute: `${localized.product.name} – ${formatBdt(localized.product.price)}` },
    description: localized.product.description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'bn-BD': canonicalUrl,
        'en-BD': `https://www.luckystore1947.com/product/${canonicalSlug}`,
        'x-default': `https://www.luckystore1947.com/product/${canonicalSlug}`,
      },
    },
    openGraph: { type: 'website', locale: 'bn_BD', url: canonicalUrl, title: localized.product.name, description: localized.product.description },
  };
}

export default async function BengaliProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const localized = await getCachedBengaliProduct(slug);
  if (!localized) notFound();

  const canonicalSlug = toProductSlug(localized.sourceName, localized.product.id);
  if (slug !== canonicalSlug) permanentRedirect(`/bn/product/${canonicalSlug}`);

  return (
    <ProductClient
      product={localized.product}
      crossSell={[]}
      locale="bn"
      productUrlName={localized.sourceName}
      productCanonicalUrl={`https://www.luckystore1947.com/bn/product/${canonicalSlug}`}
    />
  );
}
