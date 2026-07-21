'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

export interface ResponsiveImage {
  src: string;
  srcSet?: string;
  sizes?: string;
  sources?: { srcSet: string; type: string; media?: string }[];
  alt?: string;
}

interface Slide {
  image: string | ResponsiveImage;
  title: string;
  subtitle: string;
  badge?: string;
  ctaText?: string | null;
  ctaHref?: string;
  /** Custom object-position focal point, e.g. '50% 64%' or 'left center' */
  objectPosition?: string;
  /** Custom object-fit strategy, e.g. 'contain' | 'cover' */
  objectFit?: 'cover' | 'contain' | 'fill';
  /** Suppress dark gradient overlay over image */
  hideOverlay?: boolean;
  /** Suppress text and CTA overlay on top of image */
  hideText?: boolean;
}

interface HeroBannerProps {
  slides: Slide[];
  /** Fallback gradient when no images */
  bgGradient?: string;
}

function getSlideImage(slide: Slide): string {
  return typeof slide.image === 'string' ? slide.image : slide.image.src;
}

export function HeroBanner({
  slides,
  bgGradient = 'from-[#f0c444] via-[#e8b840] to-[#d4a030]',
}: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  // Auto-rotate — pauses on hover (desktop) and touch (mobile)
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length, paused]);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) < threshold) {
      setPaused(false);
      return;
    }
    if (diff > 0) {
      // Swipe left → next
      goTo((current + 1) % slides.length);
    } else {
      // Swipe right → previous
      goTo((current - 1 + slides.length) % slides.length);
    }
    setTimeout(() => setPaused(false), 3000);
  };

  const slide = slides[current];
  const hasBgImage = !!getSlideImage(slide);

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured categories"
      className={`w-full mb-6 rounded-[24px] overflow-hidden relative h-36 xs:h-44 sm:h-52 lg:h-60 aspect-[2.5/1] sm:aspect-[3/1] lg:aspect-[3.5/1] max-h-[260px] sm:max-h-[300px] flex flex-col justify-center p-6 border border-warm-border/40 shadow-warm-sm transition-shadow duration-300 ${
        hasBgImage ? '' : `bg-gradient-to-r ${bgGradient}`
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background images — smooth crossfade */}
      {slides.map((s, i) => {
        const imgVal = typeof s.image === 'string' ? null : s.image;
        const src = getSlideImage(s);
        const isVisible = i === current;
        const baseClasses = `absolute inset-0 w-full h-full transition-opacity duration-500 ${
          isVisible ? 'opacity-100 z-0' : 'opacity-0 z-0'
        }`;
        const isLcp = i === 0;

        return (
          <picture key={i} className={baseClasses}>
            {/* Preload header link for LCP image */}
            {isLcp && imgVal?.sources?.[0]?.srcSet && (
              <link
                rel="preload"
                as="image"
                href={imgVal.src}
                imageSrcSet={imgVal.sources[0].srcSet}
                imageSizes={imgVal.sizes || '100vw'}
                fetchPriority="high"
                type={imgVal.sources[0].type}
              />
            )}
            {isLcp && !imgVal?.sources?.[0]?.srcSet && imgVal?.srcSet && (
              <link
                rel="preload"
                as="image"
                href={src}
                imageSrcSet={imgVal.srcSet}
                imageSizes={imgVal.sizes || '100vw'}
                fetchPriority="high"
                type="image/webp"
              />
            )}
            {isLcp && !imgVal?.sources?.[0]?.srcSet && !imgVal?.srcSet && (
              <link
                rel="preload"
                as="image"
                href={src}
                fetchPriority="high"
              />
            )}

            {imgVal?.sources?.map((source, idx) => (
              <source key={idx} srcSet={source.srcSet} type={source.type} media={source.media} />
            ))}
            {imgVal?.srcSet && (
              <source srcSet={imgVal.srcSet} type="image/webp" sizes={imgVal.sizes || '100vw'} />
            )}
            <img
              src={src}
              alt={imgVal?.alt || ''}
              sizes={imgVal?.sizes || '100vw'}
              srcSet={imgVal?.srcSet || undefined}
              fetchPriority={isLcp ? 'high' : 'low'}
              loading={isLcp ? 'eager' : 'lazy'}
              className={`absolute inset-0 w-full h-full ${
                s.objectFit === 'contain' ? 'object-contain' : 'object-cover'
              }`}
              style={{
                objectPosition: s.objectPosition ?? (s.hideText ? 'left center' : '50% 60%'),
              }}
            />
          </picture>
        );
      })}

      {/* Dark overlay for text legibility over banner images */}
      {hasBgImage && !slide.hideOverlay && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent z-[1]" />
      )}

      {/* Brand warm decorative glows */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#FCCE09]/[0.06] rounded-full blur-xl z-[1] pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-40 h-40 bg-[#FCCE09]/[0.04] rounded-full blur-2xl z-[1] pointer-events-none" />

      {/* Content — left aligned */}
      {!slide.hideText && (slide.title || slide.subtitle || slide.badge) && (
        <div className="relative z-10 max-w-lg mr-auto text-left flex flex-col items-start justify-center h-full" aria-live="polite">
          {slide.badge && (
            <p className="px-2.5 py-0.5 rounded-full inline-block mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-foreground)] bg-[var(--color-accent)] shrink-0">
              {slide.badge}
            </p>
          )}
          {slide.title && (
            <h2 className={`text-xl sm:text-2xl lg:text-3xl font-black mb-1 sm:mb-1.5 leading-tight font-display tracking-tight ${
              hasBgImage ? 'text-white drop-shadow-sm' : 'text-[#4a3728]'
            }`}>
              {slide.title}
            </h2>
          )}
          {slide.subtitle && (
            <p className={`text-xs sm:text-sm normal-case font-medium mb-3 sm:mb-4 max-w-[45ch] line-clamp-2 sm:line-clamp-none ${
              hasBgImage ? 'text-white/90 drop-shadow-sm' : 'text-[#4a3728]/75'
            }`}>
              {slide.subtitle}
            </p>
          )}
          {slide.ctaText !== null && (
            <Link
              href={slide.ctaHref || '/category?theme=deals'}
              className="group inline-flex items-center gap-1.5 rounded-full bg-white px-[1.125rem] py-1.5 text-xs font-bold text-[#0B0B0D] hover:bg-white/90 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-warm-sm hover:shadow-warm-md shrink-0"
            >
              {slide.ctaText || 'Shop Now'}
              <span aria-hidden="true" className="text-sm transition-transform duration-300 group-hover:translate-x-0.5">→</span>
            </Link>
          )}
        </div>
      )}

      {/* Click overlay for image-only slides */}
      {slide.hideText && slide.ctaHref && (
        <Link href={slide.ctaHref} className="absolute inset-0 z-[5]" aria-label={slide.title || 'View deals'} />
      )}

      {/* Slider nav buttons — top right */}
      {slides.length > 1 && (
        <div className="absolute top-3 right-3 z-20 flex gap-1.5">
          <button
            onClick={() => goTo((current - 1 + slides.length) % slides.length)}
            className="w-7 h-7 rounded-full bg-warm-surface/80 backdrop-blur-sm border border-warm-border/50 flex items-center justify-center text-warm-fg hover:bg-warm-surface hover:scale-105 active:scale-95 transition-all duration-200 shadow-warm-sm"
            aria-label="Previous slide"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => goTo((current + 1) % slides.length)}
            className="w-7 h-7 rounded-full bg-warm-surface/80 backdrop-blur-sm border border-warm-border/50 flex items-center justify-center text-warm-fg hover:bg-warm-surface hover:scale-105 active:scale-95 transition-all duration-200 shadow-warm-sm"
            aria-label="Next slide"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? 'bg-warm-fg w-5'
                  : 'bg-warm-fg/30 hover:bg-warm-fg/50'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

