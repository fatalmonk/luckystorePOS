import { HomeShell } from './components/HomeShell';
import { createProductRepository } from './lib/products/index';
import { supabase } from './lib/supabase';
import { img, srcSet } from './lib/imageUrl';

export const revalidate = 60;

export default async function Home() {
  const { repo } = createProductRepository(supabase);
  const [{ products }, categories] = await Promise.all([repo.search({}), repo.getCategories()]);

  // Preload primary campaign hero image (LCP element)
  const primaryHeroAvif = img('/banners/promo_welcome_v2.avif');
  const primaryHeroSrcSet = srcSet('/banners/promo_welcome_v2.avif 600w');

  return (
    <>
      <link
        rel="preload"
        as="image"
        href={primaryHeroAvif}
        imageSrcSet={primaryHeroSrcSet}
        imageSizes="(max-width: 768px) 100vw, 50vw"
        type="image/avif"
        fetchPriority="high"
      />
      <HomeShell products={products} categories={categories} />
    </>
  );
}
