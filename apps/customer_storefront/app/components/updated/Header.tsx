'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { HeaderCartButton } from '../HeaderCartButton';
import { HeaderFilters } from '../HeaderFilters';
import { SearchSuggestions } from './SearchSuggestions';

export function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState(['Eggs', 'Noodles', 'Milk', 'Rice', 'Cooking Oil', 'Bread']);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lucky_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      if (!recentSearches.includes(trimmed)) {
        const updated = [trimmed, ...recentSearches.slice(0, 4)];
        setRecentSearches(updated);
        localStorage.setItem('lucky_recent_searches', JSON.stringify(updated));
      }
      router.push(`/category?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex-shrink-0">
      {/* Top strip: logo + search + actions on warm neutral to reduce yellow fatigue */}
      <div className="h-[64px] bg-[#fffdf5] border-b border-[#e7e5e4] flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 min-h-[44px] flex-shrink-0">
          <Image
            src="/logo-mark.svg"
            alt="Lucky Store"
            width={34}
            height={34}
            className="rounded-full bg-[#ffe302]"
            priority
          />
          <span className="font-extrabold text-[15px] text-[#1c1917] hidden sm:block tracking-tight">
            Lucky Store
          </span>
        </Link>

        {/* Search */}
        <div className="flex-1 min-w-0 relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              name="q"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search products, brands..."
              className="w-full h-10 pl-4 pr-11 rounded-full bg-[#f5f5f4] border border-transparent focus:border-[#ffe302] focus:bg-white outline-none text-sm transition-all shadow-sm"
              aria-label="Search products"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 h-8 w-8 bg-[#ffe302] rounded-full flex items-center justify-center text-[#1c1917] hover:bg-[#ffec50] transition-colors"
              aria-label="Search"
            >
              <span aria-hidden="true" className="text-base">🔍</span>
            </button>
          </form>
          
          {showSuggestions && (
            <SearchSuggestions
              query={searchQuery}
              recentSearches={recentSearches}
              popularSearches={popularSearches}
              onSelect={(term) => {
                setSearchQuery(term);
                setShowSuggestions(false);
                router.push(`/category?q=${encodeURIComponent(term)}`);
              }}
              onClose={() => setShowSuggestions(false)}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            className="flex items-center gap-2 min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl hover:bg-[#f5f5f4] transition-colors"
            aria-label="Sign In"
          >
            <span aria-hidden="true" className="text-lg">👤</span>
            <span className="hidden lg:block text-sm font-medium">Sign In</span>
          </button>
          <HeaderCartButton />
        </div>
      </div>

      {/* Department Chips - Simplified for better performance */}
      <nav className="bg-[#ffe302] flex flex-nowrap items-center overflow-x-auto px-3 sm:px-4 py-2 md:py-0 h-[44px] gap-2 z-40 relative scrollbar-hide">
        <Link
          href="/category?theme=deals"
          className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#1c1917] text-[#ffe302] text-xs font-bold hover:bg-[#292524] transition-colors"
        >
          Deals
        </Link>
        <Link
          href="/category?theme=bestsellers"
          className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/70 text-[#1c1917] text-xs font-bold hover:bg-white transition-colors"
        >
          Best Sellers
        </Link>
        <div className="flex-1 min-w-0 flex items-center">
          <Suspense
            fallback={
              <div className="flex items-center gap-2">
                <div className="h-[28px] w-16 rounded-full bg-white/50 animate-pulse flex-shrink-0" />
                <div className="h-[28px] w-20 rounded-full bg-white/50 animate-pulse flex-shrink-0" />
                <div className="h-[28px] w-14 rounded-full bg-white/50 animate-pulse flex-shrink-0" />
              </div>
            }
          >
            <HeaderFilters />
          </Suspense>
        </div>
        <span className="hidden sm:inline-flex items-center text-[10px] sm:text-xs font-semibold text-[#1c1917]/80 ml-auto whitespace-nowrap">
          Delivery in as soon as 1 hour
        </span>
      </nav>
    </header>
  );
}
