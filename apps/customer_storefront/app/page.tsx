import { HomeShell } from './components/HomeShell';
import { fetchProducts, fetchCategories } from './lib/products';

export const revalidate = 60;

export default async function Home() {
  const [{ products }] = await Promise.all([fetchProducts(), fetchCategories()]);

  return (
    <HomeShell products={products} />
  );
}
