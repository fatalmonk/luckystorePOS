

import { Header } from '../components/updated/Header';
import { BottomNav } from '../components/BottomNav';
import { ThemedShortcuts } from '../components/ThemedShortcuts';
import { CategorySwimlanes } from '../components/CategorySwimlanes';
import { HeroBanner } from '../components/updated/HeroBanner';
import type { Product, Category, CategoryGroup } from '../lib/types';
import { img, srcSet } from '../lib/imageUrl';

interface CategoryShellProps {
  categorySlug: string;
  currentCat: Category | 'all';
  group?: CategoryGroup;
  parentGroup?: CategoryGroup;
  categories: { id: string; slug: Category; name: string; emoji: string }[];
  products: Product[];
  theme: string;
  sort: string;
  searchParams: Record<string, string | string[] | undefined>;
}

const SNACKS_SRC_SET = srcSet('/banners/promo_snacks_400.webp 400w, /banners/promo_snacks_600.webp 600w, /banners/promo_snacks_800.webp 800w, /banners/promo_snacks_1200.webp 1200w');
const SNACKS_AVIF_SRC_SET = srcSet('/banners/promo_snacks.avif 600w');
const ELECTRONICS_SRC_SET = srcSet('/banners/promo_electronics_400.webp 400w, /banners/promo_electronics_600.webp 600w, /banners/promo_electronics_800.webp 800w, /banners/promo_electronics_1200.webp 1200w');
const ELECTRONICS_AVIF_SRC_SET = srcSet('/banners/promo_electronics.avif 600w');
const COOKING_SRC_SET = srcSet('/banners/promo_cooking_400.webp 400w, /banners/promo_cooking_600.webp 600w, /banners/promo_cooking_800.webp 800w, /banners/promo_cooking_1200.webp 1200w');
const COOKING_AVIF_SRC_SET = srcSet('/banners/promo_cooking.avif 600w');
const SAVINGS_SRC_SET = srcSet('/banners/promo_savings_banner_400.webp 400w, /banners/promo_savings_banner_600.webp 600w, /banners/promo_savings_banner_800.webp 800w, /banners/promo_savings_banner_1200.webp 1200w');
const SAVINGS_AVIF_SRC_SET = srcSet('/banners/promo_savings_banner.avif 600w');
const HERO_GROCERY_SRC_SET = srcSet('/banners/hero_grocery_banner_400.webp 400w, /banners/hero_grocery_banner_600.webp 600w, /banners/hero_grocery_banner_800.webp 800w, /banners/hero_grocery_banner_1200.webp 1200w');
const HERO_GROCERY_AVIF_SRC_SET = srcSet('/banners/hero_grocery_banner.avif 600w');

/** Helper: build a responsive image object from a base name. */
function responsiveBanner(base: string, alt: string, avif = true) {
  const webp = srcSet(`/banners/${base}_400.webp 400w, /banners/${base}_600.webp 600w, /banners/${base}_800.webp 800w, /banners/${base}_1200.webp 1200w`);
  const sources = avif ? [{ srcSet: srcSet(`/banners/${base}.avif 600w`), type: 'image/avif', media: '(min-width: 1px)' }] : undefined;
  return { src: img(`/banners/${base}_1200.webp`), srcSet: webp, sizes: '100vw', sources, alt };
}

const BANNER_MAP: Record<string, { title: string; subtitle: string; badge: string; bgImage: string | { src: string; srcSet: string; sizes: string; sources?: { srcSet: string; type: string; media?: string }[] } }> = {
  'snacks': {
    title: 'Snacks & Munchies',
    subtitle: 'Bite-sized happiness, from sweet biscuits to savory local crisps.',
    badge: 'Crispy & Sweet',
    bgImage: {
      src: img('/banners/promo_snacks_1200.webp'),
      srcSet: SNACKS_SRC_SET,
      sizes: '100vw',
      sources: [
        { srcSet: SNACKS_AVIF_SRC_SET, type: 'image/avif', media: '(min-width: 1px)' },
      ],
    },
  },
  'electronics': {
    title: 'Home Electronics',
    subtitle: 'High-quality adapters, durable charging cables, and everyday electronic tools.',
    badge: 'Tech Essentials',
    bgImage: {
      src: img('/banners/promo_electronics_1200.webp'),
      srcSet: ELECTRONICS_SRC_SET,
      sizes: '100vw',
      sources: [
        { srcSet: ELECTRONICS_AVIF_SRC_SET, type: 'image/avif', media: '(min-width: 1px)' },
      ],
    },
  },
  'cooking-essentials': {
    title: 'Cooking Essentials',
    subtitle: 'Pure oils, aromatic spices, and finest grains for your daily meals.',
    badge: 'Kitchen Staples',
    bgImage: {
      src: img('/banners/promo_cooking_1200.webp'),
      srcSet: COOKING_SRC_SET,
      sizes: '100vw',
      sources: [
        { srcSet: COOKING_AVIF_SRC_SET, type: 'image/avif', media: '(min-width: 1px)' },
      ],
    },
  },
  'rice-&-grain': {
    title: 'Rice & Grains',
    subtitle: 'Premium basmati, chinigura rice, aromatic lentils, and wholesome kitchen grains.',
    badge: 'Pantry Staple',
    bgImage: responsiveBanner('promo_cooking', 'Rice and grains'),
  },
  'spices': {
    title: 'Aromatic Spices & Masalas',
    subtitle: 'Vibrant turmeric, chili, cumin, and blended masalas for authentic home cooking.',
    badge: 'Pure & Flavorful',
    bgImage: responsiveBanner('promo_spices', 'Spices and masalas'),
  },
  'oil-&-ghee': {
    title: 'Cooking Oil & Pure Ghee',
    subtitle: 'Nutritious mustard oil, soybean oil, sunflower oil, and aromatic pure ghee.',
    badge: 'Kitchen Essential',
    bgImage: responsiveBanner('promo_cooking', 'Oil and ghee'),
  },
  'salt-&-sugar': {
    title: 'Salt & Sugar',
    subtitle: 'Pure iodized salt, refined sugar, brown sugar, and natural sweeteners.',
    badge: 'Daily Need',
    bgImage: responsiveBanner('promo_cooking', 'Salt and sugar'),
  },
  'premium-ingredients': {
    title: 'Premium Ingredients',
    subtitle: 'Imported sauces, olive oils, gourmet herbs, and specialty cooking accents.',
    badge: 'Gourmet Selection',
    bgImage: responsiveBanner('promo_cooking', 'Premium cooking ingredients'),
  },
  'condiments': {
    title: 'Sauces & Condiments',
    subtitle: 'Rich tomato ketchups, fiery chili sauces, traditional pickles, and dips.',
    badge: 'Flavor Boosters',
    bgImage: responsiveBanner('promo_packaged', 'Sauces and condiments'),
  },
  'dairy-&-eggs': {
    title: 'Dairy & Eggs',
    subtitle: 'Farm-fresh milk, organic eggs, and rich butter delivered chilled.',
    badge: '100% Farm Fresh',
    bgImage: responsiveBanner('promo_dairy', 'Dairy and eggs products'),
  },
  'personal-care': {
    title: 'Personal Care & Hygiene',
    subtitle: 'Gentle soaps, premium hair care, skincare, and daily grooming essentials.',
    badge: 'Hygiene & Care',
    bgImage: responsiveBanner('promo_personal', 'Personal care products'),
  },
  'dental': {
    title: 'Dental & Oral Care',
    subtitle: 'Protective toothpastes, soft toothbrushes, refreshing mouthwashes, and floss.',
    badge: 'Smile Care',
    bgImage: responsiveBanner('promo_personal', 'Dental care'),
  },
  'facial': {
    title: 'Facial Care & Cleansers',
    subtitle: 'Deep face washes, hydrating serums, moisturizers, and facial masks.',
    badge: 'Glow & Fresh',
    bgImage: responsiveBanner('promo_personal', 'Facial care'),
  },
  'hair': {
    title: 'Hair Care & Oils',
    subtitle: 'Nourishing shampoos, smooth conditioners, natural hair oils, and treatments.',
    badge: 'Healthy Hair',
    bgImage: responsiveBanner('promo_personal', 'Hair care'),
  },
  'skin': {
    title: 'Body & Skin Care',
    subtitle: 'Moisturizing body lotions, shower gels, hand washes, and skin creams.',
    badge: 'Soft & Hydrated',
    bgImage: responsiveBanner('promo_personal', 'Skin care'),
  },
  'perfume-&-body-spray': {
    title: 'Deodorants & Fragrances',
    subtitle: 'Long-lasting body sprays, refreshing antiperspirants, and fine perfumes.',
    badge: 'Fresh All Day',
    bgImage: responsiveBanner('promo_personal', 'Fragrances and body sprays'),
  },
  'grooming': {
    title: 'Men & Women Grooming',
    subtitle: 'Razor blades, shaving gels, hair removal, and personal grooming accessories.',
    badge: 'Daily Grooming',
    bgImage: responsiveBanner('promo_personal', 'Grooming tools'),
  },
  'baby-care': {
    title: 'Baby Care',
    subtitle: 'Ultra-soft diapers, gentle baby wash, and nourishing infant formula.',
    badge: 'Pure & Gentle',
    bgImage: responsiveBanner('promo_baby', 'Baby care products'),
  },
  'baking-needs': {
    title: 'Baking Needs',
    subtitle: 'Finest flour, baking powder, rich cocoa, and premium cake decorations.',
    badge: 'Bake at Home',
    bgImage: responsiveBanner('promo_baking', 'Baking supplies'),
  },
  'packaged-food': {
    title: 'Packaged Food',
    subtitle: 'Quick noodles, instant soups, and ready-to-eat meals for busy days.',
    badge: 'Quick & Easy',
    bgImage: responsiveBanner('promo_packaged', 'Packaged food products'),
  },
  'beverages': {
    title: 'Cold Beverages',
    subtitle: 'Refreshing juices, soft drinks, and chilled lassi to beat the heat.',
    badge: 'Chilled & Fresh',
    bgImage: responsiveBanner('promo_beverages', 'Cold beverages'),
  },
  'cold-beverages': {
    title: 'Cold Beverages & Sodas',
    subtitle: 'Chilled soft drinks, sparkling fruit juices, energy drinks, and iced teas.',
    badge: 'Chilled & Fresh',
    bgImage: responsiveBanner('promo_beverages', 'Cold beverages'),
  },
  'biscuits-&-cookies': {
    title: 'Biscuits & Cookies',
    subtitle: 'Crunchy bakery biscuits and sweet cookies, perfect for tea-time.',
    badge: 'Bakery Fresh',
    bgImage: responsiveBanner('promo_biscuits', 'Biscuits and cookies'),
  },
  'cleaning-supplies': {
    title: 'Cleaning Supplies',
    subtitle: 'Powerful detergents, gentle soaps, and essential household cleaning tools.',
    badge: 'Sparkling Clean',
    bgImage: responsiveBanner('promo_cleaning_supply', 'Cleaning supplies'),
  },
  'air-freshner': {
    title: 'Air Fresheners',
    subtitle: 'Refreshing room sprays, gel air fresheners, and aromatic car fragrances.',
    badge: 'Fresh Ambiance',
    bgImage: responsiveBanner('promo_cleaning_supply', 'Air fresheners'),
  },
  'pest-control': {
    title: 'Pest Control',
    subtitle: 'Effective aerosol sprays, mosquito repellent coils, vaporizers, and traps.',
    badge: 'Home Protection',
    bgImage: responsiveBanner('promo_cleaning_supply', 'Pest control'),
  },
  'tea-&-coffee': {
    title: 'Tea & Coffee',
    subtitle: 'Premium loose tea leaves and rich roasted coffee beans for your perfect cup.',
    badge: 'Daily Brew',
    bgImage: responsiveBanner('promo_tea_coffee', 'Tea and coffee'),
  },
  'ice-cream': {
    title: 'Chilled Ice Cream',
    subtitle: 'Creamy, melting scoops of your favorite traditional and modern flavors.',
    badge: 'Sweet Treats',
    bgImage: responsiveBanner('promo_ice_cream', 'Ice cream products'),
  },
  'chocolates-&-candies': {
    title: 'Chocolates & Candies',
    subtitle: 'Sweeten your day with premium dark chocolates, rich truffles, and colorful candies.',
    badge: 'Sweet Treats',
    bgImage: responsiveBanner('promo_chocolates', 'Chocolates and candies'),
  },
  'cereals': {
    title: 'Breakfast Cereals',
    subtitle: 'Crunchy flakes, wholesome muesli, and healthy oats to kickstart your morning.',
    badge: 'Morning Fuel',
    bgImage: responsiveBanner('promo_cereals', 'Breakfast cereals'),
  },
  'energy-boosters': {
    title: 'Energy Boosters & Health Drinks',
    subtitle: 'Wholesome malt drinks, protein powders, and instant energy boosters for active days.',
    badge: 'Vitality & Health',
    bgImage: responsiveBanner('promo_cereals', 'Energy drinks and boosters'),
  },
};

const DEFAULT_BANNER = {
  title: 'Lucky Store Catalog',
  subtitle: 'Browse our entire collection of premium daily essentials and fresh goods.',
  badge: 'Premium Quality',
  bgImage: {
    src: img('/banners/hero_grocery_banner_1200.webp'),
    srcSet: HERO_GROCERY_SRC_SET,
    sizes: '100vw',
    sources: [
      { srcSet: HERO_GROCERY_AVIF_SRC_SET, type: 'image/avif', media: '(min-width: 1px)' },
    ],
    alt: 'Lucky Store grocery catalog',
  },
};

export function CategoryShell({
  categorySlug,
  currentCat,
  group,
  parentGroup,
  categories,
  products,
  theme,
  sort,
  searchParams,
}: CategoryShellProps) {
  // Build dynamic fallback banner info for any slug not directly in BANNER_MAP
  const catObj = categories.find((c) => c.slug === categorySlug);
  const prettyName = catObj?.name || categorySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const fallbackBanner = {
    title: prettyName,
    subtitle: `Explore top quality ${prettyName.toLowerCase()} products delivered directly to your home.`,
    badge: 'Lucky Choice',
    bgImage: group?.slug && BANNER_MAP[group.slug]?.bgImage 
      ? BANNER_MAP[group.slug].bgImage 
      : parentGroup?.slug && BANNER_MAP[parentGroup.slug]?.bgImage
      ? BANNER_MAP[parentGroup.slug].bgImage
      : DEFAULT_BANNER.bgImage,
  };

  // Resolve banner config: deals theme → specific map → group slug → parent group slug → fallback
  const bannerConfig =
    theme === 'deals'
      ? {
          title: 'Big Savings',
          subtitle: 'Up to 50% off on your favorites',
          badge: 'Hot Deals',
          bgImage: {
            src: img('/banners/promo_savings_banner_1200.webp'),
            srcSet: SAVINGS_SRC_SET,
            sizes: '100vw',
            sources: [
              { srcSet: SAVINGS_AVIF_SRC_SET, type: 'image/avif', media: '(min-width: 1px)' },
            ],
            alt: 'Big savings banner',
          },
        }
      : BANNER_MAP[categorySlug] || (group?.slug && BANNER_MAP[group.slug]) || fallbackBanner;

  const slideImage = typeof bannerConfig.bgImage === 'string'
    ? bannerConfig.bgImage
    : bannerConfig.bgImage;

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="p-4 sm:p-6 space-y-6">
          {parentGroup && !group && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-warm-muted">
              <a href="/category" className="hover:text-warm-fg transition-colors">
                Categories
              </a>
              <span>/</span>
              <a href={`/category/${parentGroup.slug}`} className="hover:text-warm-fg transition-colors">
                {parentGroup.label}
              </a>
              <span>/</span>
              <span className="text-warm-fg font-bold">
                {prettyName}
              </span>
            </nav>
          )}
          <HeroBanner
            slides={[{
              image: slideImage,
              title: bannerConfig.title,
              subtitle: bannerConfig.subtitle,
              badge: bannerConfig.badge,
            }]}
          />
          <ThemedShortcuts />
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

