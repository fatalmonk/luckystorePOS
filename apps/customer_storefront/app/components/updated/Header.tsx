'use client';

import React, { useCallback, useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MagnifyingGlass, Heart, ArrowLeft, X, CaretDown, CaretRight, Phone, Tag, MapPin, List, Sun, Moon } from '@phosphor-icons/react';
import { AppDrawer } from '../AppDrawer';
import { DesktopQuickRail } from '../DesktopQuickRail';
import { HeaderCartButton } from '../HeaderCartButton';
import { HeaderFilters } from '../HeaderFilters';
import { SearchSuggestions } from './SearchSuggestions';
import { Logo } from '../ui/Logo';
import { CATEGORY_GROUPS } from '../../lib/types';
import { useTheme } from '../providers/ThemeProvider';

export interface HeaderProps {
  className?: string;
}

export interface CategoryOption {
  slug: string;
  label: string;
  emoji: string;
}

const PROMO_TEXT = 'Free delivery on orders over ৳500';

export function Header({ className = '' }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isFilterPage = pathname?.startsWith('/category') ?? false;
  const isHomePage = pathname === '/';
  const showDesktopCategories = isHomePage || isFilterPage;
  const isDistractionFreePage = ['/checkout', '/login', '/signup'].some((path) =>
    pathname?.startsWith(path),
  );
  const { theme, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState<string[]>(['Eggs', 'Noodles', 'Milk', 'Rice', 'Cooking Oil', 'Bread']);

  const searchRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const desktopCategoriesRef = useRef<HTMLElement>(null);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lucky_recent_searches');
      if (saved) {
        const searches: string[] = JSON.parse(saved);
        const timer = setTimeout(() => setRecentSearches(searches), 0);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Recent searches are unavailable', error);
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
    } else {
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
        try {
          localStorage.setItem('lucky_recent_searches', JSON.stringify(updated));
        } catch (error) {
          console.error('Recent searches could not be saved', error);
        }
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-warm-border bg-warm-surface text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
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
              className="h-11 w-full rounded-full border border-warm-accent bg-warm-surface pl-4 pr-24 text-sm font-semibold shadow-inner transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent/40"
              aria-label="Search products"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                  className="absolute right-11 top-0 flex h-11 w-11 items-center justify-center text-warm-muted hover:text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label="Clear search query"
              >
                <X weight="bold" size={14} aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-0.5 top-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-warm-accent font-bold text-warm-accent-text shadow-sm transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
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
    <header
      data-desktop-shell={isDistractionFreePage ? 'false' : 'true'}
      className={`sticky top-0 z-50 w-full border-b border-warm-border bg-warm-bg dark:border-transparent ${
        isDistractionFreePage ? '' : 'lg:-ml-[72px] lg:w-[calc(100%+72px)]'
      } ${className}`}
    >
      {/* Top High-Density Utility Bar */}
      <div className="bg-[#0B0B0D] px-3 py-1.5 text-[11px] text-white sm:px-6 lg:hidden">
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
              {PROMO_TEXT}
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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 lg:h-14 lg:max-w-none lg:gap-4 lg:px-4 lg:py-0">
        {/* Left cluster: drawer trigger and brand */}
        <div data-header-start className="flex min-w-0 shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent md:hidden lg:flex"
            aria-label="Open menu"
          >
            <List weight="bold" size={24} aria-hidden="true" />
          </button>

          <Logo className="header-brand-logo [&_img]:!h-7 sm:[&_img]:!h-12 lg:h-14 lg:w-auto" />
        </div>

        {/* Central Search with Responsive Category Dropdown (Desktop/Tablet) */}
        <div className="relative hidden max-w-2xl flex-1 md:block lg:max-w-[640px]" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full bg-warm-surface border border-warm-border rounded-full shadow-warm-sm hover:shadow-warm-md focus-within:border-warm-accent transition-all duration-300">
            {/* Category Dropdown Toggle */}
            <div className="relative shrink-0 border-r border-warm-border lg:hidden" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="flex h-11 items-center gap-1.5 rounded-l-full px-3.5 text-xs font-extrabold text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warm-accent"
                aria-expanded={isCategoryDropdownOpen}
                aria-haspopup="menu"
                aria-label={`Search within ${selectedCategoryLabel}`}
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
                    className={`min-h-11 w-full rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
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
                        className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
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
                className="h-10 w-full bg-transparent pl-3.5 pr-10 text-sm font-semibold text-warm-fg outline-none placeholder:text-warm-muted lg:h-11"
                aria-label="Search products"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-warm-muted hover:text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent lg:h-11 lg:w-11"
                  aria-label="Clear search"
                >
                  <X weight="bold" size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Search Submit Button */}
            <button
              type="submit"
              className="my-0.5 mr-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warm-accent text-warm-fg shadow-sm transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent lg:my-0 lg:mr-0 lg:h-11 lg:w-11"
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
            className="flex h-11 w-11 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent md:hidden"
            onClick={() => {
              setIsMobileSearchOpen(true);
              setShowSuggestions(true);
            }}
            aria-label="Open search"
          >
            <MagnifyingGlass weight="bold" size={20} aria-hidden="true" />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun weight="bold" size={20} aria-hidden="true" /> : <Moon weight="bold" size={20} aria-hidden="true" />}
          </button>

          {/* Wishlist Link */}
          <Link
            href="/wishlist"
            className="flex h-11 w-11 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
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
        <div className="mx-auto max-w-7xl px-3 pb-2 sm:px-6 lg:hidden">
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

      {showDesktopCategories && !isDistractionFreePage && (
        <div className="relative ml-[72px] hidden h-14 border-t border-warm-border/60 bg-warm-bg dark:border-transparent lg:block">
          <nav
            ref={desktopCategoriesRef}
            aria-label="Product categories"
            className="flex h-full items-center gap-2 overflow-x-auto px-6 pr-16 scrollbar-hide"
          >
            <Link
              href="/category"
              aria-current={selectedCategory === 'all' ? 'page' : undefined}
              className={`inline-flex h-11 shrink-0 items-center rounded-[10px] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
                selectedCategory === 'all'
                  ? 'bg-warm-fg text-warm-accent'
                  : 'bg-warm-surface text-warm-fg hover:bg-warm-border/70'
              }`}
            >
              All
            </Link>
            <Link
              href="/category?theme=deals"
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] bg-warm-surface px-3 text-sm font-semibold text-warm-fg transition-colors hover:bg-warm-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            >
              <Tag aria-hidden="true" size={16} weight="bold" className="text-warm-accent" />
              Deals
            </Link>
            <Link
              href="/category?theme=bestsellers"
              className="inline-flex h-11 shrink-0 items-center rounded-[10px] bg-warm-surface px-3 text-sm font-semibold text-warm-fg transition-colors hover:bg-warm-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            >
              Best Sellers
            </Link>
            {CATEGORY_GROUPS.map((group) => {
              const isActive = selectedCategory === group.slug;
              return (
                <Link
                  key={group.slug}
                  href={`/category/${group.slug}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex h-11 shrink-0 items-center rounded-[10px] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
                    isActive
                      ? 'bg-warm-fg text-warm-accent'
                      : 'bg-warm-surface text-warm-fg hover:bg-warm-border/70'
                  }`}
                >
                  {group.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => desktopCategoriesRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
            aria-label="Scroll categories forward"
            className="absolute right-2 top-1.5 flex h-11 w-11 items-center justify-center rounded-full border border-warm-border bg-warm-bg text-warm-fg shadow-warm-md transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            <CaretRight aria-hidden="true" size={22} weight="bold" />
          </button>
        </div>
      )}

      {!isDistractionFreePage && (
        <Suspense fallback={null}>
          <DesktopQuickRail />
        </Suspense>
      )}

      <AppDrawer open={isDrawerOpen} onClose={closeDrawer} />

      {/* Desktop Secondary Nav Bar */}
      <div className="hidden border-t border-warm-border/30 bg-warm-surface/50 px-3 py-2 sm:px-6 md:block lg:hidden">
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
              <Tag aria-hidden="true" size={14} weight="bold" /> Weekly Deals
            </Link>
            <span className="text-warm-border">|</span>
            <a href="tel:+8801731944544" className="hover:text-warm-fg transition-colors flex items-center gap-1 font-semibold">
              <Phone aria-hidden="true" size={14} weight="bold" /> +880 1731-944544
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .header-brand-logo img {
            width: auto;
            height: 32px !important;
          }
        }
      `}</style>
    </header>
  );
}
