import { createProductRepository, RuleBasedBrandParser } from './index';
import { supabase } from '../supabase';
import { getCategoryGroup, normalizeCategorySlug } from '../types';
import type { Product } from '../types';
import type { CategoryItem } from '../../components/HomeShell';
import type { Locale } from '../i18n/config';

export const BENGALI_CATEGORY_NAMES: Record<string, string> = {
  'cooking-essentials': 'রান্নার প্রয়োজনীয় পণ্য',
  'breakfast': 'সকালের নাস্তা',
  'snacks': 'নাস্তা ও পানীয়',
  'household': 'ঘরের টুকিটাকি',
  'cleaning-supplies': 'পরিচ্ছন্নতার সামগ্রী',
  'personal-care': 'ব্যক্তিগত যত্ন',
  'rice-and-grain': 'চাল ও শস্য',
  'oil-and-ghee': 'তেল ও ঘি',
  'tea-and-coffee': 'চা ও কফি',
  'tea-&-coffee': 'চা ও কফি',
  'dairy-and-eggs': 'দুধ ও ডিম',
  'biscuits-and-cookies': 'বিস্কুট ও কুকিজ',
  'baby-care': 'শিশুর যত্ন',
  'spices': 'মসলা',
  'chocolates-and-candies': 'চকলেট ও ক্যান্ডি',
  'ice-cream': 'আইসক্রিম',
  'cold-beverages': 'পানীয়',
  'cereals': 'সিরিয়াল',
};

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

export interface HomePageData {
  inStock: Product[];
  categories: CategoryItem[];
  dealsProducts: Product[];
  morningProducts: Product[];
  pantryProducts: Product[];
  featuredProducts: Product[];
  campaignProducts: Product[];
  freshProducts: Product[];
  personalCareProducts: Product[];
  nestleProducts: Product[];
  snacksProducts: Product[];
}

const DEFAULT_FALLBACK_CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', slug: 'rice-and-grain', name: 'Rice & Grain', emoji: '🌾' },
  { id: 'cat-2', slug: 'oil-and-ghee', name: 'Oil & Ghee', emoji: '🛢️' },
  { id: 'cat-3', slug: 'tea-and-coffee', name: 'Tea & Coffee', emoji: '☕' },
  { id: 'cat-4', slug: 'dairy-and-eggs', name: 'Dairy & Eggs', emoji: '🥛' },
  { id: 'cat-5', slug: 'snacks', name: 'Snacks & Drinks', emoji: '🍿' },
  { id: 'cat-6', slug: 'cleaning-supplies', name: 'Cleaning Supplies', emoji: '🧼' },
  { id: 'cat-7', slug: 'personal-care', name: 'Personal Care', emoji: '🧴' },
];

export async function getHomePageData(locale: Locale = 'en'): Promise<HomePageData> {
  const { repo } = createProductRepository(supabase);
  let rawProducts: Product[] = [];
  let nestleSearchResults: Product[] = [];
  let rawCategories: any[] = [];

  try {
    const [prodRes, nestleRes, catRes] = await Promise.all([
      repo.search({ limit: 250 }),
      repo.search({ query: 'nestle', limit: 20 }),
      repo.getCategories(),
    ]);
    rawProducts = prodRes?.products || [];
    nestleSearchResults = nestleRes?.products || [];
    rawCategories = catRes || [];
  } catch {
    rawProducts = [];
    nestleSearchResults = [];
    rawCategories = [];
  }

  let products = rawProducts && rawProducts.length > 0 ? rawProducts : FALLBACK_PRODUCTS;

  // If locale is Bengali, overlay published Bengali translations
  if (locale === 'bn') {
    const productIds = products.map((p) => p.id);
    try {
      const { data: translations } = await (supabase as any)
        .from('item_translations')
        .select('item_id, name, description')
        .in('item_id', productIds)
        .eq('locale', 'bn')
        .eq('review_status', 'published');

      if (translations && translations.length > 0) {
        const transMap = new Map(translations.map((t: any) => [t.item_id, t]));
        products = products.map((p) => {
          const trans: any = transMap.get(p.id);
          if (!trans) return p;
          return {
            ...p,
            name: trans.name?.trim() || p.name,
            description: trans.description?.trim() || p.description,
          };
        });
      }
    } catch {
      // In case of network/db failure, fall back to base products
    }
  }

  const effectiveRawCategories = rawCategories && rawCategories.length > 0 ? rawCategories : DEFAULT_FALLBACK_CATEGORIES;
  const categories: CategoryItem[] = effectiveRawCategories.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    name: locale === 'bn' ? (BENGALI_CATEGORY_NAMES[cat.slug] || cat.name) : cat.name,
    emoji: cat.emoji,
  }));

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

  return {
    inStock,
    categories,
    dealsProducts: dealsPool,
    morningProducts,
    pantryProducts,
    featuredProducts,
    campaignProducts,
    freshProducts,
    personalCareProducts,
    nestleProducts,
    snacksProducts,
  };
}
