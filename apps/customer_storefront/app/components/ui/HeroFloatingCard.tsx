'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { ProductImage } from '../product/ProductImage';
import { getCategoryIcon } from '../icons/CategoryIcons';
import { formatBdt } from '../../lib/formatPrice';
import { toProductSlug } from '../../lib/products/slugify';
import type { Product } from '../../lib/types';

import { withLocale, type Locale } from '../../lib/i18n/config';
import { getDictionary } from '../../lib/i18n/dictionaries';

export interface HeroDiscoveryRailProps {
  products: Product[];
  title?: string;
  locale?: Locale;
  children?: React.ReactNode;
}

export function HeroDiscoveryRail({
  products,
  title,
  locale = 'en',
  children,
}: HeroDiscoveryRailProps) {
  const dict = getDictionary(locale);
  const discoveryTitle = title ?? dict.campaign.discoveryTitle;
  const picks = products.filter((product) => product.stock > 0).slice(0, 8);
  const chips = dict.campaign.searchChips;

  const [mounted, setMounted] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [query, setQuery] = useState('');
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    let lastScrollY = window.scrollY ?? window.pageYOffset ?? 0;
    let ticking = false;

    const checkSticky = () => {
      const isMobileOrTablet = mediaQuery.matches;
      if (!isMobileOrTablet) {
        setIsStuck(false);
        setIsHeaderHidden(false);
        ticking = false;
        return;
      }

      const currentY = window.scrollY ?? window.pageYOffset ?? 0;
      const isBodyHeaderHidden = document.body.getAttribute('data-header-hidden') === 'true';

      let headerHidden = isBodyHeaderHidden;
      if (currentY <= 20) {
        headerHidden = false;
      } else if (currentY > lastScrollY + 8 && currentY > 60) {
        headerHidden = true;
      } else if (currentY < lastScrollY - 8) {
        headerHidden = false;
      }

      setIsHeaderHidden(headerHidden);

      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const reached = currentY > 40 && rect.top <= 0;
        setIsStuck(reached && isMobileOrTablet);
      }

      lastScrollY = Math.max(0, currentY);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        if (typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(() => {
            checkSticky();
          });
        } else {
          checkSticky();
        }
        ticking = true;
      }
    };

    const onHeaderVisibilityChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ hidden: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.hidden === 'boolean') {
        setIsHeaderHidden(customEvent.detail.hidden);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('header-visibility-change', onHeaderVisibilityChange);
    if (typeof mediaQuery?.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onScroll);
    } else if (typeof (mediaQuery as unknown as { addListener?: (fn: () => void) => void })?.addListener === 'function') {
      (mediaQuery as unknown as { addListener: (fn: () => void) => void }).addListener(onScroll);
    }

    checkSticky();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('header-visibility-change', onHeaderVisibilityChange);
      if (typeof mediaQuery?.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onScroll);
      } else if (typeof (mediaQuery as unknown as { removeListener?: (fn: () => void) => void })?.removeListener === 'function') {
        (mediaQuery as unknown as { removeListener: (fn: () => void) => void }).removeListener(onScroll);
      }
    };
  }, []);

  const renderSearchForm = (isFixedPortal = false) => (
    <form
      action={withLocale('/category', locale)}
      className="group/search relative"
      role="search"
      aria-label="Search groceries"
    >
      <MagnifyingGlass
        size={20}
        weight="bold"
        className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-warm-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={dict.campaign.searchPlaceholder}
        placeholder={dict.campaign.searchPlaceholder}
        className={`${
          isFixedPortal ? 'h-12 text-sm sm:h-14 sm:text-base' : 'h-14 text-base'
        } w-full rounded-warm-panel border border-warm-image-well-border bg-warm-bg pl-12 pr-4 font-semibold text-warm-fg shadow-warm-card transition-colors placeholder:text-warm-muted hover:border-warm-accent/60 focus-visible:border-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent/40`}
      />
    </form>
  );

  return (
    <div className="hero-discovery flex min-w-0 flex-col gap-4">
      <div
        ref={anchorRef}
        data-sticky-search-anchor="true"
        className="relative w-full min-h-[3.5rem]"
      >
        {isStuck && mounted ? (
          <>
            <div className="invisible lg:visible" aria-hidden="true">
              {renderSearchForm(false)}
            </div>
            {createPortal(
              <div
                data-sticky-search="true"
                className={`fixed top-0 left-0 right-0 z-50 w-full border-b border-warm-border/60 bg-warm-bg/95 px-3 py-2.5 shadow-warm-md backdrop-blur-md transition-transform duration-300 ease-in-out motion-reduce:transition-none sm:px-6 lg:hidden ${
                  !isHeaderHidden ? '-translate-y-full' : 'translate-y-0'
                }`}
              >
                <div className="mx-auto max-w-7xl">
                  {renderSearchForm(true)}
                </div>
              </div>,
              document.body,
            )}
          </>
        ) : (
          <div data-sticky-search="false" className="relative w-full">
            {renderSearchForm(false)}
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Suggested grocery searches">
        {chips.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="group inline-flex min-w-[3.75rem] shrink-0 flex-col items-center gap-1 rounded-full px-1 py-1 text-xs font-semibold text-warm-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent sm:min-h-11 sm:min-w-0 sm:flex-row sm:gap-2 sm:rounded-warm-control sm:border sm:border-warm-image-well-border sm:bg-warm-image-well sm:px-4 sm:py-0 sm:text-sm sm:font-extrabold sm:hover:border-warm-accent sm:hover:bg-warm-bg"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-warm-border bg-warm-image-well text-warm-fg transition-colors group-hover:bg-warm-accent group-hover:text-warm-accent-text sm:hidden">
              {getCategoryIcon(label, 24)}
            </span>
            <span className="hidden sm:inline-flex">{getCategoryIcon(label, 18)}</span>
            {label}
          </Link>
        ))}
      </div>

      {children}

      {picks.length > 0 ? (
        <section aria-labelledby="hero-discovery-title" className="min-w-0">
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 id="hero-discovery-title" className="text-lg font-black tracking-tight text-warm-fg sm:text-xl">
              {discoveryTitle}
            </h2>
            <Link
              href={withLocale('/category', locale)}
              className="inline-flex min-h-11 items-center text-sm font-extrabold text-warm-fg underline underline-offset-4 transition-colors hover:text-warm-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            >
              {dict.heritage.cta}
            </Link>
          </div>

          <div
            className="hero-product-strip flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-hide"
            aria-label={`${discoveryTitle} products`}
          >
            {picks.map((product, index) => (
              <Link
                key={product.id}
                href={withLocale(`/product/${toProductSlug(product.name, product.id)}`, locale)}
                className="group/product flex min-h-[13.5rem] w-[10.25rem] shrink-0 snap-start flex-col overflow-hidden rounded-warm-card border border-warm-image-well-border bg-warm-bg shadow-warm-card transition-[transform,box-shadow] duration-200 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-warm-card-hover motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden border-b border-warm-image-well-border bg-warm-image-well">
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    category={product.category}
                    sizes="164px"
                    imageClassName="product-image-on-well object-contain p-2 transition-transform duration-300 group-hover/product:scale-108 motion-reduce:transition-none"
                    priority={index === 0}
                    showLoadingState
                  />
                </span>
                <span className="flex flex-1 flex-col justify-between gap-2 p-3">
                  <span>
                    <span className="line-clamp-2 text-sm font-bold leading-5 text-warm-fg">
                      {product.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-warm-muted">{product.unit}</span>
                  </span>
                  <span className="font-mono text-base font-black tabular-nums text-warm-fg">
                    {formatBdt(product.price)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
