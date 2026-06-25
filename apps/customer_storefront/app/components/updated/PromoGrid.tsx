'use client';

import Link from 'next/link';

interface PromoItem {
  id: string;
  type: 'large' | 'small';
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaHref: string;
  bgColor?: string;
  gradient?: string;
  bgImage?: string;
}

const defaultPromos: PromoItem[] = [
  {
    id: 'big-savings',
    type: 'large',
    title: 'Big Savings Week',
    subtitle: 'Up to 50% off essentials',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=deals',
    bgImage: '/images/promo_savings_banner.png',
  },
  {
    id: 'fresh-arrivals',
    type: 'small',
    title: 'Fresh Arrivals',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=new',
    bgImage: '/images/promo_fresh_banner.png',
  },
  {
    id: 'daily-deals',
    type: 'small',
    title: 'Daily Deals',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=deals',
    bgImage: '/images/promo_deals_banner.png',
  },
];

export function PromoGrid({ promos = defaultPromos }: { promos?: PromoItem[] }) {
  const largePromo = promos.find((p) => p.type === 'large');
  const smallPromos = promos.filter((p) => p.type === 'small');

  if (!largePromo) return null;

  const largePromoBgStyle = largePromo.bgImage
    ? { backgroundImage: `url(${largePromo.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : largePromo.gradient
    ? { background: largePromo.gradient }
    : largePromo.bgColor
    ? { background: `linear-gradient(to bottom right, ${largePromo.bgColor}, ${largePromo.bgColor})` }
    : { background: 'linear-gradient(to bottom right, #ffe302, #ffec50)' };

  return (
    <section aria-label="Promotions">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide scroll-edge-mask pb-1">
        <Link
          href={largePromo.ctaHref}
          className="relative flex-shrink-0 snap-start w-[85vw] max-w-[360px] md:w-auto md:max-w-none md:col-span-5 h-48 md:h-56 flex flex-col justify-end overflow-hidden rounded-[18px] p-5 group shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150"
        >
          <div className="absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-105" style={largePromoBgStyle} />
          {largePromo.bgImage && <div className="absolute inset-0 bg-black/25 z-10" />}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-xl z-10" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-yellow-400/20 blur-xl z-10" />
          
          <div className="relative z-20 w-full md:w-4/5">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">{largePromo.title}</h2>
            {largePromo.subtitle && (
              <p className="mb-3 text-sm font-bold text-white opacity-90">{largePromo.subtitle}</p>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-black hover:bg-gray-100 transition-colors">
              {largePromo.ctaText}
              <span className="text-base" aria-hidden="true">→</span>
            </span>
          </div>
        </Link>

        <div className="md:col-span-7 flex flex-col gap-4">
          {smallPromos.map((promo) => {
            const isFresh = promo.id === 'fresh-arrivals';
            const bgStyle = promo.bgImage
              ? { backgroundImage: `url(${promo.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : promo.gradient
              ? { background: promo.gradient }
              : promo.bgColor
              ? { backgroundColor: promo.bgColor }
              : {};
              
            return (
              <Link
                key={promo.id}
                href={promo.ctaHref}
                className="relative flex-shrink-0 snap-start w-[85vw] max-w-[360px] md:w-auto md:max-w-none flex flex-col justify-end overflow-hidden rounded-[18px] p-4 group shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150 min-h-[110px]"
              >
                <div 
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-105 z-0" 
                  style={bgStyle} 
                />
                {promo.bgImage && <div className="absolute inset-0 bg-black/25 z-10" />}
                
                {isFresh ? (
                  <svg className="absolute -bottom-3 -right-3 w-20 h-20 text-orange-900/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2v-5h2v5z" />
                  </svg>
                ) : (
                  <svg className="absolute -bottom-3 -right-3 w-20 h-20 text-green-900/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                  </svg>
                )}
                
                <div className="relative z-20">
                  <h3 className={`text-base md:text-lg font-bold mb-1 ${promo.bgImage ? 'text-white' : 'text-gray-900'}`}>{promo.title}</h3>
                  <span className={`text-xs md:text-sm font-bold underline hover:no-underline transition-colors ${promo.bgImage ? 'text-white' : 'text-gray-800'}`}>{promo.ctaText} →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PromoGridSkeleton() {
  return (
    <section className="mb-8 px-4">
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