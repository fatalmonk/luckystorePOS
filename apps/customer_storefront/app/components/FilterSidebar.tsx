'use client'; // filter sidebar with URL searchParams, router, and accordion state

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface FilterSidebarProps {
  categories: { id: string; slug: string; name: string; emoji: string }[];
  activeFilters: {
    brands?: string[];
    availability?: string[];
    sort?: string;
    cat?: string;
    theme?: string;
    q?: string;
  };
  onFilterChange: (filters: Record<string, string | undefined>) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

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
    availability: true,
    sort: true,
  });

  // Close mobile sheet on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === sheetRef.current) {
      if (onMobileClose) onMobileClose();
    }
  };

  // Handle filter changes
  const handleCategoryChange = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // remove category from query params
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
      <div className="border-t border-[#e7e5e4] pt-4 first:border-0 first:pt-0">
        <button
          onClick={() => setAccordionOpen((prev) => ({ ...prev, [id]: !isOpen }))}
          className="flex items-center justify-between w-full py-2 font-semibold text-[#1c1917] min-h-[44px]"
        >
          <span>{title}</span>
          <span className={`text-xl transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {isOpen && <div className="mt-3 space-y-2 animate-fade-up">{children}</div>}
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
    <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 rounded border-2 border-[#e7e5e4] text-[#ffe302] focus:ring-2 focus:ring-[#ffe302] focus:ring-offset-2 accent-[#ffe302]"
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
    <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
      <input
        type="radio"
        name={`filter-${label}`}
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 text-[#ffe302] border-2 border-[#e7e5e4] focus:ring-2 focus:ring-[#ffe302] focus:ring-offset-2"
      />
      <span className="text-sm text-[#44403c]">{label}</span>
    </label>
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
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#d6d3d1] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-[#f5f5f4]">
          <h2 className="text-lg font-extrabold tracking-tight">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="text-sm font-medium text-[#ffe302] hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <AccordionSection id="category" title="Category">
            {categories.map((cat) => (
              <FilterOption
                key={cat.id}
                label={cat.name}
                checked={activeFilters.cat === cat.slug}
                onChange={() => handleCategoryChange(cat.slug)}
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
        </div>

        {/* Apply button (sticky bottom) */}
        <div className="border-t border-[#f5f5f4] p-4">
          <button
            onClick={() => onMobileClose?.()}
            className="w-full h-[50px] bg-[#ffe302] text-[#1c1917] rounded-full font-bold text-base hover:bg-[#ffec50] transition-colors press-feedback"
          >
            Show Results
          </button>
        </div>
      </aside>
    </div>
  );

  // Desktop Sidebar
  const desktopSidebar = (
    <aside className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-[140px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="text-sm font-medium text-[#ffe302] hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="space-y-6">
          <AccordionSection id="category" title="Category">
            {categories.map((cat) => (
              <FilterOption
                key={cat.id}
                label={cat.name}
                checked={activeFilters.cat === cat.slug}
                onChange={() => handleCategoryChange(cat.slug)}
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
        </div>
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