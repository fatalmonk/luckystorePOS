'use client';

import React, { useCallback, useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, ArrowLeft, X, CaretDown, CaretRight, List, Sun, Moon, ArrowRight } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { AppDrawer } from '../AppDrawer';
import { DesktopQuickRail } from '../DesktopQuickRail';
import { HeaderCartButton } from '../HeaderCartButton';
import { SearchSuggestions } from './SearchSuggestions';
import { Logo } from '../ui/Logo';
import { CATEGORY_RAIL_ITEMS, BENGALI_CATEGORY_NAMES } from '../../lib/types';
import { getCategoryIcon } from '../icons/CategoryIcons';
import { getLocaleFromPathname, stripLocalePrefix, withLocale, type Locale } from '../../lib/i18n/config';
import { getDictionary } from '../../lib/i18n/dictionaries';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { LiquidButton } from '../animate-ui/buttons/liquid';
import { ThemeToggler } from '../animate-ui/effects/theme-toggler';

const MotionLink = motion.create(Link);

interface CategoryRailItemsProps {
  currentLocale: Locale;
  selectedCategory: string;
  activeCatalogTheme: string | null;
  itemClassName: string;
  allLabel?: string;
}

function CategoryRailItems({
  currentLocale,
  selectedCategory,
  activeCatalogTheme,
  itemClassName,
  allLabel,
}: CategoryRailItemsProps) {
  const isAllActive = selectedCategory === 'all' && !activeCatalogTheme;
  return (
    <>
      {allLabel && (
        <LiquidButton asChild fillHeight="3px" delay="0.3s" tapScale={0.97}>
          <MotionLink
            href={withLocale('/category', currentLocale)}
            aria-current={isAllActive ? 'page' : undefined}
            className={`${itemClassName} ${
              isAllActive
                ? 'bg-warm-fg text-warm-bg font-bold shadow-sm'
                : 'bg-warm-surface text-warm-fg hover:bg-warm-border/70 [--liquid-button-background-color:var(--color-surface)] [--liquid-button-color:var(--color-accent)] hover:text-warm-accent-text'
            }`}
          >
            {allLabel}
          </MotionLink>
        </LiquidButton>
      )}
      {CATEGORY_RAIL_ITEMS.map((item) => {
        const isActive = !activeCatalogTheme && selectedCategory === item.slug;
        const label = currentLocale === 'bn' ? (BENGALI_CATEGORY_NAMES[item.slug] || item.label) : item.label;
        return (
          <LiquidButton key={item.slug} asChild fillHeight="3px" delay="0.3s" tapScale={0.97}>
            <MotionLink
              href={withLocale(`/category/${item.slug}`, currentLocale)}
              aria-current={isActive ? 'page' : undefined}
              className={`${itemClassName} ${
                isActive
                  ? 'bg-warm-fg text-warm-bg'
                  : 'bg-warm-surface text-warm-fg hover:bg-warm-border/70 [--liquid-button-background-color:var(--color-surface)] [--liquid-button-color:var(--color-accent)] hover:text-warm-accent-text'
              }`}
            >
              {label}
            </MotionLink>
          </LiquidButton>
        );
      })}
    </>
  );
}



export interface HeaderProps {
  className?: string;
  locale?: Locale;
}

export interface CategoryOption {
  slug: string;
  label: string;
  emoji: string;
}

export function Header({ className = '', locale }: HeaderProps) {
  const pathname = usePathname() || '/';
  const localizedPathname = stripLocalePrefix(pathname);
  const isDistractionFreePage = ['/checkout', '/login', '/signup'].some((path) =>
    localizedPathname.startsWith(path),
  );

  return (
    <Suspense
      fallback={(
        <div
          aria-hidden="true"
          className={isDistractionFreePage ? 'h-14' : 'h-[108px] md:h-[112px]'}
        />
      )}
    >
      <HeaderContent className={className} locale={locale} />
    </Suspense>
  );
}

function HeaderContent({ className = '', locale }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocale = locale ?? getLocaleFromPathname(pathname);
  const dict = getDictionary(currentLocale);
  const localizedPathname = stripLocalePrefix(pathname || '/');
  const isFilterPage = localizedPathname.startsWith('/category');
  const isHomePage = localizedPathname === '/';
  const isDistractionFreePage = ['/checkout', '/login', '/signup'].some((path) =>
    localizedPathname.startsWith(path),
  );
  const showDesktopCategories = !isDistractionFreePage;
  const activeCatalogTheme = isFilterPage ? searchParams.get('theme') : null;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const popularSearches = dict.header.popularSearches as unknown as string[];

  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? (window.scrollY ?? window.pageYOffset ?? 0) : 0;
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY ?? window.pageYOffset ?? 0;
          if (currentY <= 20) {
            setIsHeaderHidden(false);
          } else if (currentY > lastScrollY + 8 && currentY > 60) {
            setIsHeaderHidden(true);
          } else if (currentY < lastScrollY - 8) {
            setIsHeaderHidden(false);
          }
          lastScrollY = Math.max(0, currentY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isHidden = isHeaderHidden && !isDrawerOpen && !isMobileSearchOpen;
    if (isHidden) {
      document.body.setAttribute('data-header-hidden', 'true');
    } else {
      document.body.removeAttribute('data-header-hidden');
    }
    window.dispatchEvent(
      new CustomEvent('header-visibility-change', { detail: { hidden: isHidden } }),
    );
  }, [isHeaderHidden, isDrawerOpen, isMobileSearchOpen]);

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.removeAttribute('data-header-hidden');
      }
    };
  }, []);


  const mobileOverlaySearchRef = useRef<HTMLDivElement>(null);
  const mobileInlineSearchRef = useRef<HTMLFormElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileCategoriesRef = useRef<HTMLDivElement>(null);
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
    if (localizedPathname.startsWith('/category/')) {
      const slug = localizedPathname.replace('/category/', '').split('/')[0];
      if (slug) {
        setSelectedCategory(slug);
        return;
      }
    }
    setSelectedCategory('all');
  }, [localizedPathname]);

  useEffect(() => {
    if (selectedCategory === 'all' || activeCatalogTheme) return;

    const activeCategory = mobileCategoriesRef.current?.querySelector<HTMLAnchorElement>(
      'a[aria-current="page"]',
    );
    activeCategory?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeCatalogTheme, selectedCategory]);

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
        router.push(withLocale(`/category/${encodeURIComponent(selectedCategory)}?q=${encodeURIComponent(trimmed)}`, currentLocale));
      } else {
        router.push(withLocale(`/category?q=${encodeURIComponent(trimmed)}`, currentLocale));
      }
    } else if (selectedCategory && selectedCategory !== 'all') {
      setShowSuggestions(false);
      setIsMobileSearchOpen(false);
      router.push(withLocale(`/category/${encodeURIComponent(selectedCategory)}`, currentLocale));
    } else {
      setShowSuggestions(false);
      setIsMobileSearchOpen(false);
      router.push(withLocale('/category', currentLocale));
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
              type="search"
              inputMode="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder={dict.header.searchPlaceholder}
              className="h-12 w-full rounded-full border border-warm-border bg-warm-surface pl-5 pr-14 text-base font-medium text-warm-fg shadow-inner transition-colors placeholder:text-warm-muted focus:outline-none focus:ring-2 focus:ring-warm-accent/40"
              aria-label={currentLocale === 'bn' ? 'পণ্য খুঁজুন' : 'Search products'}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-14 top-0.5 flex h-11 w-11 items-center justify-center text-warm-muted hover:text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label={dict.header.clear}
              >
                <X weight="bold" size={14} aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-warm-image-well font-bold text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              aria-label={currentLocale === 'bn' ? 'অনুসন্ধান করুন' : 'Submit search'}
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
                router.push(withLocale(`/category?q=${encodeURIComponent(term)}`, currentLocale));
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
        className={`fixed top-0 left-0 right-0 z-50 w-full border-b border-transparent bg-warm-bg transition-transform duration-300 ease-in-out motion-reduce:transition-none dark:border-transparent ${
          isHeaderHidden && !isDrawerOpen && !isMobileSearchOpen ? '-translate-y-full' : 'translate-y-0'
        } ${className}`}
      >
      {/* Mobile Bar: menu, compact brand, theme toggle, cart */}
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 md:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            aria-expanded={isDrawerOpen}
            aria-haspopup="dialog"
            aria-label="Open menu"
          >
            <List className="-translate-y-2" weight="bold" size={24} aria-hidden="true" />
          </button>

          <Logo className="header-brand-logo min-w-0 justify-start [&_img]:max-w-[11.5rem] [&_img]:object-contain xs:[&_img]:max-w-[12rem]" locale={currentLocale} />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <LanguageSwitcher />
          {/* Theme Toggle */}
          <ThemeToggler direction="ltr">
            {({ resolved, toggleTheme: handleToggle }) => (
              <button
                type="button"
                onClick={() => handleToggle()}
                className="flex h-11 w-11 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label={resolved === 'dark' ? dict.header.themeLight : dict.header.themeDark}
              >
                {resolved === 'dark' ? <Sun weight="bold" size={20} aria-hidden="true" /> : <Moon weight="bold" size={20} aria-hidden="true" />}
              </button>
            )}
          </ThemeToggler>
          <HeaderCartButton compact iconSize={20} />
        </div>
      </div>

      {/* Main Bar: Logo, Central Search + Category Dropdown, Actions */}
      <div className="mx-auto hidden h-14 max-w-7xl items-center justify-between gap-0 px-3 sm:px-6 md:flex lg:max-w-none lg:px-4">
        {/* Left cluster: drawer trigger and brand */}
        <div data-header-start className="flex min-w-0 shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent md:flex"
            aria-expanded={isDrawerOpen}
            aria-haspopup="dialog"
            aria-label="Open menu"
          >
            <List className="-translate-y-2" weight="bold" size={24} aria-hidden="true" />
          </button>

          <Logo className="header-brand-logo ml-0.5 lg:h-14 lg:w-auto" locale={currentLocale} />
        </div>

        {/* Central Search with Responsive Category Dropdown (Desktop/Tablet) */}
        <div className="relative hidden max-w-[460px] flex-1 md:block" ref={desktopSearchRef}>
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full bg-warm-surface border border-warm-border rounded-full shadow-warm-sm hover:shadow-warm-md focus-within:border-warm-accent transition-[border-color,box-shadow] duration-300">
            {/* Main Search Input */}
            <div className="flex-1 relative">
              <input
                name="q"
                type="search"
                inputMode="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder={dict.header.searchPlaceholder}
                className="h-11 w-full bg-transparent pl-4 pr-12 text-sm font-medium text-warm-fg outline-none placeholder:text-warm-muted"
                aria-label={currentLocale === 'bn' ? 'পণ্য খুঁজুন' : 'Search products'}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-0.5 flex h-10 w-10 items-center justify-center text-warm-muted hover:text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                  aria-label={dict.header.clear}
                >
                  <X weight="bold" size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Search Submit Button */}
            <button
              type="submit"
              className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warm-image-well text-warm-fg transition-[background-color,transform] hover:bg-warm-bg motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              aria-label={currentLocale === 'bn' ? 'অনুসন্ধান করুন' : 'Submit search'}
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
                router.push(withLocale(`/category?q=${encodeURIComponent(term)}`, currentLocale));
              }}
              onClose={() => setShowSuggestions(false)}
            />
          )}
        </div>

        {/* Right Actions: Theme, Wishlist, Cart */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <LanguageSwitcher />
          {/* Theme Toggle */}
          <ThemeToggler direction="ltr">
            {({ resolved, toggleTheme: handleToggle }) => (
              <button
                type="button"
                onClick={() => handleToggle()}
                className="hidden h-11 w-11 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent md:flex"
                aria-label={resolved === 'dark' ? dict.header.themeLight : dict.header.themeDark}
              >
                {resolved === 'dark' ? <Sun weight="bold" size={20} aria-hidden="true" /> : <Moon weight="bold" size={20} aria-hidden="true" />}
              </button>
            )}
          </ThemeToggler>

          {/* Wishlist Link */}
          <Link
            href="/wishlist"
            prefetch={false}
            className="hidden h-11 w-11 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent md:flex"
            aria-label={dict.footer.wishlist}
          >
            <Heart weight="bold" size={20} aria-hidden="true" />
          </Link>

          {/* Cart Drawer Button */}
          <HeaderCartButton />
        </div>
      </div>

      {/* Mobile category/filter strip — sliding category rail */}
      {!isDistractionFreePage && (
        <nav
          aria-label={currentLocale === 'bn' ? 'ক্যাটাগরি' : 'Categories'}
          className="mx-auto flex max-w-7xl items-center px-3 pb-1 sm:px-6 md:ml-[72px] md:max-w-none md:px-4 lg:hidden"
        >
          <div
            ref={mobileCategoriesRef}
            className="flex h-[44px] min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-hide"
          >
            <CategoryRailItems
              currentLocale={currentLocale}
              selectedCategory={selectedCategory}
              activeCatalogTheme={activeCatalogTheme}
              allLabel={dict.header.allCategories}
              itemClassName="flex-shrink-0 inline-flex h-11 items-center rounded-[10px] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            />
          </div>
        </nav>
      )}

      {showDesktopCategories && !isDistractionFreePage && (
        <div className="relative hidden h-14 items-center gap-2 border-t border-transparent bg-warm-bg px-6 dark:border-transparent md:ml-[72px] lg:flex">
          <nav
            ref={desktopCategoriesRef}
            aria-label={currentLocale === 'bn' ? 'পণ্যের ক্যাটাগরি' : 'Product categories'}
            className="flex h-full min-w-0 flex-1 items-center gap-2 overflow-x-auto pr-16 scrollbar-hide"
          >
            <CategoryRailItems
              currentLocale={currentLocale}
              selectedCategory={selectedCategory}
              activeCatalogTheme={activeCatalogTheme}
              allLabel={dict.header.allCategories}
              itemClassName="inline-flex h-11 shrink-0 items-center rounded-[10px] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            />
          </nav>

          <button
            type="button"
            onClick={() => {
              const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              desktopCategoriesRef.current?.scrollBy({ left: 360, behavior: reducedMotion ? 'auto' : 'smooth' });
            }}
            aria-label="Scroll categories forward"
            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full border border-warm-border bg-warm-bg text-warm-fg shadow-warm-md transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            <CaretRight aria-hidden="true" size={22} weight="bold" />
          </button>
        </div>
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

    {!isDistractionFreePage && (
      <Suspense fallback={null}>
        <DesktopQuickRail hidden={isHeaderHidden && !isDrawerOpen && !isMobileSearchOpen} />
      </Suspense>
    )}
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
