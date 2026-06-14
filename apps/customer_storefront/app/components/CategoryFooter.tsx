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
          <details className="group rounded-lg border border-[#e7e5e4] bg-white">
            <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-medium text-[#44403c]">
              How do I pick snacks for a party?
              <span className="text-lg transition-transform group-open:rotate-180">▼</span>
            </summary>
            <p className="px-3 pb-3 text-xs text-[#78716c]">
              Consider a mix of sweet and savory options. Chips, cookies, and fruit snacks are crowd
              pleasers. Order 2-3 varieties per 10 guests.
            </p>
          </details>
          <details className="group rounded-lg border border-[#e7e5e4] bg-white">
            <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-medium text-[#44403c]">
              How should I store opened chips?
              <span className="text-lg transition-transform group-open:rotate-180">▼</span>
            </summary>
            <p className="px-3 pb-3 text-xs text-[#78716c]">
              Seal tightly in the original bag with a clip, or transfer to an airtight container.
              Store in a cool, dry place away from sunlight.
            </p>
          </details>
        </div>
      </div>

      {/* Related links */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#1c1917] mb-3">Related categories</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#0071DC]">
          <button onClick={() => router.push('/category/snacks')} className="hover:underline">
            Snacks
          </button>
          <button onClick={() => router.push('/category/beverages')} className="hover:underline">
            Beverages
          </button>
          <button onClick={() => router.push('/category/grocery')} className="hover:underline">
            Grocery
          </button>
          <button onClick={() => router.push('/category/produce')} className="hover:underline">
            Fresh Produce
          </button>
        </div>
      </div>

      {/* Corporate links */}
      <div className="pt-4 border-t border-[#e7e5e4] text-[10px] text-[#a8a29e] flex flex-wrap gap-x-3 gap-y-1">
        <span>© Lucky Store</span>
        <a href="#" className="hover:underline">Terms of Use</a>
        <a href="#" className="hover:underline">Privacy</a>
        <a href="#" className="hover:underline">Contact</a>
      </div>
    </footer>
  );
}
