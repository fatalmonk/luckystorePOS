'use client'; // filter sidebar with URL searchParams, router, and accordion state

import { useState, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface FilterSidebarProps {
  categories: { id: string; slug: string; name: string; emoji: string }[];
  activeFilters: {
    brands?: string[];
    availability?: string[];
    price?: string[];
    sort?: string;
    cat?: string;
    theme?: string;
    q?: string;
  };
  onFilterChange: (filters: Record<string, string | undefined>) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const priceRanges = [
  { value: '0,100', label: 'Under ৳100' },
  { value: '100,500', label: '৳100 – ৳500' },
  { value: '500,1000', label: '৳500 – ৳1000' },
  { value: '1000,999999', label: '৳1000+' },
];

const availabilityOptions = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock (≤5)' },
];

const sortOptions = [
  { value: 'best', label: 'Best Match' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

export function FilterSidebar({
  categories,
  activeFilters,
  onFilterChange,
  mobileOpen = false,
  onMobileClose,
}: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [accordionOpen, setAccordionOpen] = useState<Record<string, boolean>>({
    category: true,
    price: true,
    availability: true,
    sort: true,
  });

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === sheetRef.current) {
      onMobileClose?.();
    }
  };

  const handleCategoryChange = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('cat');
    onFilterChange(Object.fromEntries(params));
    const queryString = params.toString();
    if (slug) {
      router.push(queryString ? `/category/${slug}?${queryString}` : `/category/${slug}`, { scroll: false });
    } else {
      router.push(queryString ? `/category?${queryString}` : `/category`, { scroll: false });
    }
  };

  const handleAvailabilityChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get('availability')?.split(',') || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    if (updated.length) {
      params.set('availability', updated.join(','));
    } else {
      params.delete('availability');
    }
    onFilterChange(Object.fromEntries(params));
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const handlePriceChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get('price')?.split(',') || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    if (updated.length) {
      params.set('price', updated.join(','));
    } else {
      params.delete('price');
    }
    onFilterChange(Object.fromEntries(params));
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'best') {
      params.delete('sort');
    } else {
      params.set('sort', value);
    }
    onFilterChange(Object.fromEntries(params));
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const handleClearAll = () => {
    router.push(pathname, { scroll: false });
  };

  const hasActiveFilters = Object.values(activeFilters).some(
    (v) => v && (Array.isArray(v) ? v.length > 0 : v !== '')
  );

  const AccordionSection = ({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
  }) => {
    const isOpen = accordionOpen[id];
    return (
      <div className="border-t border-[#e7e5e4] pt-3 first:border-0 first:pt-0">
        <button
          onClick={() => setAccordionOpen((prev) => ({ ...prev, [id]: !isOpen }))}
          className="flex items-center justify-between w-full py-2 font-bold text-[15px] text-[#1c1917] min-h-[44px]"
        >
          <span>{title}</span>
          <span className={`text-lg transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {isOpen && <div className="mt-1 space-y-1 animate-fade-up">{children}</div>}
      </div>
    );
  };

  const FilterOption = ({
    label,
    checked,
    onChange,
    count,
  }: {
    label: string;
    checked: boolean;
    onChange: () => void;
    count?: number;
  }) => (
    <label className="flex items-center gap-3 cursor-pointer min-h-[40px] py-1.5 rounded-lg hover:bg-[#f5f5f4] px-1 -mx-1 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-[18px] h-[18px] rounded border-2 border-[#d6d3d1] text-[#1c1917] focus:ring-2 focus:ring-[#ffe302] focus:ring-offset-1 accent-[#1c1917]"
      />
      <span className="text-sm text-[#44403c]">{label}</span>
      {count !== undefined && (
        <span className="ml-auto text-xs text-[#a8a29e] bg-[#f5f5f4] px-2 py-0.5 rounded">{count}</span>
      )}
    </label>
  );

  const RadioOption = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <label className="flex items-center gap-3 cursor-pointer min-h-[40px] py-1.5 rounded-lg hover:bg-[#f5f5f4] px-1 -mx-1 transition-colors">
      <input
        type="radio"
        name="filter-sort"
        checked={checked}
        onChange={onChange}
        className="w-[18px] h-[18px] text-[#1c1917] border-2 border-[#d6d3d1] focus:ring-2 focus:ring-[#ffe302] focus:ring-offset-1"
      />
      <span className="text-sm text-[#44403c]">{label}</span>
    </label>
  );

  const CategoryItem = ({
    label,
    emoji,
    checked,
    onChange,
  }: {
    label: string;
    emoji?: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <button
      type="button"
      onClick={onChange}
      className={`w-full flex items-center gap-2.5 min-h-[40px] py-2 px-2.5 -mx-2.5 rounded-lg text-left text-sm transition-colors ${
        checked ? 'bg-[#fff8c0] text-[#1c1917] font-bold' : 'text-[#44403c] hover:bg-[#f5f5f4]'
      }`}
    >
      <span className="text-base" aria-hidden="true">{emoji || '📦'}</span>
      <span>{label}</span>
    </button>
  );

  const filterContent = (
    <>
      <AccordionSection id="category" title="Category">
        {categories.map((cat) => (
          <CategoryItem
            key={cat.id}
            label={cat.name}
            emoji={cat.emoji}
            checked={activeFilters.cat === cat.slug}
            onChange={() => handleCategoryChange(cat.slug)}
          />
        ))}
      </AccordionSection>

      <AccordionSection id="price" title="Price Range">
        {priceRanges.map((opt) => (
          <FilterOption
            key={opt.value}
            label={opt.label}
            checked={activeFilters.price?.includes(opt.value) || false}
            onChange={() => handlePriceChange(opt.value)}
          />
        ))}
      </AccordionSection>

      <AccordionSection id="availability" title="Availability">
        {availabilityOptions.map((opt) => (
          <FilterOption
            key={opt.value}
            label={opt.label}
            checked={activeFilters.availability?.includes(opt.value) || false}
            onChange={() => handleAvailabilityChange(opt.value)}
          />
        ))}
      </AccordionSection>

      <AccordionSection id="sort" title="Sort By">
        {sortOptions.map((opt) => (
          <RadioOption
            key={opt.value}
            label={opt.label}
            checked={
              activeFilters.sort === opt.value || (!activeFilters.sort && opt.value === 'best')
            }
            onChange={() => handleSortChange(opt.value)}
          />
        ))}
      </AccordionSection>
    </>
  );

  // Mobile Bottom Sheet
  const mobileSheet = (
    <div
      ref={sheetRef}
      className={`fixed inset-0 z-50 lg:hidden flex transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/50" />
      <aside
        className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-[24px] shadow-[0_-8px_40px_rgba(28,25,23,0.15)] flex flex-col transform transition-transform duration-300 ease-out"
        style={{ transform: mobileOpen ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#d6d3d1] rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 pb-3 border-b border-[#f5f5f4]">
          <h2 className="text-lg font-extrabold tracking-tight">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="text-sm font-bold text-[#1c1917] hover:text-[#44403c] transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {filterContent}
        </div>

        <div className="border-t border-[#f5f5f4] p-4">
          <button
            onClick={() => onMobileClose?.()}
            className="w-full h-[50px] bg-[#1c1917] text-[#ffe302] rounded-full font-bold text-base hover:bg-[#292524] transition-colors press-feedback"
          >
            Show Results
          </button>
        </div>
      </aside>
    </div>
  );

  // Desktop Sidebar
  const desktopSidebar = (
    <aside className="hidden lg:block w-60 flex-shrink-0">
      <div className="sticky top-[120px]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-lg tracking-tight">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="text-sm font-bold text-[#1c1917] hover:text-[#44403c] transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="space-y-2">{filterContent}</div>
      </div>
    </aside>
  );

  return (
    <>
      {mobileSheet}
      {desktopSidebar}
    </>
  );
}
