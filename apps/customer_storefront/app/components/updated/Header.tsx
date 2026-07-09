'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HeaderCartButton } from '../HeaderCartButton';
import { HeaderFilters } from '../HeaderFilters';
import { SearchSuggestions } from './SearchSuggestions';
import { Logo } from '../ui/Logo';

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
        const searches = JSON.parse(saved);
        const timer = setTimeout(() => setRecentSearches(searches), 0);
        return () => clearTimeout(timer);
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
    <header className="sticky top-0 z-50 w-full px-3 sm:px-4 pt-3 pb-1 bg-warm-bg">
      <div className="max-w-5xl mx-auto h-[64px] bg-white border border-warm-border rounded-full flex items-center px-4 sm:px-6 justify-between gap-2 sm:gap-4 shadow-sm hover:shadow-md transition-all duration-300">
        {/* Logo */}
        <Logo />

        {/* Search */}
        <div className="flex-1 max-w-md relative hidden md:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              name="q"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search products, brands..."
              className="w-full h-10 pl-4 pr-11 rounded-full bg-warm-bg border border-warm-border focus:border-warm-accent focus:bg-white outline-none text-sm transition-all"
              aria-label="Search products"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 h-8 w-8 bg-warm-accent rounded-full flex items-center justify-center text-warm-fg hover:bg-warm-accent-hover transition-colors"
              aria-label="Search"
            >
              <span aria-hidden="true" className="text-sm">🔍</span>
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
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Mobile search icon button */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-warm-bg text-warm-fg transition-colors"
            onClick={() => router.push('/search')}
            aria-label="Search page"
          >
            <span aria-hidden="true" className="text-lg">🔍</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-full hover:bg-warm-bg transition-colors text-warm-fg"
            aria-label="Sign In"
          >
            <span aria-hidden="true" className="text-base">👤</span>
            <span className="hidden sm:block text-xs font-bold">Sign In</span>
          </button>
          <HeaderCartButton />
        </div>
      </div>

      {/* Category Pills Strip - Floating below the main nav bar */}
      <div className="max-w-5xl mx-auto mt-2 px-2">
        <nav className="flex flex-nowrap items-center overflow-x-auto h-[38px] gap-1.5 scrollbar-hide py-0.5">
          <Link
            href="/category?theme=deals"
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-warm-fg text-warm-accent text-xs font-bold hover:bg-warm-fg transition-colors"
          >
            Deals
          </Link>
          <Link
            href="/category?theme=bestsellers"
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white text-warm-fg border border-warm-border text-xs font-bold hover:bg-stone-50 transition-colors"
          >
            Best Sellers
          </Link>
          <div className="flex-1 min-w-0 flex items-center">
            <Suspense
              fallback={
                <div className="flex items-center gap-1.5">
                  <div className="h-[26px] w-14 rounded-full bg-white border border-warm-border animate-pulse flex-shrink-0" />
                  <div className="h-[26px] w-16 rounded-full bg-white border border-warm-border animate-pulse flex-shrink-0" />
                </div>
              }
            >
              <HeaderFilters />
            </Suspense>
          </div>
          <span className="hidden md:inline-flex items-center text-[10px] font-semibold text-warm-muted ml-auto whitespace-nowrap">
            Delivery in as soon as 1 hour
          </span>
        </nav>
      </div>
    </header>
  );
}
