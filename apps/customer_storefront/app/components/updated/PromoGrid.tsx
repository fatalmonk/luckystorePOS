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
    bgImage: 'https://images.luckystore1947.com/banners/promo_savings_banner.webp',
  },
  {
    id: 'fresh-arrivals',
    type: 'small',
    title: 'Fresh Arrivals',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=new',
    bgImage: 'https://images.luckystore1947.com/banners/promo_fresh_banner.webp',
  },
  {
    id: 'daily-deals',
    type: 'small',
    title: 'Daily Deals',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=deals',
    bgImage: 'https://images.luckystore1947.com/banners/promo_deals_banner.webp',
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
    <section aria-label="Promotions" className="px-4 py-2">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide scroll-edge-mask pb-1">
        
        {/* Large Promo Card */}
        <Link
          href={largePromo.ctaHref}
          className="relative flex-shrink-0 snap-start w-[88vw] max-w-[380px] md:w-auto md:max-w-none md:col-span-6 h-52 md:h-60 flex flex-col justify-end overflow-hidden rounded-[24px] p-6 group border border-stone-200/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        >
          {/* Background image & overlay */}
          <div className="absolute inset-0 z-0 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105" style={largePromoBgStyle} />
          {largePromo.bgImage && <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-stone-900/30 to-transparent z-10" />}
          
          {/* Liquid Glass inner borders & glows */}
          <div className="absolute inset-0 z-20 rounded-[24px] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl z-10" />
          
          <div className="relative z-20 w-full">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-yellow-400 text-stone-950 mb-2">
              Featured Deal
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-1 font-display tracking-tight">{largePromo.title}</h2>
            {largePromo.subtitle && (
              <p className="mb-4 text-sm font-medium text-stone-100/90 leading-relaxed max-w-[30ch]">{largePromo.subtitle}</p>
            )}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-stone-950 hover:bg-stone-50 active:scale-95 transition-all">
              {largePromo.ctaText}
              <span className="text-sm transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
            </div>
          </div>
        </Link>

        {/* Small Promo Cards Stack */}
        <div className="md:col-span-6 flex flex-col gap-4">
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
                className="relative flex-shrink-0 snap-start w-[88vw] max-w-[380px] md:w-auto md:max-w-none flex flex-col justify-end overflow-hidden rounded-[20px] p-5 group border border-stone-200/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] min-h-[116px] flex-1"
              >
                <div 
                  className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 z-0" 
                  style={bgStyle} 
                />
                {promo.bgImage && <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-stone-900/20 to-transparent z-10" />}
                
                {/* Liquid Glass border refraction */}
                <div className="absolute inset-0 z-20 rounded-[20px] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] pointer-events-none" />
                
                {/* Premium Custom SVG Icons */}
                {isFresh ? (
                  <svg className="absolute -bottom-2 -right-2 w-20 h-20 text-white/10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 z-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3m14-7l4 4m-4 0l-4-4m-2 10l-4 4m4 0l4-4" />
                  </svg>
                ) : (
                  <svg className="absolute -bottom-2 -right-2 w-20 h-20 text-white/10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 z-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.5 1.5 0 002.122 0l4.318-4.318a1.5 1.5 0 000-2.122L11.16 3.659A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                )}
                
                <div className="relative z-20">
                  <h3 className={`text-lg font-bold mb-1 font-display tracking-tight leading-none ${
                    promo.bgImage ? 'text-white' : 'text-stone-900'
                  }`}>{promo.title}</h3>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold transition-colors ${
                    promo.bgImage ? 'text-yellow-300 group-hover:text-yellow-200' : 'text-stone-700 group-hover:text-stone-900'
                  }`}>
                    {promo.ctaText}
                    <span className="text-sm transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                  </span>
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
        <div className="col-span-1 md:col-span-2 h-64 rounded-[24px] bg-stone-100 animate-pulse" />
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex-1 rounded-[20px] bg-stone-100 animate-pulse min-h-[116px]" />
          <div className="flex-1 rounded-[20px] bg-stone-100 animate-pulse min-h-[116px]" />
        </div>
      </div>
    </section>
  );
}