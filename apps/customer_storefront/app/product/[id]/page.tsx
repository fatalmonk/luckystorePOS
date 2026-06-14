import { notFound } from 'next/navigation';
import { fetchProducts } from '../../lib/products';
import ProductClient from './ProductClient';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = (await fetchProducts()).find((p) => p.id === id);

  if (!product) {
    notFound();
  }

  return <ProductClient product={product} />;
}
