import { Header } from './updated/Header';
import { CategoryGrid } from './updated/CategoryGrid';
import { HomeSectionsClient } from './HomeSectionsClient';
import { BottomNav } from './BottomNav';
import { TruckIcon, CashIcon, ReturnIcon, LockIcon } from './icons';
import type { Product } from '../lib/types';

interface HomeShellProps {
  products: Product[];
  categories: { id: string; slug: string; name: string; emoji: string }[];
}

export function HomeShell({ products, categories }: HomeShellProps) {
  const MAX_SECTION_ITEMS = 20;

  const popular = products.slice(0, MAX_SECTION_ITEMS);
  const deals = products.filter((p) => (p.originalPrice ?? 0) > p.price).slice(0, MAX_SECTION_ITEMS);
  const bestSellers = products.filter((p) => p.stock > 20).slice(0, MAX_SECTION_ITEMS);

  const sections = [
    { title: 'Popular Now', href: '/category?sort=popular', products: popular },
    ...(deals.length > 0 ? [{ title: '🔥 Hot Deals', href: '/category?theme=deals', products: deals }] : []),
    ...(bestSellers.length > 0 ? [{ title: '⭐ Best Sellers', href: '/category?theme=bestsellers', products: bestSellers }] : []),
  ];

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="p-4 sm:p-6 space-y-8">
          <CategoryGrid categories={categories} />
          <HomeSectionsClient sections={sections} />

          {/* Trust reassurance */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="bg-white rounded-xl p-4 border border-[#e7e5e4] shadow-sm flex items-center gap-3">
              <span className="inline-flex" aria-hidden="true"><TruckIcon size={24} className="text-[#1c1917]" /></span>
              <div>
                <p className="text-xs font-bold text-[#1c1917]">Free Delivery</p>
                <p className="text-[10px] text-[#78716c]">On orders ৳500+</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#e7e5e4] shadow-sm flex items-center gap-3">
              <span className="inline-flex" aria-hidden="true"><CashIcon size={24} className="text-[#1c1917]" /></span>
              <div>
                <p className="text-xs font-bold text-[#1c1917]">Cash on Delivery</p>
                <p className="text-[10px] text-[#78716c]">Pay when you receive</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#e7e5e4] shadow-sm flex items-center gap-3">
              <span className="inline-flex" aria-hidden="true"><ReturnIcon size={24} className="text-[#1c1917]" /></span>
              <div>
                <p className="text-xs font-bold text-[#1c1917]">Easy Returns</p>
                <p className="text-[10px] text-[#78716c]">7-day return policy</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#e7e5e4] shadow-sm flex items-center gap-3">
              <span className="inline-flex" aria-hidden="true"><LockIcon size={24} className="text-[#1c1917]" /></span>
              <div>
                <p className="text-xs font-bold text-[#1c1917]">100% Secure</p>
                <p className="text-[10px] text-[#78716c]">Protected payments</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
