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
  const popular = products.slice(0, 20);
  const deals = products.filter((p) => (p.originalPrice ?? 0) > p.price).slice(0, 20);
  const under100 = products.filter((p) => p.price < 100).slice(0, 20);
  const under300 = products.filter((p) => p.price < 300).slice(0, 20);
  const bestSellers = products.filter((p) => p.stock > 20).slice(0, 20);
  const newArrivals = [...products].reverse().slice(0, 20);

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 xl:px-10 space-y-6">
          <CategoryGrid categories={categories} showThematic />
          <HeroBanner
            title="Free Delivery on orders ৳500+"
            subtitle="Cash on delivery. No app download needed."
            badge="Week 1 Launch"
            bgGradient="from-[#ffe302] to-[#fff8c0]"
          />
          <PromoGrid />
          <HomeCarouselClient title="Popular Now" products={popular} />
          {deals.length > 0 && <HomeCarouselClient title="Deals & Rollbacks" products={deals} />}
          {newArrivals.length > 0 && <HomeCarouselClient title="New Arrivals" products={newArrivals} />}
          {bestSellers.length > 0 && <HomeCarouselClient title="Best Sellers" products={bestSellers} />}
          {under100.length > 0 && <HomeCarouselClient title="Under ৳100" products={under100} />}
          {under300.length > 0 && <HomeCarouselClient title="Under ৳300" products={under300} />}
          <SocialCarousel />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
