import Link from 'next/link';
import { Header } from '../components/updated/Header';
import { Footer } from '../components/updated/Footer';
import { BottomNav } from '../components/BottomNav';
import { CatalogLayout } from '../components/CatalogLayout';
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

const BANNER_MAP: Record<string, { title: string; subtitle: string; badge: string; bgImage: any }> = {
  'snacks': {
    title: 'Snacks & Munchies',
    subtitle: 'Bite-sized happiness, from sweet biscuits to savory local crisps.',
    badge: 'Crispy & Sweet',
    bgImage: { src: img('/banners/promo_snacks_1200.webp'), alt: 'Snacks' },
  },
  'cooking-essentials': {
    title: 'Cooking Essentials',
    subtitle: 'Pure oils, aromatic spices, and finest grains for your daily meals.',
    badge: 'Kitchen Staples',
    bgImage: { src: img('/banners/promo_cooking_1200.webp'), alt: 'Cooking' },
  },
  'personal-care': {
    title: 'Personal Care & Hygiene',
    subtitle: 'Gentle soaps, premium hair care, skincare, and daily grooming essentials.',
    badge: 'Hygiene & Care',
    bgImage: { src: img('/banners/promo_welcome_1200.webp'), alt: 'Personal care' },
  },
};

export function CategoryShell({
  categorySlug,
  group,
  parentGroup,
  categories,
  products,
  theme,
  sort,
  searchParams,
}: CategoryShellProps) {
  const isAllProducts = categorySlug === 'all';
  const catObj = categories.find((c) => c.slug === categorySlug);
  const prettyName =
    catObj?.name ||
    categorySlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const bannerConfig = BANNER_MAP[categorySlug] || (group?.slug && BANNER_MAP[group.slug]) || {
    title: prettyName,
    subtitle: `Explore top quality ${prettyName.toLowerCase()} products delivered directly to your home.`,
    badge: 'Lucky Choice',
    bgImage: { src: img('/banners/hero_grocery_banner_1200.webp'), alt: prettyName },
  };

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
          {/* Render compact banner ONLY for specific category/group pages, never on all-products */}
          {!isAllProducts && (
            <div className="space-y-4">
              {parentGroup && !group && (
                <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-warm-muted">
                  <Link href="/category" className="hover:text-warm-fg transition-colors">
                    Categories
                  </Link>
                  <span>/</span>
                  <Link href={`/category/${parentGroup.slug}`} className="hover:text-warm-fg transition-colors">
                    {parentGroup.label}
                  </Link>
                  <span>/</span>
                  <span className="text-warm-fg font-bold">{prettyName}</span>
                </nav>
              )}
              <HeroBanner
                slides={[
                  {
                    image: bannerConfig.bgImage,
                    title: bannerConfig.title,
                    subtitle: bannerConfig.subtitle,
                    badge: bannerConfig.badge,
                  },
                ]}
              />
            </div>
          )}

          {/* Direct Catalog Layout */}
          <CatalogLayout
            products={products}
            categorySlug={categorySlug}
            group={group}
            parentGroup={parentGroup}
            categories={categories}
            theme={theme}
            sort={sort}
            searchParams={searchParams}
          />
        </div>
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
