import { HomeShell } from './components/HomeShell';
import { createProductRepository, RuleBasedBrandParser } from './lib/products/index';
import { supabase } from './lib/supabase';
import { img, srcSet } from './lib/imageUrl';
import { toProductSlug } from './lib/products/slugify';
import { CATEGORY_GROUPS, getCategoryGroup } from './lib/types';
import type { Product } from './lib/types';

/** Filter in-stock products whose category belongs to any of the given group slugs. */
function filterByGroups(products: Product[], groupSlugs: string[]): Product[] {
  return products.filter((p) => {
    const group = getCategoryGroup(p.category ?? '');
    return group ? groupSlugs.includes(group.slug) : false;
  });
}

/** Deterministically randomize product list order for balanced variety without SSR hydration mismatches. */
function shuffleProducts<T extends { id: string }>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const charCode = result[i].id.charCodeAt(result[i].id.length - 1) || 7;
    const pseudoRandom = Math.abs(Math.sin(i * 997 + charCode * 31));
    const j = Math.floor(pseudoRandom * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const revalidate = 60;

export default async function Home() {
  const { repo } = createProductRepository(supabase);
  const [{ products }, { products: nestleSearchResults }, categories] = await Promise.all([
    repo.search({ limit: 250 }),
    repo.search({ query: 'nestle', limit: 20 }),
    repo.getCategories(),
  ]);

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

  const morningProducts = shuffleProducts(
    filterByGroups(inStock, [
      'dairy-and-eggs', 'breakfast', 'tea-&-coffee', 'biscuits-and-cookies', 'cereals', 'chocolates-and-candies',
    ])
  ).slice(0, 15);

  const pantryProducts = shuffleProducts(
    filterByGroups(inStock, ['rice-and-grain', 'cooking-essentials', 'spices', 'oil-and-ghee'])
  ).slice(0, 15);

  const featuredProducts = shuffleProducts(inStock).slice(0, 15);

  const freshProducts = shuffleProducts(
    filterByGroups(inStock, ['dairy-and-eggs', 'ice-cream', 'cold-beverages'])
  ).slice(0, 15);

  const brandParser = new RuleBasedBrandParser();
  const nestleMatches = (nestleSearchResults ?? []).length > 0
    ? nestleSearchResults!
    : products.filter((p) => {
        const parsedBrand = brandParser.parse(p.brand || p.name);
        return (
          parsedBrand?.toLowerCase() === 'nestle' ||
          p.name.toLowerCase().includes('nestle') ||
          p.name.toLowerCase().includes('nestlé') ||
          p.brand?.toLowerCase() === 'nestle'
        );
      });

  const nestleProducts = shuffleProducts(
    Array.from(
      new Set([
        ...nestleMatches.filter((p) => p.stock > 0),
        ...nestleMatches,
      ])
    )
  ).slice(0, 15);

  const snacksProducts = shuffleProducts(
    filterByGroups(inStock, [
      'snacks', 'ice-cream', 'cold-beverages', 'chocolates-and-candies', 'chips-and-pretzels',
    ])
  ).slice(0, 15);

  const personalCareProducts = shuffleProducts(
    filterByGroups(inStock, ['personal-care', 'cleaning-supplies'])
  ).slice(0, 15);

  const organicCandidate = inStock.filter(
    (p) =>
      p.name.toLowerCase().includes('organic') ||
      p.description?.toLowerCase().includes('organic') ||
      p.category?.toLowerCase().includes('organic'),
  );
  const campaignProducts = shuffleProducts(
    organicCandidate.length >= 4
      ? organicCandidate
      : filterByGroups(inStock, ['cooking-essentials', 'rice-and-grain', 'spices', 'tea-&-coffee'])
  ).slice(0, 15);

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
    name: 'Lucky Store — Online Grocery Chittagong',
    alternateName: ['Lucky Store Daily Bazaar', 'BD Shop Online Grocery', 'Chittagong Online Shop'],
    description: 'Best Bangladesh online grocery & daily bazaar in Chittagong. Formalin free Meat, Oil, Chal, best grocery price Chittagong & free returns.',
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
        morningProducts={morningProducts.length > 0 ? morningProducts : inStock.slice(0, 15)}
        pantryProducts={pantryProducts.length > 0 ? pantryProducts : inStock.slice(0, 15)}
        featuredProducts={featuredProducts}
        campaignProducts={campaignProducts.length > 0 ? campaignProducts : inStock.slice(0, 15)}
        freshProducts={freshProducts.length > 0 ? freshProducts : inStock.slice(0, 15)}
        personalCareProducts={personalCareProducts.length > 0 ? personalCareProducts : inStock.slice(0, 15)}
        nestleProducts={nestleProducts.length > 0 ? nestleProducts : inStock.slice(0, 15)}
        snacksProducts={snacksProducts.length > 0 ? snacksProducts : inStock.slice(0, 15)}
      />
    </>
  );
}
