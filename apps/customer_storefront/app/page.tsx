import { HomeShell } from './components/HomeShell';
import { createProductRepository } from './lib/products/index';
import { supabase } from './lib/supabase';
import { img, srcSet } from './lib/imageUrl';
import { toProductSlug } from './lib/products/slugify';
import { getCategoryGroup } from './lib/types';
import type { Product } from './lib/types';

/** Filter in-stock products whose category belongs to any of the given group slugs. */
function filterByGroups(products: Product[], groupSlugs: string[]): Product[] {
  return products.filter((p) => {
    const group = getCategoryGroup(p.category ?? '');
    return group ? groupSlugs.includes(group.slug) : false;
  });
}

export const revalidate = 60;

export default async function Home() {
  const { repo } = createProductRepository(supabase);
  const [{ products }, categories] = await Promise.all([repo.search({}), repo.getCategories()]);

  if (!products || products.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-black">Lucky Store is stocking up</h1>
          <p className="mt-2 text-sm text-warm-muted">Please check back soon.</p>
        </div>
      </div>
    );
  }

  const inStock = products.filter((p) => p.stock > 0);

  if (inStock.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-black">Lucky Store is stocking up</h1>
          <p className="mt-2 text-sm text-warm-muted">All items are currently out of stock. Please check back soon.</p>
        </div>
      </div>
    );
  }

  const onSale = inStock.filter((p) => p.originalPrice != null && p.originalPrice > p.price);
  const withBadge = inStock.filter((p) => p.badge);
  const dealsPool = onSale.length >= 4 ? onSale : withBadge.length >= 4 ? withBadge : inStock;

  const morningProducts = filterByGroups(inStock, [
    'dairy-and-eggs', 'breakfast', 'tea-&-coffee', 'biscuits-and-cookies', 'cereals', 'chocolates-and-candies',
  ])
    .sort((a, b) => a.price - b.price)
    .slice(0, 8);

  const pantryProducts = filterByGroups(inStock, [
    'rice-and-grain', 'cooking-essentials', 'spices', 'oil-and-ghee',
  ])
    .sort((a, b) => a.price - b.price)
    .slice(0, 8);

  const featuredProducts = inStock.slice(0, 6);

  const freshProducts = filterByGroups(inStock, ['dairy-and-eggs', 'ice-cream', 'cold-beverages'])
    .sort((a, b) => a.price - b.price)
    .slice(0, 9);

  const nestleProducts = inStock
    .filter((p) => p.name.toLowerCase().includes('nestle') || p.brand?.toLowerCase().includes('nestle'))
    .slice(0, 9);

  const campaignProducts = filterByGroups(inStock, ['tea-&-coffee', 'breakfast'])
    .sort((a, b) => a.price - b.price)
    .slice(0, 8);

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
      <HomeShell
        inStock={inStock}
        categories={categories}
        dealsProducts={dealsPool}
        morningProducts={morningProducts}
        pantryProducts={pantryProducts}
        featuredProducts={featuredProducts}
        campaignProducts={campaignProducts}
        freshProducts={freshProducts}
        nestleProducts={nestleProducts}
      />
    </>
  );
}
