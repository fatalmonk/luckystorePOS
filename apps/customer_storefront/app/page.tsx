import { HomeShell } from './components/HomeShell';
import { fetchProducts, fetchCategories } from './lib/products';
import { img, srcSet } from './lib/imageUrl';

export const revalidate = 60;

export default async function Home() {
  const [{ products }, categories] = await Promise.all([fetchProducts(), fetchCategories()]);

  // Preload the welcome hero banner image (LCP element) in the initial HTML
  const welcomeAvif = img('/banners/promo_welcome.avif');
  const welcomeAvifSrcSet = srcSet('/banners/promo_welcome.avif 600w');
  const welcomeWebp = img('/banners/promo_welcome_1200.webp');
  const welcomeWebpSrcSet = srcSet('/banners/promo_welcome_400.webp 400w, /banners/promo_welcome_600.webp 600w, /banners/promo_welcome_800.webp 800w, /banners/promo_welcome_1200.webp 1200w');

  return (
    <>
      <link
        rel="preload"
        as="image"
        href={welcomeAvif}
        imageSrcSet={welcomeAvifSrcSet}
        imageSizes="100vw"
        type="image/avif"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={welcomeWebp}
        imageSrcSet={welcomeWebpSrcSet}
        imageSizes="100vw"
        type="image/webp"
        fetchPriority="high"
      />
      <HomeShell products={products} categories={categories} />
    </>
  );
}
