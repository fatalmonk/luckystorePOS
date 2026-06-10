import { notFound } from 'next/navigation';
import { SAMPLE_CATALOG } from '../../lib/types';
import ProductClient from './ProductClient';

export function generateStaticParams() {
  return SAMPLE_CATALOG.map((product) => ({
    id: product.id,
  }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = SAMPLE_CATALOG.find((p) => p.id === id);

  if (!product) {
    notFound();
  }

  return <ProductClient product={product} />;
}
