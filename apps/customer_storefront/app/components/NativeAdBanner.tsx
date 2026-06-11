'use client';

import Image from 'next/image';

interface NativeAdBannerProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  bgImage?: string;
  bgColor?: string;
}

export function NativeAdBanner({
  title,
  subtitle,
  ctaText = 'Shop now',
  ctaHref = '#',
  bgImage,
  bgColor = '#1c1917',
}: NativeAdBannerProps) {
  return (
    <section className="mb-6 px-3 sm:px-4 lg:px-6">
      <a
        href={ctaHref}
        className="block relative rounded-xl overflow-hidden h-40 sm:h-48 group"
      >
        {bgImage ? (
          <Image
            src={bgImage}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: bgColor }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-center p-5 sm:p-6 max-w-md">
          <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-1 leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm sm:text-base text-white/90 mb-3">{subtitle}</p>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#1c1917] w-fit hover:bg-gray-100 transition-colors">
            {ctaText}
            <span>→</span>
          </span>
        </div>
      </a>
    </section>
  );
}
