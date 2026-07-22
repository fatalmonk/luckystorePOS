'use client';

import Link from 'next/link';
import { responsiveHeroBanner } from '../lib/imageUrl';

export function CampaignGrid() {
  const primaryHero = responsiveHeroBanner('promo_welcome_v2', 'Welcome to Lucky Store');
  const secondaryBanner = responsiveHeroBanner('promo_buldak', 'Buldak Spicy Ramen');
  const iceCreamTile = responsiveHeroBanner('promo_ice_cream', 'Monsoon Ice Cream');
  const cookingTile = responsiveHeroBanner('promo_cooking', 'Cooking Essentials');

  return (
    <section aria-label="Campaign highlights" className="space-y-3 sm:space-y-4">
      {/* Desktop Layout: Grid 12 cols | Mobile Layout: Primary full, then 2 col sub-grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
        {/* Primary Campaign Banner (Large 7/12 on desktop) */}
        <Link
          href="/category"
          className="md:col-span-7 group relative overflow-hidden rounded-[24px] bg-warm-surface border border-warm-border/60 shadow-warm-sm hover:shadow-warm-md transition-all duration-300 min-h-[220px] sm:min-h-[280px] flex flex-col justify-end p-5 sm:p-7"
        >
          <picture className="absolute inset-0 w-full h-full">
            {primaryHero.sources?.map((s, idx) => (
              <source key={idx} srcSet={s.srcSet} type={s.type} media={s.media} />
            ))}
            <img
              src={primaryHero.src}
              srcSet={primaryHero.srcSet}
              sizes="(max-width: 768px) 100vw, 50vw"
              alt={primaryHero.alt || 'Welcome to Lucky Store'}
              className="w-full h-full object-cover object-[50%_64%] group-hover:scale-105 transition-transform duration-500"
              loading="eager"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative z-10 space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full bg-warm-accent text-warm-fg text-[11px] font-black uppercase tracking-wider">
              Since 1947
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-sm">
              Welcome to Lucky Store
            </h2>
            <p className="text-xs sm:text-sm text-gray-200 line-clamp-2 max-w-md">
              Fresh groceries delivered daily across Chittagong.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-warm-accent text-warm-fg text-xs font-extrabold group-hover:bg-warm-accent-hover transition-colors shadow-sm">
                Start Shopping →
              </span>
            </div>
          </div>
        </Link>

        {/* Right side container on desktop: Secondary wide + 2 supporting tiles */}
        <div className="md:col-span-5 flex flex-col gap-3 sm:gap-4">
          {/* Secondary Campaign Banner — Buldak Spicy Ramen */}
          <Link
            href="/search?q=buldak"
            className="group relative overflow-hidden rounded-[20px] bg-warm-surface border border-warm-border/60 shadow-warm-sm hover:shadow-warm-md transition-all duration-300 min-h-[120px] sm:min-h-[135px] flex flex-col justify-end p-4"
          >
            <picture className="absolute inset-0 w-full h-full">
              {secondaryBanner.sources?.map((s, idx) => (
                <source key={idx} srcSet={s.srcSet} type={s.type} media={s.media} />
              ))}
              <img
                src={secondaryBanner.src}
                srcSet={secondaryBanner.srcSet}
                sizes="(max-width: 768px) 100vw, 40vw"
                alt={secondaryBanner.alt || 'Buldak Spicy Ramen'}
                className="w-full h-full object-cover object-[50%_60%] group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-warm-accent uppercase tracking-wider">
                  Hot &amp; Spicy
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">50% off on Buldak Ramen !</h3>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-white/90 text-warm-fg text-xs font-extrabold group-hover:bg-white transition-colors">
                Shop Now →
              </span>
            </div>
          </Link>

          {/* Two Supporting Campaign Tiles (2-col grid on both desktop and mobile) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1">
            <Link
              href="/category/ice-cream"
              className="group relative overflow-hidden rounded-[20px] bg-warm-surface border border-warm-border/60 shadow-warm-sm hover:shadow-warm-md transition-all duration-300 min-h-[110px] sm:min-h-[130px] flex flex-col justify-end p-3.5"
            >
              <picture className="absolute inset-0 w-full h-full">
                {iceCreamTile.sources?.map((s, idx) => (
                  <source key={idx} srcSet={s.srcSet} type={s.type} media={s.media} />
                ))}
                <img
                  src={iceCreamTile.src}
                  srcSet={iceCreamTile.srcSet}
                  sizes="(max-width: 768px) 50vw, 20vw"
                  alt={iceCreamTile.alt || 'Ice Cream Deals'}
                  className="w-full h-full object-cover object-left group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="relative z-10">
                <span className="text-[9px] font-bold text-warm-accent uppercase">Sweet Deals</span>
                <h4 className="text-xs sm:text-sm font-extrabold text-white line-clamp-1">
                  Monsoon Ice Cream
                </h4>
              </div>
            </Link>

            <Link
              href="/category/cooking-essentials"
              className="group relative overflow-hidden rounded-[20px] bg-warm-surface border border-warm-border/60 shadow-warm-sm hover:shadow-warm-md transition-all duration-300 min-h-[110px] sm:min-h-[130px] flex flex-col justify-end p-3.5"
            >
              <picture className="absolute inset-0 w-full h-full">
                {cookingTile.sources?.map((s, idx) => (
                  <source key={idx} srcSet={s.srcSet} type={s.type} media={s.media} />
                ))}
                <img
                  src={cookingTile.src}
                  srcSet={cookingTile.srcSet}
                  sizes="(max-width: 768px) 50vw, 20vw"
                  alt={cookingTile.alt || 'Cooking Essentials'}
                  className="w-full h-full object-cover object-[50%_60%] group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="relative z-10">
                <span className="text-[9px] font-bold text-warm-accent uppercase">Kitchen</span>
                <h4 className="text-xs sm:text-sm font-extrabold text-white line-clamp-1">
                  Cooking Essentials
                </h4>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
