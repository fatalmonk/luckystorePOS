import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { HeroBanner } from '../components/HeroBanner';
import { CategoryGrid } from '../components/CategoryGrid';
import { SponsoredBanner } from '../components/SponsoredBanner';
import { CategoryFooter } from '../components/CategoryFooter';
import { CategorySwimlanes } from '../components/CategorySwimlanes';
import type { Product, Category, CategoryGroup } from '../lib/types';

interface CategoryShellProps {
  categorySlug: string;
  currentCat: Category | 'all';
  group?: CategoryGroup;
  categories: { id: string; slug: Category; name: string; emoji: string }[];
  products: Product[];
  searchTerm: string;
  theme: string;
  sort: string;
}

export function CategoryShell({
  categorySlug,
  currentCat,
  group,
  categories,
  products,
  searchTerm,
  theme,
  sort,
}: CategoryShellProps) {
  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#faf8f5]">
        <div className="min-w-0">
          <HeroBanner
            title="⚡ Express Delivery"
            subtitle="Delivery in as soon as 1 hour. Shop your faves."
            badge="New"
            bgGradient="from-[#0b4fd9] to-[#005bb5]"
          />

          <div className="mt-4">
            <CategoryGrid
              categories={categories}
              active={currentCat !== 'all' ? currentCat : undefined}
            />
          </div>

          <SponsoredBanner
            title="Your go-tos, elevated"
            subtitle="bettergoods snack stars"
            ctaText="Shop now"
            bgColor="#faf8f5"
          />

          <CategorySwimlanes
            categorySlug={categorySlug}
            group={group}
            products={products}
            categories={categories}
            theme={theme}
            sort={sort}
          />

          <CategoryFooter
            categorySlug={categorySlug}
            categoryName={
              searchTerm
                ? `Search: "${searchTerm}"`
                : theme === 'deals'
                ? 'Rollbacks & Deals'
                : theme === 'new'
                ? 'New Arrivals'
                : theme === 'bestsellers'
                ? 'Best Sellers'
                : group
                ? group.label
                : currentCat === 'all'
                ? 'All Products'
                : currentCat
            }
          />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
