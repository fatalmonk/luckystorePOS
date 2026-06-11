'use client';

import Image from 'next/image';
import Link from 'next/link';

interface PromoItem {
  id: string;
  type: 'large' | 'small';
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaHref: string;
  bgColor?: string;
  bgImage?: string;
  gradient?: string;
}

const defaultPromos: PromoItem[] = [
  {
    id: 'big-savings',
    type: 'large',
    title: 'Big Savings Week',
    subtitle: 'Up to 50% off essentials',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=deals',
    bgImage: '/promo-large.jpg',
    gradient: 'from-black/70 to-transparent',
  },
  {
    id: 'fresh-arrivals',
    type: 'small',
    title: 'Fresh Arrivals',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=new',
    bgColor: '#fee2e2',
    gradient: undefined,
  },
  {
    id: 'daily-deals',
    type: 'small',
    title: 'Daily Deals',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=deals',
    bgColor: '#dcfce7',
    gradient: undefined,
  },
];

export function PromoGrid({ promos = defaultPromos }: { promos?: PromoItem[] }) {
  const largePromo = promos.find((p) => p.type === 'large');
  const smallPromos = promos.filter((p) => p.type === 'small');

  if (!largePromo) return null;

  // Compute styles outside JSX to avoid parser issues
  const largePromoBgStyle = largePromo.bgImage
    ? {}
    : largePromo.bgColor
    ? { background: `linear-gradient(to bottom right, ${largePromo.bgColor}, ${largePromo.bgColor})` }
    : { background: 'linear-gradient(to bottom right, #FFF34D, #FBEF51)' };

  const largePromoGradient = largePromo.gradient || 'from-black/70 to-transparent';

  return (
    <section className="mb-8 px-4 sm:px-6 lg:px-8 xl:px-10" aria-label="Promotions">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Large Promo */}
        <Link
          href={largePromo.ctaHref}
          className="relative col-span-1 md:col-span-2 h-64 flex flex-col justify-end overflow-hidden rounded-[18px] p-5 group"
        >
          {largePromo.bgImage ? (
            <>
              <Image
                src={largePromo.bgImage}
                alt=""
                fill
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                priority
              />
              <div className={`absolute inset-0 ${largePromoGradient} z-10`} />
            </>
          ) : (
            <div className="absolute inset-0 z-0" style={largePromoBgStyle} />
          )}
          <div className="relative z-20 w-full md:w-3/4">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {largePromo.title}
            </h2>
            {largePromo.subtitle && (
              <p className="mb-4 text-lg font-bold text-white opacity-90">
                {largePromo.subtitle}
              </p>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black hover:bg-gray-100 transition-colors">
              {largePromo.ctaText}
              <span className="text-lg">→</span>
            </span>
          </div>
        </Link>

        {/* Two Stacked Small Promos */}
        <div className="col-span-1 flex flex-col gap-4">
          {smallPromos.map((promo) => (
            <Link
              key={promo.id}
              href={promo.ctaHref}
              className="relative flex flex-1 flex-col justify-end overflow-hidden rounded-[18px] p-4 group"
              style={promo.bgColor ? { backgroundColor: promo.bgColor } : {}}
            >
              {promo.bgImage && (
                <>
                  <Image
                    src={promo.bgImage}
                    alt=""
                    fill
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                </>
              )}
              <div className="relative z-10">
                <h3 className="text-lg font-bold text-black mb-2">
                  {promo.title}
                </h3>
                <span className="text-sm font-bold underline hover:no-underline transition-colors">
                  {promo.ctaText}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Skeleton for PromoGrid
export function PromoGridSkeleton() {
  return (
    <section className="mb-8 px-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="col-span-1 md:col-span-2 h-64 rounded-[18px] bg-gray-200 animate-pulse" />
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex-1 rounded-[18px] bg-gray-200 animate-pulse" />
          <div className="flex-1 rounded-[18px] bg-gray-200 animate-pulse" />
        </div>
      </div>
    </section>
  );
}