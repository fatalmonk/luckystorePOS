import { HomeShell } from './components/HomeShell';
import { createProductRepository } from './lib/products/index';
import { supabase } from './lib/supabase';
import { img, srcSet } from './lib/imageUrl';
import { toProductSlug } from './lib/products/slugify';

export const revalidate = 60;

export default async function Home() {
  const { repo } = createProductRepository(supabase);
  const [{ products }, categories] = await Promise.all([repo.search({}), repo.getCategories()]);

  // Preload primary campaign hero image (LCP element)
  const primaryHeroAvif = img('/banners/promo_welcome_v2_1200.avif');
  const primaryHeroSrcSet = srcSet(
    '/banners/promo_welcome_v2_400.avif 400w, /banners/promo_welcome_v2_600.avif 600w, /banners/promo_welcome_v2_800.avif 800w, /banners/promo_welcome_v2_1200.avif 1200w'
  );
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://luckystore1947.com/#website',
    url: 'https://luckystore1947.com/',
    name: 'Lucky Store',
    alternateName: 'Lucky Store Chittagong',
  };
  const featuredProducts = products.filter((product) => product.stock > 0).slice(0, 6);
  const productListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Featured groceries at Lucky Store',
    itemListElement: featuredProducts.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name,
      url: `https://luckystore1947.com/product/${toProductSlug(product.name, product.id)}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productListJsonLd).replace(/</g, '\\u003c') }}
      />
      <link
        rel="preload"
        as="image"
        href={primaryHeroAvif}
        imageSrcSet={primaryHeroSrcSet}
        imageSizes="100vw"
        type="image/avif"
        fetchPriority="high"
      />
      <HomeShell products={products} categories={categories} />
    </>
  );
}
