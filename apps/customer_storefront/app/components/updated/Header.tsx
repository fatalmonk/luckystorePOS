'use client';

import React, { useCallback, useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MagnifyingGlass, Heart, ArrowLeft, X, CaretDown, CaretRight, List, Sun, Moon, ArrowRight } from '@phosphor-icons/react';
import { AppDrawer } from '../AppDrawer';
import { DesktopQuickRail } from '../DesktopQuickRail';
import { HeaderCartButton } from '../HeaderCartButton';
import { SearchSuggestions } from './SearchSuggestions';
import { Logo } from '../ui/Logo';
import { CATEGORY_GROUPS } from '../../lib/types';
import { useTheme } from '../providers/ThemeProvider';
import { getCategoryIcon } from '../icons/CategoryIcons';
import { LanguageSwitcher } from '../LanguageSwitcher';

export interface HeaderProps {
  className?: string;
}

export interface CategoryOption {
  slug: string;
  label: string;
  emoji: string;
}

const PROMO_TEXT = 'Free doorstep delivery across Chittagong on orders over ৳500';

export function Header({ className = '' }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFilterPage = pathname?.startsWith('/category') ?? false;
  const isHomePage = pathname === '/';
  const isDistractionFreePage = ['/checkout', '/login', '/signup'].some((path) =>
    pathname?.startsWith(path),
  );
  const showDesktopCategories = !isDistractionFreePage;
  const activeCatalogTheme = isFilterPage ? searchParams.get('theme') : null;
  const { theme, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState<string[]>(['Eggs', 'Noodles', 'Milk', 'Rice', 'Cooking Oil', 'Bread']);

  const mobileOverlaySearchRef = useRef<HTMLDivElement>(null);
  const mobileInlineSearchRef = useRef<HTMLFormElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
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

  // Sync selectedCategory with current URL pathname
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

  // Close suggestions when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideSearch =
        mobileOverlaySearchRef.current?.contains(target) ||
        mobileInlineSearchRef.current?.contains(target) ||
        desktopSearchRef.current?.contains(target);

      if (!isInsideSearch) {
        setShowSuggestions(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSuggestions(false);
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

  // Early return for mobile search overlay state
  if (isMobileSearchOpen) {
    return (
      <header id="mobile-search-header" className={`sticky top-0 z-50 w-full bg-warm-bg border-b border-warm-border p-3 shadow-warm-md ${className}`}>
        <div className="flex items-center gap-2 relative w-full" ref={mobileOverlaySearchRef}>
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchOpen(false);
              setShowSuggestions(false);
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-warm-border bg-warm-surface text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            aria-expanded="true"
            aria-controls="mobile-search-header"
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
              placeholder="What are you shopping for today?"
              className="h-12 w-full rounded-full border border-warm-border bg-warm-surface pl-5 pr-14 text-base font-medium text-warm-fg shadow-inner transition-colors placeholder:text-warm-muted focus:outline-none focus:ring-2 focus:ring-warm-accent/40"
              aria-label="Search products"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-14 top-0.5 flex h-11 w-11 items-center justify-center text-warm-muted hover:text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label="Clear search query"
              >
                <X weight="bold" size={14} aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-warm-image-well font-bold text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              aria-label="Submit search"
            >
              <ArrowRight weight="bold" size={18} aria-hidden="true" />
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

  const hasCategoryBar = showDesktopCategories && !isDistractionFreePage;

  return (
    <>
      <header
        data-desktop-shell={isDistractionFreePage ? 'false' : 'true'}
        data-desktop-categories={hasCategoryBar ? 'true' : 'false'}
        className={`fixed top-0 left-0 right-0 z-50 w-full border-b border-transparent bg-warm-bg dark:border-transparent ${className}`}
      >
      {/* Mobile Bar: menu, compact brand, search, cart */}
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 md:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex h-11 w-11 shrink-0 -translate-y-0.5 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            aria-expanded={isDrawerOpen}
            aria-haspopup="dialog"
            aria-label="Open menu"
          >
            <List weight="bold" size={24} aria-hidden="true" />
          </button>

          <Logo className="header-brand-logo min-w-0 justify-start [&_img]:max-w-[11.5rem] [&_img]:object-contain xs:[&_img]:max-w-[12rem]" />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchOpen(true);
              setShowSuggestions(false);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            aria-expanded={isMobileSearchOpen}
            aria-controls="mobile-search-header"
            aria-label="Open search"
          >
            <MagnifyingGlass weight="bold" size={20} aria-hidden="true" />
          </button>
          <HeaderCartButton compact iconSize={20} />
        </div>
      </div>

      {/* Main Bar: Logo, Central Search + Category Dropdown, Actions */}
      <div className="mx-auto hidden h-14 max-w-7xl items-center justify-between gap-0 px-3 sm:px-6 md:flex md:max-w-none md:px-4">
        {/* Left cluster: drawer trigger and brand */}
        <div data-header-start className="flex min-w-0 shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex h-11 w-11 shrink-0 -translate-y-1 items-center justify-center rounded-full text-[13px] text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent md:flex"
            aria-expanded={isDrawerOpen}
            aria-haspopup="dialog"
            aria-label="Open menu"
          >
            <List weight="bold" size={24} aria-hidden="true" />
          </button>

          <Logo className="header-brand-logo ml-0.5 translate-y-0.5 lg:h-14 lg:w-auto" />
        </div>

        {/* Central Search with Responsive Category Dropdown (Desktop/Tablet) */}
        <div className="relative hidden max-w-[460px] flex-1 md:block" ref={desktopSearchRef}>
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full bg-warm-surface border border-warm-border rounded-full shadow-warm-sm hover:shadow-warm-md focus-within:border-warm-accent transition-all duration-300">
            {/* Main Search Input */}
            <div className="flex-1 relative">
              <input
                name="q"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="What are you shopping for today?"
                className="h-11 w-full bg-transparent pl-4 pr-12 text-sm font-medium text-warm-fg outline-none placeholder:text-warm-muted"
                aria-label="Search products"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-0.5 flex h-10 w-10 items-center justify-center text-warm-muted hover:text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                  aria-label="Clear search"
                >
                  <X weight="bold" size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Search Submit Button */}
            <button
              type="submit"
              className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warm-image-well text-warm-fg transition-all hover:bg-warm-bg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              aria-label="Submit search"
            >
              <ArrowRight weight="bold" size={16} aria-hidden="true" />
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

        {/* Right Actions: Theme, Wishlist, Cart */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <LanguageSwitcher />
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="hidden h-11 w-11 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent md:flex"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun weight="bold" size={20} aria-hidden="true" /> : <Moon weight="bold" size={20} aria-hidden="true" />}
          </button>

          {/* Wishlist Link */}
          <Link
            href="/wishlist"
              prefetch={false}
            className="hidden h-11 w-11 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent md:flex"
            aria-label="Wishlist"
          >
            <Heart weight="bold" size={20} aria-hidden="true" />
          </Link>

          {/* Cart Drawer Button */}
          <HeaderCartButton />
        </div>
      </div>

      {/* Mobile category/filter strip — replaced by compact category rail */}
      {!isDistractionFreePage && (
        <div className="mx-auto max-w-7xl px-3 pb-2 sm:px-6 lg:hidden">
          <nav className="flex flex-nowrap items-center overflow-x-auto h-[44px] gap-1.5 scrollbar-hide py-0.5" aria-label="Categories">
            <Link
              href="/category"
              aria-current={selectedCategory === 'all' && !activeCatalogTheme ? 'page' : undefined}
              className={`flex-shrink-0 inline-flex h-9 min-h-11 items-center rounded-[10px] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
                selectedCategory === 'all' && !activeCatalogTheme
                  ? 'bg-warm-fg text-warm-bg'
                  : 'bg-warm-surface text-warm-fg hover:bg-warm-border/70'
              }`}
            >
              All
            </Link>
            {CATEGORY_GROUPS.map((group) => {
              const isActive = !activeCatalogTheme && selectedCategory === group.slug;
              return (
                <Link
                  key={group.slug}
                  href={`/category/${group.slug}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex-shrink-0 inline-flex h-9 min-h-11 items-center rounded-[10px] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
                    isActive
                      ? 'bg-warm-fg text-warm-bg'
                      : 'bg-warm-surface text-warm-fg hover:bg-warm-border/70'
                  }`}
                >
                  {group.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {showDesktopCategories && !isDistractionFreePage && (
        <div className="relative hidden h-14 border-t border-transparent bg-warm-bg dark:border-transparent md:ml-[72px] lg:flex">
          <nav
            ref={desktopCategoriesRef}
            aria-label="Product categories"
            className="flex h-full items-center gap-2 overflow-x-auto px-6 pr-16 scrollbar-hide"
          >
            <Link
              href="/category"
              aria-current={selectedCategory === 'all' && !activeCatalogTheme ? 'page' : undefined}
              className={`inline-flex h-8 shrink-0 items-center rounded-[10px] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
                selectedCategory === 'all' && !activeCatalogTheme
                  ? 'bg-warm-fg text-warm-bg'
                  : 'bg-warm-surface text-warm-fg hover:bg-warm-border/70'
              }`}
            >
              All
            </Link>
            {CATEGORY_GROUPS.map((group) => {
              const isActive = !activeCatalogTheme && selectedCategory === group.slug;
              return (
                <Link
                  key={group.slug}
                  href={`/category/${group.slug}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex h-8 shrink-0 items-center rounded-[10px] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
                    isActive
                      ? 'bg-warm-fg text-warm-bg'
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
            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full border border-warm-border bg-warm-bg text-warm-fg shadow-warm-md transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
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

      <style>{`
        @media (min-width: 1024px) {
          .header-brand-logo img {
            width: auto;
            height: 48px !important;
          }
        }
      `}</style>
    </header>
    <div
      className={
        showDesktopCategories
          ? 'h-[108px] md:h-[112px]'
          : 'h-14'
      }
      aria-hidden="true"
    />
    </>
  );
}
