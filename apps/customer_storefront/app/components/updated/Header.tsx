'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MagnifyingGlass, Heart, ArrowLeft, X, CaretDown, Phone, Tag, MapPin, List } from '@phosphor-icons/react';
import { HeaderCartButton } from '../HeaderCartButton';
import { HeaderFilters } from '../HeaderFilters';
import { SearchSuggestions } from './SearchSuggestions';
import { Logo } from '../ui/Logo';
import { CATEGORY_GROUPS } from '../../lib/types';

export interface HeaderProps {
  className?: string;
}

export interface CategoryOption {
  slug: string;
  label: string;
  emoji: string;
}

export interface PromoCodeItem {
  code: string;
  text: string;
}

const PROMO_CODES: PromoCodeItem[] = [
  { code: 'LUCKY500', text: 'Free delivery on orders over ৳500' },
  { code: 'WELCOME10', text: '10% OFF your first order with code WELCOME10' },
];

export function Header({ className = '' }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isFilterPage = pathname?.startsWith('/category') ?? false;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState<string[]>(['Eggs', 'Noodles', 'Milk', 'Rice', 'Cooking Oil', 'Bread']);

  const searchRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lucky_recent_searches');
    if (saved) {
      try {
        const searches: string[] = JSON.parse(saved);
        const timer = setTimeout(() => setRecentSearches(searches), 0);
        return () => clearTimeout(timer);
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  // Sync selectedCategory dropdown label with current URL pathname
  useEffect(() => {
    if (pathname?.startsWith('/category/')) {
      const slug = pathname.replace('/category/', '').split('/')[0];
      if (slug && CATEGORY_GROUPS.some((g) => g.slug === slug)) {
        setSelectedCategory(slug);
        return;
      }
    } else if (pathname === '/category') {
      setSelectedCategory('all');
    }
  }, [pathname]);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSuggestions(false);
        setIsCategoryDropdownOpen(false);
        setIsMobileSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      if (!recentSearches.includes(trimmed)) {
        const updated = [trimmed, ...recentSearches.slice(0, 4)];
        setRecentSearches(updated);
        localStorage.setItem('lucky_recent_searches', JSON.stringify(updated));
      }
      setShowSuggestions(false);
      setIsMobileSearchOpen(false);
      if (selectedCategory && selectedCategory !== 'all') {
        router.push(`/category/${encodeURIComponent(selectedCategory)}?q=${encodeURIComponent(trimmed)}`);
      } else {
        router.push(`/category?q=${encodeURIComponent(trimmed)}`);
      }
    } else if (selectedCategory && selectedCategory !== 'all') {
      setShowSuggestions(false);
      setIsMobileSearchOpen(false);
      router.push(`/category/${encodeURIComponent(selectedCategory)}`);
    } else {
      setShowSuggestions(false);
      setIsMobileSearchOpen(false);
      router.push('/category');
    }
  };

  const selectedCategoryLabel =
    selectedCategory === 'all'
      ? 'All Categories'
      : CATEGORY_GROUPS.find((g) => g.slug === selectedCategory)?.label || 'Category';

  // Early return for mobile search overlay state
  if (isMobileSearchOpen) {
    return (
      <header className={`sticky top-0 z-50 w-full bg-warm-bg border-b border-warm-border p-3 shadow-warm-md ${className}`}>
        <div className="flex items-center gap-2 relative w-full" ref={searchRef}>
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchOpen(false);
              setShowSuggestions(false);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-warm-fg bg-warm-surface border border-warm-border hover:bg-warm-bg transition-colors shrink-0"
            aria-label="Close search"
          >
            <ArrowLeft weight="bold" size={18} aria-hidden="true" />
          </button>

          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search products, brands, essentials..."
              className="w-full h-10 pl-4 pr-20 rounded-full bg-warm-surface border border-warm-accent focus:outline-none focus:ring-2 focus:ring-warm-accent/40 text-sm font-semibold transition-all shadow-inner"
              aria-label="Search products"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-10 top-3 text-warm-muted hover:text-warm-fg"
                aria-label="Clear search query"
              >
                <X weight="bold" size={14} aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 top-1 h-8 w-8 bg-warm-accent rounded-full flex items-center justify-center text-warm-fg hover:bg-warm-accent-hover transition-colors font-bold shadow-sm"
              aria-label="Submit search"
            >
              <MagnifyingGlass weight="bold" size={16} aria-hidden="true" />
            </button>
          </form>

          {showSuggestions && (
            <SearchSuggestions
              query={searchQuery}
              recentSearches={recentSearches}
              popularSearches={popularSearches}
              onSelect={(term: string) => {
                setSearchQuery(term);
                setShowSuggestions(false);
                setIsMobileSearchOpen(false);
                router.push(`/category?q=${encodeURIComponent(term)}`);
              }}
              onClose={() => {
                setShowSuggestions(false);
                setIsMobileSearchOpen(false);
              }}
            />
          )}
        </div>
      </header>
    );
  }

  return (
    <header className={`sticky top-0 z-50 w-full bg-warm-bg border-b border-warm-border/50 ${className}`}>
      {/* Top High-Density Utility Bar */}
      <div className="bg-[#0B0B0D] text-white border-b border-white/10 text-[11px] py-1.5 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-4 font-semibold">
          {/* Contact Details & Location */}
          <div className="flex items-center gap-4 text-white/80">
            <a href="tel:+8801731944544" className="flex items-center gap-1 hover:text-white transition-colors">
              <Phone weight="bold" size={13} className="text-[#f0c444]" aria-hidden="true" />
              <span>+880 1731-944544</span>
            </a>
            <span className="hidden sm:inline text-white/30">|</span>
            <span className="hidden sm:flex items-center gap-1 text-white/80">
              <MapPin weight="bold" size={13} className="text-[#f0c444]" aria-hidden="true" />
              <span>Chittagong Hub, BD</span>
            </span>
          </div>

          {/* Promotional Banner Code */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f0c444] text-[#0B0B0D] font-black text-[10px] uppercase tracking-wider">
              <Tag weight="bold" size={11} aria-hidden="true" /> PROMO
            </span>
            <span className="truncate max-w-[280px] sm:max-w-none text-white/90 font-semibold">
              {PROMO_CODES[0].text}
            </span>
          </div>

          {/* Customer Service & Currency */}
          <div className="hidden lg:flex items-center gap-4 text-white/80">
            <span>BDT (৳)</span>
            <span className="text-white/30">|</span>
            <Link href="/#how-it-works" className="hover:text-white transition-colors">
              Help Center
            </Link>
          </div>
        </div>
      </div>

      {/* Main Bar: Logo, Central Search + Category Dropdown, Actions */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <Logo />

        {/* Central Search with Responsive Category Dropdown (Desktop/Tablet) */}
        <div className="flex-1 max-w-2xl relative hidden md:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full bg-warm-surface border border-warm-border rounded-full shadow-warm-sm hover:shadow-warm-md focus-within:border-warm-accent transition-all duration-300">
            {/* Category Dropdown Toggle */}
            <div className="relative shrink-0 border-r border-warm-border" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="h-10 px-3.5 flex items-center gap-1.5 text-xs font-extrabold text-warm-fg hover:bg-warm-bg rounded-l-full transition-colors"
                aria-expanded={isCategoryDropdownOpen}
                aria-haspopup="menu"
              >
                <List weight="bold" size={14} className="text-warm-accent" aria-hidden="true" />
                <span className="max-w-[110px] truncate">{selectedCategoryLabel}</span>
                <CaretDown weight="bold" size={12} className="text-warm-muted" aria-hidden="true" />
              </button>

              {/* Category Dropdown Menu */}
              {isCategoryDropdownOpen && (
                <div className="absolute left-0 top-12 w-56 bg-warm-surface border border-warm-border rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setIsCategoryDropdownOpen(false);
                      router.push('/category');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                      selectedCategory === 'all' ? 'bg-warm-fg text-warm-accent' : 'text-warm-fg hover:bg-warm-bg'
                    }`}
                  >
                    📦 All Categories
                  </button>
                  <div className="my-1 border-t border-warm-border/40" />
                  <div className="max-h-60 overflow-y-auto scrollbar-hide space-y-0.5">
                    {CATEGORY_GROUPS.map((g) => (
                      <button
                        key={g.slug}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(g.slug);
                          setIsCategoryDropdownOpen(false);
                          router.push(`/category/${g.slug}`);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                          selectedCategory === g.slug ? 'bg-warm-fg text-warm-accent font-bold' : 'text-warm-fg hover:bg-warm-bg'
                        }`}
                      >
                        <span>{g.emoji}</span>
                        <span>{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Main Search Input */}
            <div className="flex-1 relative">
              <input
                name="q"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search 500+ groceries, daily essentials, brands..."
                className="w-full h-10 pl-3.5 pr-10 bg-transparent text-sm font-semibold outline-none text-warm-fg placeholder:text-warm-muted"
                aria-label="Search products"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-warm-muted hover:text-warm-fg"
                  aria-label="Clear search"
                >
                  <X weight="bold" size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Search Submit Button */}
            <button
              type="submit"
              className="h-9 w-9 my-0.5 mr-0.5 bg-warm-accent hover:bg-warm-accent-hover text-warm-fg rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm"
              aria-label="Submit search"
            >
              <MagnifyingGlass weight="bold" size={16} aria-hidden="true" />
            </button>
          </form>

          {/* Search Suggestions Modal */}
          {showSuggestions && (
            <SearchSuggestions
              query={searchQuery}
              recentSearches={recentSearches}
              popularSearches={popularSearches}
              onSelect={(term: string) => {
                setSearchQuery(term);
                setShowSuggestions(false);
                router.push(`/category?q=${encodeURIComponent(term)}`);
              }}
              onClose={() => setShowSuggestions(false)}
            />
          )}
        </div>

        {/* Right Actions: Search Mobile Icon, Wishlist, Cart */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mobile Search Button */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-warm-surface text-warm-fg transition-colors"
            onClick={() => {
              setIsMobileSearchOpen(true);
              setShowSuggestions(true);
            }}
            aria-label="Open search"
          >
            <MagnifyingGlass weight="bold" size={20} aria-hidden="true" />
          </button>

          {/* Wishlist Link */}
          <Link
            href="/wishlist"
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-warm-surface text-warm-fg transition-colors"
            aria-label="Wishlist"
          >
            <Heart weight="bold" size={20} aria-hidden="true" />
          </Link>

          {/* Cart Drawer Button */}
          <HeaderCartButton />
        </div>
      </div>

      {/* Category Pills Strip — on filter/catalog routes */}
      {isFilterPage && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-2">
          <nav className="flex flex-nowrap items-center overflow-x-auto h-[38px] gap-1.5 scrollbar-hide py-0.5">
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

      {/* Desktop Secondary Nav Bar */}
      <div className="hidden md:block border-t border-warm-border/30 bg-warm-surface/50 py-2 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-bold text-warm-fg">
          <nav className="flex items-center gap-6" aria-label="Secondary navigation">
            <Link href="/" className="hover:text-warm-muted transition-colors">Home</Link>
            <Link href="/category" className="hover:text-warm-muted transition-colors">Shop</Link>
            <Link href="/category?theme=deals" className="hover:text-warm-muted transition-colors">Deals</Link>
            <Link href="/category?theme=new" className="hover:text-warm-muted transition-colors">New Arrivals</Link>
            <Link href="/contact" className="hover:text-warm-muted transition-colors">Contact</Link>
            <Link href="/#how-it-works" className="hover:text-warm-muted transition-colors">How It Works</Link>
          </nav>

          <div className="flex items-center gap-4 text-warm-muted">
            <Link href="/category?theme=deals" className="text-warm-fg hover:underline font-extrabold flex items-center gap-1">
              <span>🔥</span> Weekly Deals
            </Link>
            <span className="text-warm-border">|</span>
            <a href="tel:+8801731944544" className="hover:text-warm-fg transition-colors flex items-center gap-1 font-semibold">
              <span>📞</span> +880 1731-944544
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
