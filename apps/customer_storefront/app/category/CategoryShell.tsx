

import { Header } from '../components/updated/Header';
import { BottomNav } from '../components/BottomNav';
import { CategoryGrid } from '../components/updated/CategoryGrid';
import { CategorySwimlanes } from '../components/CategorySwimlanes';
import { HeroBanner } from '../components/updated/HeroBanner';
import type { Product, Category, CategoryGroup } from '../lib/types';

interface CategoryShellProps {
  categorySlug: string;
  currentCat: Category | 'all';
  group?: CategoryGroup;
  categories: { id: string; slug: Category; name: string; emoji: string }[];
  products: Product[];
  theme: string;
  sort: string;
  searchParams: Record<string, string | string[] | undefined>;
}

const BANNER_MAP: Record<string, { title: string; subtitle: string; badge: string; bgImage: string }> = {
  'snacks': {
    title: 'Snacks & Munchies',
    subtitle: 'Bite-sized happiness, from sweet biscuits to savory local crisps.',
    badge: 'Crispy & Sweet',
    bgImage: '/images/promo_snacks.webp',
  },
  'cooking-needs': {
    title: 'Cooking Essentials',
    subtitle: 'Pure oils, aromatic spices, and finest grains for your daily meals.',
    badge: 'Kitchen Staples',
    bgImage: '/images/promo_cooking.webp',
  },
  'dairy-&-eggs': {
    title: 'Dairy & Eggs',
    subtitle: 'Farm-fresh milk, organic eggs, and rich butter delivered chilled.',
    badge: '100% Farm Fresh',
    bgImage: 'https://images.luckystore1947.com/banners/promo_dairy.webp',
  },
  'personal-care': {
    title: 'Personal Care & Cleaning',
    subtitle: 'Gentle soaps, premium hair care, and powerful household cleaning supplies.',
    badge: 'Hygiene & Care',
    bgImage: 'https://images.luckystore1947.com/banners/promo_personal.webp',
  },
  'baby-care': {
    title: 'Baby Care',
    subtitle: 'Ultra-soft diapers, gentle baby wash, and nourishing infant formula.',
    badge: 'Pure & Gentle',
    bgImage: 'https://images.luckystore1947.com/banners/promo_baby.webp',
  },
  'electronics': {
    title: 'Home Electronics',
    subtitle: 'High-quality adapters, durable charging cables, and everyday electronic tools.',
    badge: 'Tech Essentials',
    bgImage: '/images/promo_electronics.webp',
  },
  'baking-needs': {
    title: 'Baking Needs',
    subtitle: 'Finest flour, baking powder, rich cocoa, and premium cake decorations.',
    badge: 'Bake at Home',
    bgImage: 'https://images.luckystore1947.com/banners/promo_baking.webp',
  },
  'packaged-food': {
    title: 'Packaged Food',
    subtitle: 'Quick noodles, instant soups, and ready-to-eat meals for busy days.',
    badge: 'Quick & Easy',
    bgImage: 'https://images.luckystore1947.com/banners/promo_packaged.webp',
  },
  'beverages': {
    title: 'Cold Beverages',
    subtitle: 'Refreshing juices, soft drinks, and chilled lassi to beat the heat.',
    badge: 'Chilled & Fresh',
    bgImage: 'https://images.luckystore1947.com/banners/promo_beverages.webp',
  },
  'biscuits-&-cookies': {
    title: 'Biscuits & Cookies',
    subtitle: 'Crunchy bakery biscuits and sweet cookies, perfect for tea-time.',
    badge: 'Bakery Fresh',
    bgImage: 'https://images.luckystore1947.com/banners/promo_biscuits.webp',
  },
  'cleaning-supply': {
    title: 'Cleaning Supplies',
    subtitle: 'Powerful detergents, gentle soaps, and essential household cleaning tools.',
    badge: 'Sparkling Clean',
    bgImage: 'https://images.luckystore1947.com/banners/promo_cleaning_supply.webp',
  },
  'tea-&-coffee': {
    title: 'Tea & Coffee',
    subtitle: 'Premium loose tea leaves and rich roasted coffee beans for your perfect cup.',
    badge: 'Daily Brew',
    bgImage: 'https://images.luckystore1947.com/banners/promo_tea_coffee.webp',
  },
  'ice-cream': {
    title: 'Chilled Ice Cream',
    subtitle: 'Creamy, melting scoops of your favorite traditional and modern flavors.',
    badge: 'Sweet Treats',
    bgImage: 'https://images.luckystore1947.com/banners/promo_ice_cream.webp',
  },
  'chocolates-&-candies': {
    title: 'Chocolates & Candies',
    subtitle: 'Sweeten your day with premium dark chocolates, rich truffles, and colorful candies.',
    badge: 'Sweet Treats',
    bgImage: 'https://images.luckystore1947.com/banners/promo_chocolates.webp',
  },
  'spices': {
    title: 'Aromatic Spices',
    subtitle: 'Vibrant, high-quality spices and masalas to bring authentic flavor to your dishes.',
    badge: 'Pure & Flavorful',
    bgImage: 'https://images.luckystore1947.com/banners/promo_spices.webp',
  },
  'cereals': {
    title: 'Breakfast Cereals',
    subtitle: 'Crunchy flakes, wholesome muesli, and healthy oats to kickstart your morning.',
    badge: 'Morning Fuel',
    bgImage: 'https://images.luckystore1947.com/banners/promo_cereals.webp',
  },
};

const DEFAULT_BANNER = {
  title: 'Lucky Store Catalog',
  subtitle: 'Browse our entire collection of premium daily essentials and fresh goods.',
  badge: 'Premium Quality',
  bgImage: 'https://images.luckystore1947.com/banners/hero_grocery_banner.webp',
};

export function CategoryShell({
  categorySlug,
  currentCat,
  group,
  categories,
  products,
  theme,
  sort,
  searchParams,
}: CategoryShellProps) {
  // Resolve banner config: deals theme → specific map → group slug → default
  const bannerConfig =
    theme === 'deals'
      ? {
          title: 'Big Savings',
          subtitle: 'Up to 50% off on your favorites',
          badge: 'Hot Deals',
          bgImage: '/images/promo_savings_banner.webp',
        }
      : BANNER_MAP[categorySlug] || (group?.slug && BANNER_MAP[group.slug]) || DEFAULT_BANNER;

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="p-4 sm:p-6 space-y-6">
          <HeroBanner
            slides={[{
              image: bannerConfig.bgImage,
              title: bannerConfig.title,
              subtitle: bannerConfig.subtitle,
              badge: bannerConfig.badge,
            }]}
          />
          <CategoryGrid
            categories={categories}
            active={currentCat === 'all' ? undefined : currentCat}
          />
          <CategorySwimlanes
            categorySlug={categorySlug}
            group={group}
            products={products}
            categories={categories}
            theme={theme}
            sort={sort}
            searchParams={searchParams}
          />
        </div>
      </main>
      <BottomNav />
    </>
  );
}

