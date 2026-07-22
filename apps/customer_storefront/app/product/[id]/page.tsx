import { notFound } from 'next/navigation';
import { createProductRepository, createProductId } from '../../lib/products/index';
import { supabase } from '../../lib/supabase';
import ProductClient from './ProductClient';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { repo } = createProductRepository(supabase);
  const product = await repo.getById(createProductId(id));

  if (!product) {
    notFound();
  }

  return <ProductClient product={product} />;
}