import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { HeroBanner } from './HeroBanner';
import { CategoryGrid } from './CategoryGrid';
import { PromoGrid } from './PromoGrid';
import { SocialCarousel } from './SocialCarousel';
import { HomeCarouselClient } from './HomeCarouselClient';
import type { Product } from '../lib/types';

interface HomeShellProps {
  products: Product[];
  categories: { id: string; slug: string; name: string; emoji: string }[];
}

export function HomeShell({ products, categories }: HomeShellProps) {
  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 xl:px-10">
          <HeroBanner
            title="Free Delivery on orders ৳500+"
            subtitle="Cash on delivery. No app download needed."
            badge="Week 1 Launch"
            bgGradient="from-[#FFF34D] to-[#C4C087]"
          />

          <CategoryGrid categories={categories} />
          <PromoGrid />
          <HomeCarouselClient title="Popular Now" products={products.slice(0, 12)} />
          <SocialCarousel />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
