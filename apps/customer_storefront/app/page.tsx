import { HomeShell } from './components/HomeShell';
import { createProductRepository } from './lib/products/index';
import { supabase } from './lib/supabase';
import { img, srcSet } from './lib/imageUrl';

export const revalidate = 60;

export default async function Home() {
  const { repo } = createProductRepository(supabase);
  const [{ products }, categories] = await Promise.all([repo.search({}), repo.getCategories()]);

  // Preload primary campaign hero image (LCP element)
  const primaryHeroAvif = img('/banners/promo_welcome_v2_1200.avif');
  const primaryHeroSrcSet = srcSet(
    '/banners/promo_welcome_v2_400.avif 400w, /banners/promo_welcome_v2_600.avif 600w, /banners/promo_welcome_v2_800.avif 800w, /banners/promo_welcome_v2_1200.avif 1200w'
  );

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
