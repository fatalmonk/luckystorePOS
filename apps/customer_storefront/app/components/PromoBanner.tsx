'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { img } from '../lib/imageUrl';

type PromoVariant = 'image' | 'saffron' | 'dark';

interface PromoBannerProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  bgImage?: string;
  bgColor?: string;
  variant?: PromoVariant;
  /** Inline placement: removes outer section margin/padding so it nests inside another container. */
  inline?: boolean;
}

export function PromoBanner({
  title,
  subtitle,
  ctaText = 'Shop now',
  ctaHref = '#',
  bgImage = img('/images/native_ad_banner.webp'),
  bgColor = '#1c1917',
  variant = 'image',
  inline = false,
}: PromoBannerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1, rootMargin: '-50px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const isImage = variant === 'image';
  const isSaffron = variant === 'saffron';
  const isDark = variant === 'dark';

  const containerClasses = [
    'block relative rounded-[20px] overflow-hidden h-40 sm:h-48 group press-feedback',
    isImage ? '' : isSaffron
      ? 'bg-gradient-to-r from-[#f0c444] to-[#e8b840]'
      : `bg-[${bgColor}]`,
    'fade-up-hidden',
    visible ? 'fade-up-visible' : '',
  ].join(' ');

  const content = (
    <div ref={ref} className={containerClasses}>
      {isImage && (
        <>
          {bgImage ? (
            <Image
              src={bgImage}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: bgColor }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        </>
      )}

      <div
        className={`relative z-10 h-full flex flex-col justify-center p-5 sm:p-6 max-w-md ${
          isSaffron ? 'text-[#0B0B0D]' : 'text-white'
        }`}
      >
        <h3 className="text-xl sm:text-2xl font-extrabold mb-1 leading-tight">{title}</h3>
        {subtitle && (
          <p className={`text-sm sm:text-base mb-3 ${isSaffron ? 'text-[#0B0B0D]/80' : 'text-white/90'}`}>
            {subtitle}
          </p>
        )}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold w-fit transition-colors ${
            isSaffron
              ? 'bg-[#0B0B0D] text-[#f0c444] hover:bg-stone-800'
              : 'bg-white text-warm-fg hover:bg-gray-100'
          }`}
        >
          {ctaText}
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </div>
  );

  if (inline) {
    return (
      <Link href={ctaHref} className="contents">
        {content}
      </Link>
    );
  }

  return (
    <section className="mb-6 px-3 sm:px-4 lg:px-6">
      <Link href={ctaHref} className="contents">
        {content}
      </Link>
    </section>
  );
}

/** Backwards-compatible alias. Prefer `<PromoBanner />` for new code. */
export function NativeAdBanner(props: Omit<PromoBannerProps, 'variant'>) {
  return <PromoBanner {...props} variant="image" />;
}
