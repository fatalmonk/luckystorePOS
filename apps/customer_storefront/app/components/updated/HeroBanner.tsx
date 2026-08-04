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
  /** Heading level tag for screen reader document structure */
  titleAs?: 'h1' | 'h2' | 'h3';
}

function getSlideImage(slide: Slide): string {
  return typeof slide.image === 'string' ? slide.image : slide.image.src;
}

export function HeroBanner({
  slides,
  bgGradient = 'from-warm-accent via-warm-accent/90 to-warm-accent/70',
  titleAs: TitleTag = 'h1',
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
      className={`w-full mb-6 rounded-[24px] overflow-hidden relative h-24 xs:h-28 sm:h-52 lg:h-60 aspect-[2.5/1] sm:aspect-[3/1] lg:aspect-[3.5/1] max-h-[132px] xs:max-h-[152px] sm:max-h-[300px] flex flex-col justify-center p-4 sm:p-6 border border-warm-border dark:border-transparent shadow-warm-sm transition-shadow duration-300 ${
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
              decoding="async"
              className={`absolute inset-0 w-full h-full hero-banner-parallax-img ${
                s.objectFit === 'contain' ? 'object-contain' : 'object-cover'
              }`}
              style={{
                objectPosition: s.objectPosition ?? (s.hideText ? 'left center' : '50% 60%'),
              }}
            />
          </picture>
        );
      })}

      {/* Dark gradient overlay for crisp white text legibility over banner images */}
      {hasBgImage && !slide.hideOverlay && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent z-[1]" />
      )}

      {/* Brand warm decorative glows */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-warm-accent/10 rounded-full blur-xl z-[1] pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-40 h-40 bg-warm-accent/10 rounded-full blur-2xl z-[1] pointer-events-none" />

      {/* Content — left aligned text, CTA button right-aligned on mobile */}
      {!slide.hideText && (slide.title || slide.subtitle || slide.badge) && (
        <div className="relative z-10 max-w-lg mr-auto text-left flex flex-col items-start justify-end pb-1 sm:pb-2.5 h-full w-full" aria-live="polite">
          {slide.badge && (
            <p className="px-2.5 py-0.5 rounded-full inline-block mb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#0B0B0D] bg-[var(--color-accent)] shrink-0 shadow-sm">
              {slide.badge}
            </p>
          )}
          {slide.title && (
            <TitleTag className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black leading-none font-display tracking-tight text-white drop-shadow-md">
              {slide.title}
            </TitleTag>
          )}
        </div>
      )}

      {/* Click overlay for full hero banner card */}
      {(slide.ctaHref || slide.ctaText !== null) && (
        <Link href={slide.ctaHref || '/category?theme=deals'} className="absolute inset-0 z-[5]" aria-label={slide.title || 'View category'} />
      )}

      {/* Slider nav buttons — top right */}
      {slides.length > 1 && (
        <div className="absolute top-2 right-2 z-20 flex gap-1.5 sm:top-3 sm:right-3">
          <button
            onClick={() => goTo((current - 1 + slides.length) % slides.length)}
            className="min-h-11 min-w-11 rounded-full bg-warm-surface/80 backdrop-blur-sm border border-warm-border/50 flex items-center justify-center text-warm-fg hover:bg-warm-surface hover:scale-105 active:scale-95 transition-all duration-200 shadow-warm-sm p-2"
            aria-label="Previous slide"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => goTo((current + 1) % slides.length)}
            className="min-h-11 min-w-11 rounded-full bg-warm-surface/80 backdrop-blur-sm border border-warm-border/50 flex items-center justify-center text-warm-fg hover:bg-warm-surface hover:scale-105 active:scale-95 transition-all duration-200 shadow-warm-sm p-2"
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
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-1.5 px-2 py-1.5 sm:bottom-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="min-h-11 min-w-11 rounded-full transition-all duration-300"
              aria-label={`Slide ${i + 1}`}
            >
              <span
                className={`block h-3 w-3 rounded-full transition-all duration-300 ${
                  i === current
                    ? 'bg-warm-fg w-5'
                    : 'bg-warm-fg/30 hover:bg-warm-fg/50'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
