import { HomeShell } from './components/HomeShell';
import { createProductRepository, RuleBasedBrandParser } from './lib/products/index';
import { supabase } from './lib/supabase';
import { img, srcSet } from './lib/imageUrl';
import { toProductSlug } from './lib/products/slugify';
import { CATEGORY_GROUPS, getCategoryGroup, normalizeCategorySlug } from './lib/types';
import type { Product } from './lib/types';

/** Filter in-stock products whose category matches or belongs to subcategories of any of the given group slugs. */
function filterByGroups(products: Product[], groupSlugs: string[]): Product[] {
  return products.filter((p) => {
    const normCategory = normalizeCategorySlug(p.category ?? '');
    return groupSlugs.some((gSlug) => {
      const normGroupSlug = normalizeCategorySlug(gSlug);
      if (normCategory === normGroupSlug) return true;
      const group = getCategoryGroup(gSlug);
      if (group && group.subCategories.some((sub) => normalizeCategorySlug(sub) === normCategory)) {
        return true;
      }
      return false;
    });
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

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'p-tea-1',
    name: 'Ispahani Mirzapore Tea',
    emoji: '🍵',
    price: 180,
    originalPrice: 200,
    badge: 'Popular',
    unit: '500g',
    category: 'tea-and-coffee',
    stock: 50,
    description: 'Fresh black tea from Chittagong gardens.',
    brand: 'Ispahani',
  },
  {
    id: 'p-milk-1',
    name: 'Aarong Dairy Full Cream Milk',
    emoji: '🥛',
    price: 90,
    originalPrice: 95,
    unit: '1 Liter',
    category: 'dairy-and-eggs',
    stock: 30,
    description: 'Pure whole milk.',
    brand: 'Aarong',
  },
  {
    id: 'p-rice-1',
    name: 'Miniket Rice Premium',
    emoji: '🌾',
    price: 75,
    originalPrice: 85,
    unit: '1 kg',
    category: 'cooking-essentials',
    stock: 100,
    description: 'Fine grain rice.',
  },
  {
    id: 'p-oil-1',
    name: 'Teer Soyabean Oil',
    emoji: '🛢️',
    price: 175,
    originalPrice: 190,
    badge: 'Save ৳15',
    unit: '1 Liter',
    category: 'cooking-essentials',
    stock: 40,
    brand: 'Teer',
    description: 'Refined cooking oil.',
  },
  {
    id: 'p-care-1',
    name: 'Dettol Original Soap',
    emoji: '🧼',
    price: 65,
    originalPrice: 70,
    unit: '100g',
    category: 'personal-care',
    stock: 45,
    description: 'Germ protection soap.',
    brand: 'Dettol',
  },
];

export default async function Home() {
  const { repo } = createProductRepository(supabase);
  const [{ products: rawProducts }, { products: nestleSearchResults }, categories] = await Promise.all([
    repo.search({ limit: 250 }),
    repo.search({ query: 'nestle', limit: 20 }),
    repo.getCategories(),
  ]);

  const products = rawProducts && rawProducts.length > 0 ? rawProducts : FALLBACK_PRODUCTS;
  const inStock = products.filter((p) => p.stock > 0);

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
  const parsedNestle = products.filter((p) => {
    const parsedBrand = brandParser.parse(p.brand || p.name);
    return (
      parsedBrand?.toLowerCase() === 'nestle' ||
      p.name.toLowerCase().includes('nestle') ||
      p.name.toLowerCase().includes('nestlé') ||
      p.brand?.toLowerCase() === 'nestle'
    );
  });
  const nestleMap = new Map<string, Product>();
  [...(nestleSearchResults ?? []), ...parsedNestle].forEach((p) => nestleMap.set(p.id, p));
  const nestleMatches = Array.from(nestleMap.values());

  const nestleProducts = shuffleProducts(
    nestleMatches.filter((p) => p.stock > 0)
  ).slice(0, 15);

  const snacksGroup = getCategoryGroup('snacks');
  const snacksSubCats = snacksGroup ? snacksGroup.subCategories.map(normalizeCategorySlug) : ['snacks'];
  const snacksMatches = inStock.filter((p) => {
    const norm = normalizeCategorySlug(p.category);
    return snacksSubCats.includes(norm);
  });

  const snacksProducts = shuffleProducts(snacksMatches).slice(0, 15);

  const personalCareProducts = shuffleProducts(
    filterByGroups(inStock, ['personal-care'])
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
    name: 'Lucky Store — Online Grocery Chattogram',
    alternateName: ['Lucky Store Daily Bazaar', 'BD Shop Online Grocery', 'Chattogram Online Shop'],
    description: 'Lucky Store offers pantry staples, snacks, dairy, and household essentials with local delivery and cash on delivery in Chattogram.',
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
        personalCareProducts={personalCareProducts}
        nestleProducts={nestleProducts}
        snacksProducts={snacksProducts}
      />
    </>
  );
}
