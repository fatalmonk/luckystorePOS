'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MagnifyingGlass, User, Heart } from '@phosphor-icons/react';
import { HeaderCartButton } from '../HeaderCartButton';
import { HeaderFilters } from '../HeaderFilters';
import { SearchSuggestions } from './SearchSuggestions';
import { Logo } from '../ui/Logo';
import { getLocalWishlist } from '../../lib/wishlistHelpers';
import { useAuth } from '../providers/AuthProvider';

export function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const pathname = usePathname();
  const isFilterPage = pathname?.startsWith('/category') ?? false;
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
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

  // Sync wishlist count from local cache
  useEffect(() => {
    const updateWishlistCount = () => setWishlistCount(getLocalWishlist().length);
    updateWishlistCount();
    window.addEventListener('storage', updateWishlistCount);
    return () => window.removeEventListener('storage', updateWishlistCount);
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
    <header className="sticky top-0 z-50 w-full px-3 sm:px-4 pt-2 pb-0 bg-warm-bg">
      <div className="max-w-5xl mx-auto h-[52px] sm:h-[56px] bg-warm-surface border border-warm-border rounded-full flex items-center px-3 sm:px-5 justify-between gap-1.5 sm:gap-3 shadow-warm-sm hover:shadow-warm-md transition-all duration-300">
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
              className="w-full h-9 pl-3.5 pr-10 rounded-full bg-warm-bg border border-warm-border focus:border-warm-accent focus:bg-white outline-none text-sm transition-all"
              aria-label="Search products"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 h-7 w-7 bg-warm-accent rounded-full flex items-center justify-center text-warm-fg hover:bg-warm-accent-hover transition-colors"
              aria-label="Search"
            >
              <MagnifyingGlass weight="bold" size={14} aria-hidden="true" />
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
        <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
          {/* Mobile search icon button */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full hover:bg-warm-bg text-warm-fg transition-colors"
            onClick={() => router.push('/search')}
            aria-label="Search page"
          >
            <MagnifyingGlass weight="bold" size={20} aria-hidden="true" />
          </button>

          <Link
            href={user ? "/profile" : "/login"}
            className="flex items-center gap-1.5 min-h-[36px] sm:min-h-[40px] px-2 sm:px-3 py-1.5 rounded-full hover:bg-warm-bg transition-colors text-warm-fg"
            aria-label={user ? "Profile" : "Sign In"}
          >
            <User weight="bold" size={14} className="sm:size-4" aria-hidden="true" />
            <span className="hidden sm:block text-xs font-bold">
              {user ? (user.user_metadata?.full_name?.split(' ')[0] || 'Profile') : 'Sign In'}
            </span>
          </Link>

          {/* Wishlist */}
          <Link
            href="/wishlist"
            className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-warm-bg transition-colors text-warm-fg"
            aria-label="Wishlist"
          >
            <Heart weight="bold" size={16} aria-hidden="true" />
            {wishlistCount > 0 && (
              <span className="absolute top-0 right-0 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[8px] font-bold grid place-items-center border-2 border-white">
                {wishlistCount}
              </span>
            )}
          </Link>

          <HeaderCartButton />
        </div>
      </div>

      {/* Category Pills Strip — only on category/search pages */}
      {isFilterPage && (
        <div className="max-w-5xl mx-auto mt-2 px-2">
          <nav className="flex flex-nowrap items-center overflow-x-auto h-[38px] gap-1.5 scrollbar-hide py-0.5">
            <>
              <Link
                href="/category?theme=deals"
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-warm-fg text-warm-accent text-xs font-bold hover:bg-warm-fg transition-colors"
              >
                Deals
              </Link>
              <Link
                href="/category?theme=bestsellers"
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-warm-surface text-warm-fg border border-warm-border text-xs font-bold hover:bg-warm-bg transition-colors"
              >
                Best Sellers
              </Link>
            </>

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
          </nav>
        </div>
      )}
    </header>
  );
}
