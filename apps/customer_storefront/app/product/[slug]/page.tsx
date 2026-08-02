import { notFound, redirect } from 'next/navigation';
import { createProductRepository, createProductId } from '../../lib/products/index';
import { supabase } from '../../lib/supabase';
import { toProductSlug, extractIdFromSlug, isBareUuid } from '../../lib/products/slugify';
import ProductClient from './ProductClient';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { repo } = createProductRepository(supabase);

  // Redirect bare UUIDs (/product/<uuid>) → canonical slug URL
  if (isBareUuid(slug)) {
    const product = await repo.getById(createProductId(slug));
    if (!product) notFound();
    redirect(`/product/${toProductSlug(product.name, product.id)}`);
  }

  // Normal slug lookup via ID prefix
  const prefix = extractIdFromSlug(slug);
  const product = await repo.getByIdPrefix(prefix);

  if (!product) notFound();

  // Redirect non-canonical slugs (e.g. outdated name in URL)
  const canonical = toProductSlug(product.name, product.id);
  if (slug !== canonical) {
    redirect(`/product/${canonical}`);
  }

  return <ProductClient product={product} />;
}