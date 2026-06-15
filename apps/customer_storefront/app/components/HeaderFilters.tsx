'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const priceRanges = [
  { value: '0-100', label: 'Under ৳100' },
  { value: '100-500', label: '৳100 – ৳500' },
  { value: '500-1000', label: '৳500 – ৳1000' },
  { value: '1000-999999', label: '৳1000+' },
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

export function HeaderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [openDropdown, setOpenDropdown] = useState<'price' | 'availability' | 'sort' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isFilterPage = pathname.startsWith('/category') || pathname === '/search';
  const targetPath = isFilterPage ? pathname : '/category';

  // Active filters extraction
  const activePriceParam = searchParams.get('price') || '';
  const activePrices = activePriceParam ? activePriceParam.split(',') : [];

  const activeAvailabilityParam = searchParams.get('availability') || '';
  const activeAvailabilities = activeAvailabilityParam ? activeAvailabilityParam.split(',') : [];

  const activeSort = searchParams.get('sort') || 'best';

  const handlePriceToggle = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const updated = activePrices.includes(value)
      ? activePrices.filter((v) => v !== value)
      : [...activePrices, value];
    
    if (updated.length) {
      params.set('price', updated.join(','));
    } else {
      params.delete('price');
    }
    router.push(`${targetPath}?${params.toString()}`, { scroll: false });
  };

  const handleAvailabilityToggle = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const updated = activeAvailabilities.includes(value)
      ? activeAvailabilities.filter((v) => v !== value)
      : [...activeAvailabilities, value];

    if (updated.length) {
      params.set('availability', updated.join(','));
    } else {
      params.delete('availability');
    }
    router.push(`${targetPath}?${params.toString()}`, { scroll: false });
  };

  const handleSortSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'best') {
      params.delete('sort');
    } else {
      params.set('sort', value);
    }
    router.push(`${targetPath}?${params.toString()}`, { scroll: false });
    setOpenDropdown(null);
  };

  const clearFilter = (type: 'price' | 'availability' | 'sort') => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(type);
    router.push(`${targetPath}?${params.toString()}`, { scroll: false });
  };

  return (
    <div ref={containerRef} className="flex items-center gap-2 z-30">
      {/* Divider */}
      <div className="h-5 w-[1px] bg-[#1c1917]/20 mx-1 hidden sm:block" />

      {/* Price Filter Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === 'price' ? null : 'price')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all min-h-[32px] ${
            activePrices.length > 0
              ? 'bg-[#1c1917] text-[#ffe302]'
              : 'bg-white/70 text-[#1c1917] hover:bg-white'
          }`}
        >
          <span>Price</span>
          {activePrices.length > 0 && (
            <span className="bg-[#ffe302] text-[#1c1917] w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black">
              {activePrices.length}
            </span>
          )}
          <span className="text-[10px]">▼</span>
        </button>

        {openDropdown === 'price' && (
          <div className="absolute left-0 mt-1.5 w-56 rounded-2xl bg-white border border-[#e7e5e4] shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#f5f5f4]">
              <span className="text-xs font-extrabold text-[#78716c]">Price Range</span>
              {activePrices.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearFilter('price')}
                  className="text-[10px] font-bold text-red-500 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1">
              {priceRanges.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-[#f5f5f4] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={activePrices.includes(opt.value)}
                    onChange={() => handlePriceToggle(opt.value)}
                    className="w-4 h-4 rounded border-2 border-[#d6d3d1] text-[#1c1917] accent-[#1c1917] focus:ring-1 focus:ring-[#ffe302]"
                  />
                  <span className="text-xs font-semibold text-[#44403c]">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Availability Filter Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === 'availability' ? null : 'availability')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all min-h-[32px] ${
            activeAvailabilities.length > 0
              ? 'bg-[#1c1917] text-[#ffe302]'
              : 'bg-white/70 text-[#1c1917] hover:bg-white'
          }`}
        >
          <span>Availability</span>
          {activeAvailabilities.length > 0 && (
            <span className="bg-[#ffe302] text-[#1c1917] w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black">
              {activeAvailabilities.length}
            </span>
          )}
          <span className="text-[10px]">▼</span>
        </button>

        {openDropdown === 'availability' && (
          <div className="absolute left-0 mt-1.5 w-52 rounded-2xl bg-white border border-[#e7e5e4] shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#f5f5f4]">
              <span className="text-xs font-extrabold text-[#78716c]">Stock Status</span>
              {activeAvailabilities.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearFilter('availability')}
                  className="text-[10px] font-bold text-red-500 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1">
              {availabilityOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-[#f5f5f4] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={activeAvailabilities.includes(opt.value)}
                    onChange={() => handleAvailabilityToggle(opt.value)}
                    className="w-4 h-4 rounded border-2 border-[#d6d3d1] text-[#1c1917] accent-[#1c1917] focus:ring-1 focus:ring-[#ffe302]"
                  />
                  <span className="text-xs font-semibold text-[#44403c]">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sort By Filter Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all min-h-[32px] ${
            activeSort !== 'best'
              ? 'bg-[#1c1917] text-[#ffe302]'
              : 'bg-white/70 text-[#1c1917] hover:bg-white'
          }`}
        >
          <span>Sort By</span>
          {activeSort !== 'best' && (
            <span className="bg-[#ffe302] text-[#1c1917] px-1.5 py-0.5 rounded-full text-[9px] font-extrabold">
              {sortOptions.find((o) => o.value === activeSort)?.label.split(':')[0] || 'Active'}
            </span>
          )}
          <span className="text-[10px]">▼</span>
        </button>

        {openDropdown === 'sort' && (
          <div className="absolute right-0 sm:left-0 mt-1.5 w-56 rounded-2xl bg-white border border-[#e7e5e4] shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#f5f5f4]">
              <span className="text-xs font-extrabold text-[#78716c]">Sort Options</span>
              {activeSort !== 'best' && (
                <button
                  type="button"
                  onClick={() => handleSortSelect('best')}
                  className="text-[10px] font-bold text-red-500 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="space-y-1">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSortSelect(opt.value)}
                  className={`w-full text-left flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors text-xs font-semibold ${
                    activeSort === opt.value
                      ? 'bg-[#ffe302]/20 text-[#1c1917]'
                      : 'text-[#44403c] hover:bg-[#f5f5f4]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {activeSort === opt.value && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
