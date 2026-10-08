import { FALLBACK_PRODUCTS, getHomePageData, type HomePageData } from '../products/getHomePageData';
import type { Product } from '../products/types';

export type MobileLocale = 'en' | 'bn';

const sectionCopy = {
  en: { deals: 'Quick picks', morning: 'Morning essentials', pantry: 'Pantry favourites', featured: 'Popular products', fresh: 'Fresh choices', snacks: 'Snacks and drinks' },
  bn: { deals: 'দ্রুত বাছাই', morning: 'সকালের প্রয়োজন', pantry: 'রান্নাঘরের পছন্দ', featured: 'জনপ্রিয় পণ্য', fresh: 'টাটকা পছন্দ', snacks: 'নাস্তা ও পানীয়' },
} as const;

const fallbackIds = new Set(FALLBACK_PRODUCTS.map((product) => product.id));

function productDto(product: Product) {
  const imageUrl = product.imageUrl ?? product.image_url;
  return {
    id: product.id,
    name: product.name,
    emoji: product.emoji || '🛒',
    price: product.price,
    ...(product.originalPrice === undefined ? {} : { originalPrice: product.originalPrice }),
    unit: product.unit,
    stock: product.stock,
    ...(imageUrl ? { imageUrl } : {}),
    ...(product.badge ? { badge: product.badge } : {}),
    category: product.category,
  };
}

export function toMobileHome(data: HomePageData, locale: MobileLocale) {
  const degraded = data.inStock.length > 0 && data.inStock.every((product) => fallbackIds.has(product.id));
  const titles = sectionCopy[locale];
  const sections = degraded ? [] : [
    ['deals', titles.deals, data.dealsProducts],
    ['morning', titles.morning, data.morningProducts],
    ['pantry', titles.pantry, data.pantryProducts],
    ['featured', titles.featured, data.featuredProducts],
    ['fresh', titles.fresh, data.freshProducts],
    ['snacks', titles.snacks, data.snacksProducts],
  ].map(([id, title, products]) => ({
    id: id as string,
    title: title as string,
    products: (products as Product[]).filter((product) => product.stock > 0).slice(0, 12).map(productDto),
  })).filter((section) => section.products.length > 0);

  return {
    locale,
    degraded,
    categories: data.categories.slice(0, 60).map((category) => ({ id: category.id, slug: category.slug, name: category.name, emoji: category.emoji || '🛒' })),
    sections,
  };
}

export async function getMobileHome(locale: MobileLocale) {
  return toMobileHome(await getHomePageData(locale), locale);
}
