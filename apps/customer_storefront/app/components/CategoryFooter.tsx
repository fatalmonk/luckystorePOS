'use client'; // interactive footer with router navigation and accordion state

import { useRouter } from 'next/navigation';
import { formatBdt } from '../lib/formatPrice';

interface CategoryFooterProps {
  categorySlug: string;
  categoryName: string;
}

const PRICE_BUCKETS = [
  { label: `${formatBdt(100)} & under`, max: 100 },
  { label: `${formatBdt(300)} & under`, max: 300 },
  { label: `${formatBdt(500)} & under`, max: 500 },
];

const TOP_BRANDS = ['Aarong', 'Pran', 'Ruchi', 'Square'];

export function CategoryFooter({ categorySlug, categoryName }: CategoryFooterProps) {
  const router = useRouter();

  return (
    <footer className="mt-8 border-t border-[#e7e5e4] pt-6 pb-8 px-3 sm:px-4 lg:px-6">
      {/* Shop by price */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-[#1c1917] mb-3">
          Shop {categoryName} by price
        </h3>
        <div className="flex flex-wrap gap-2">
          {PRICE_BUCKETS.map((bucket) => (
            <button
              key={bucket.max}
              onClick={() =>
                router.push(`/category/${categorySlug}?sort=price_asc&max=${bucket.max}`)
              }
              className="px-3 py-1.5 min-h-[44px] rounded-full bg-[#f5f5f4] text-sm font-medium text-[#44403c] hover:bg-[#e7e5e4] transition-colors"
            >
              {bucket.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shop top brands */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-[#1c1917] mb-3">Shop top brands</h3>
        <div className="flex flex-wrap gap-2">
          {TOP_BRANDS.map((brand) => (
            <button
              key={brand}
              onClick={() => router.push(`/category/${categorySlug}?brand=${brand}`)}
              className="px-3 py-1.5 min-h-[44px] rounded-full bg-[#f5f5f4] text-sm font-medium text-[#44403c] hover:bg-[#e7e5e4] transition-colors"
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-[#1c1917] mb-3">Frequently asked questions</h3>
        <div className="space-y-2">
          <details className="group rounded-xl border border-[#e7e5e4] bg-white overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-medium text-[#44403c] list-none">
              How fast is delivery?
              <span className="text-lg transition-transform group-open:rotate-180">▼</span>
            </summary>
            <p className="px-3 pb-3 text-xs text-[#78716c] leading-relaxed">
              We deliver in as soon as 1 hour across Chittagong. Same-day delivery is available for orders placed before 6 PM.
            </p>
          </details>
          <details className="group rounded-xl border border-[#e7e5e4] bg-white overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-medium text-[#44403c] list-none">
              What is your return policy?
              <span className="text-lg transition-transform group-open:rotate-180">▼</span>
            </summary>
            <p className="px-3 pb-3 text-xs text-[#78716c] leading-relaxed">
              Report damaged or incorrect items within 24 hours of delivery. We’ll replace the item or refund you promptly.
            </p>
          </details>
          <details className="group rounded-xl border border-[#e7e5e4] bg-white overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-medium text-[#44403c] list-none">
              How do I pay?
              <span className="text-lg transition-transform group-open:rotate-180">▼</span>
            </summary>
            <p className="px-3 pb-3 text-xs text-[#78716c] leading-relaxed">
              Cash on delivery is available for all orders. Digital payment options are coming soon.
            </p>
          </details>
        </div>
      </div>

      {/* Related links */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#1c1917] mb-3">Related categories</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#44403c]">
          <button onClick={() => router.push('/category/snacks')} className="hover:text-[#1c1917] hover:underline">
            Snacks
          </button>
          <button onClick={() => router.push('/category/beverages')} className="hover:text-[#1c1917] hover:underline">
            Beverages
          </button>
          <button onClick={() => router.push('/category/grocery')} className="hover:text-[#1c1917] hover:underline">
            Grocery
          </button>
          <button onClick={() => router.push('/category/produce')} className="hover:text-[#1c1917] hover:underline">
            Fresh Produce
          </button>
        </div>
      </div>

      {/* Corporate links */}
      <div className="pt-4 border-t border-[#e7e5e4] text-[10px] text-[#a8a29e] flex flex-wrap gap-x-3 gap-y-1">
        <span>© {new Date().getFullYear()} Lucky Store</span>
        <a href="#" className="hover:text-[#78716c] transition-colors">Terms of Use</a>
        <a href="#" className="hover:text-[#78716c] transition-colors">Privacy</a>
        <a href="#" className="hover:text-[#78716c] transition-colors">Contact</a>
      </div>
    </footer>
  );
}
