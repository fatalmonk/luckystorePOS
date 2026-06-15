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
}

const defaultPromos: PromoItem[] = [
  {
    id: 'big-savings',
    type: 'large',
    title: 'Big Savings Week',
    subtitle: 'Up to 50% off essentials',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=deals',
    bgColor: '#1e293b',
    gradient: 'linear-gradient(135deg, #E8B84B 0%, #D4941A 40%, #1e293b 100%)',
  },
  {
    id: 'fresh-arrivals',
    type: 'small',
    title: 'Fresh Arrivals',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=new',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },
  {
    id: 'daily-deals',
    type: 'small',
    title: 'Daily Deals',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=deals',
    gradient: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
  },
];

export function PromoGrid({ promos = defaultPromos }: { promos?: PromoItem[] }) {
  const largePromo = promos.find((p) => p.type === 'large');
  const smallPromos = promos.filter((p) => p.type === 'small');

  if (!largePromo) return null;

  const largePromoBgStyle = largePromo.gradient
    ? { background: largePromo.gradient }
    : largePromo.bgColor
    ? { background: `linear-gradient(to bottom right, ${largePromo.bgColor}, ${largePromo.bgColor})` }
    : { background: 'linear-gradient(to bottom right, #FFF34D, #FBEF51)' };

  return (
    <section className="mb-8" aria-label="Promotions">
      <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide scroll-edge-mask px-4 sm:px-6 lg:px-8 xl:px-10 pb-1">
        <Link
          href={largePromo.ctaHref}
          className="relative flex-shrink-0 snap-start w-[85vw] max-w-[360px] md:w-auto md:max-w-none md:col-span-2 h-48 md:h-64 flex flex-col justify-end overflow-hidden rounded-[18px] p-5 group shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-105" style={largePromoBgStyle} />
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-xl z-10" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-yellow-400/20 blur-xl z-10" />
          
          <div className="relative z-20 w-full md:w-3/4">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{largePromo.title}</h2>
            {largePromo.subtitle && (
              <p className="mb-4 text-lg font-bold text-white opacity-90">{largePromo.subtitle}</p>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black hover:bg-gray-100 transition-colors press-feedback">
              {largePromo.ctaText}
              <span className="text-lg" aria-hidden="true">→</span>
            </span>
          </div>
        </Link>

        {smallPromos.map((promo) => {
          const isFresh = promo.id === 'fresh-arrivals';
          const bgStyle = promo.gradient
            ? { background: promo.gradient }
            : promo.bgColor
            ? { backgroundColor: promo.bgColor }
            : {};
            
          return (
            <Link
              key={promo.id}
              href={promo.ctaHref}
              className="relative flex-shrink-0 snap-start w-[70vw] max-w-[280px] md:w-auto md:max-w-none md:col-span-1 flex flex-col justify-end overflow-hidden rounded-[18px] p-5 group shadow-sm hover:shadow-md transition-shadow min-h-[140px]"
            >
              <div 
                className="absolute inset-0 transition-transform duration-500 group-hover:scale-105 z-0" 
                style={bgStyle} 
              />
              
              {isFresh ? (
                <svg className="absolute -bottom-4 -right-4 w-28 h-28 text-orange-900/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2v-5h2v5z" />
                </svg>
              ) : (
                <svg className="absolute -bottom-4 -right-4 w-28 h-28 text-green-900/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                </svg>
              )}
              
              <div className="relative z-20">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{promo.title}</h3>
                <span className="text-sm font-bold text-gray-800 underline hover:no-underline transition-colors">{promo.ctaText} →</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

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
