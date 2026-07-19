'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
  ctaText?: string;
  ctaHref?: string;
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
  const [fading, setFading] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const goTo = useCallback((index: number) => {
    if (index === current) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(index);
      setFading(false);
    }, 300);
  }, [current]);

  // Auto-rotate
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      goTo((current + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [current, slides.length, goTo]);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) < threshold) return;
    if (diff > 0) {
      // Swipe left → next
      goTo((current + 1) % slides.length);
    } else {
      // Swipe right → previous
      goTo((current - 1 + slides.length) % slides.length);
    }
  };

  const slide = slides[current];
  const hasBgImage = !!getSlideImage(slide);

  return (
    <section
      className={`w-full mb-6 rounded-[24px] overflow-hidden relative h-44 flex flex-col justify-center p-6 border border-warm-border/40 shadow-warm-sm transition-shadow duration-300 ${
        hasBgImage ? '' : `bg-gradient-to-r ${bgGradient}`
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background images — crossfade */}
      {slides.map((s, i) => {
        const img = typeof s.image === 'string' ? null : s.image;
        const src = getSlideImage(s);
        const isVisible = i === current && !fading;
        const baseClasses = `absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
          isVisible ? 'opacity-100 z-0' : 'opacity-0 z-0'
        }`;
        return (
          <picture key={i} className={baseClasses}>
            {img?.sources?.map((source, idx) => (
              <source key={idx} srcSet={source.srcSet} type={source.type} media={source.media} />
            ))}
            {img?.srcSet && (
              <source srcSet={img.srcSet} type="image/webp" sizes={img.sizes || '100vw'} />
            )}
            <Image
              src={src as string}
              alt={img?.alt || ''}
              fill
              sizes={img?.sizes || '100vw'}
              priority={i === 0}
              unoptimized={!img?.srcSet && !img?.sources}
            />
          </picture>
        );
      })}

      {/* Light overlay for text legibility */}
      {hasBgImage && (
        <div className="absolute inset-0 bg-gradient-to-r from-warm-surface/90 via-warm-surface/60 to-warm-surface/20 z-[1]" />
      )}

      {/* Decorative blobs */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-warm-surface/10 rounded-full blur-xl z-[1] pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-40 h-40 bg-warm-fg/5 rounded-full blur-2xl z-[1] pointer-events-none" />

      {/* Content — left aligned (clean canvas on left, products on right) */}
      <div className="relative z-10 max-w-lg mr-auto text-left">
        {slide.badge && (
          <p className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block mb-2 text-warm-fg bg-warm-fg/10">
            {slide.badge}
          </p>
        )}
        <h2 className="text-2xl lg:text-3xl font-black mb-1.5 leading-none font-display tracking-tight text-[#4a3728]">
          {slide.title}
        </h2>
        <p className="text-xs sm:text-sm font-medium mb-4 max-w-[45ch] text-[#4a3728]/75">
          {slide.subtitle}
        </p>
        <Link
          href={slide.ctaHref || '/category?theme=deals'}
          className="inline-flex items-center gap-1.5 rounded-full bg-warm-fg px-4.5 py-1.5 text-xs font-bold text-warm-surface hover:bg-warm-fg/90 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-warm-sm hover:shadow-warm-md"
        >
          {slide.ctaText || 'Shop Now'}
          <span aria-hidden="true" className="text-sm transition-transform duration-300 group-hover:translate-x-0.5">→</span>
        </Link>
      </div>

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
