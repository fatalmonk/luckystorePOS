
import Link from 'next/link';
import Image from 'next/image';
import { img } from '../../lib/imageUrl';

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
    bgImage: img('/images/promo_savings_banner.webp'),
  },
  {
    id: 'fresh-arrivals',
    type: 'small',
    title: 'Fresh Arrivals',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=new',
    bgImage: img('/images/promo_fresh_banner.webp'),
  },
  {
    id: 'daily-deals',
    type: 'small',
    title: 'Daily Deals',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=deals',
    bgImage: img('/images/promo_deals_banner.webp'),
  },
];

export function PromoGrid({ promos = defaultPromos }: { promos?: PromoItem[] }) {
  const largePromo = promos.find((p) => p.type === 'large');
  const smallPromos = promos.filter((p) => p.type === 'small');

  if (!largePromo) return null;

  const allPromos = [largePromo, ...smallPromos];

  return (
    <section aria-label="Promotions" className="px-4 py-2">
      {/* Mobile: single horizontal carousel. Desktop: 2-col grid. */}
      <div className="flex md:grid md:grid-cols-12 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide scroll-edge-mask pb-1">
        
        {allPromos.map((promo, i) => {
          const isLarge = i === 0;
          const isFresh = promo.id === 'fresh-arrivals';

          return (
            <Link
              key={promo.id}
              href={promo.ctaHref}
              className={`relative flex-shrink-0 snap-start w-[80vw] max-w-[340px] md:w-auto md:max-w-none flex flex-col justify-end overflow-hidden rounded-[24px] p-5 sm:p-6 group border border-warm-border/50 shadow-warm-sm hover:shadow-warm-md hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                isLarge
                  ? 'md:col-span-6 h-40 md:h-60'
                  : 'md:col-span-3 h-40 md:h-60'
              }`}
            >
              {/* Background image & overlay */}
              {promo.bgImage ? (
                <Image
                  src={promo.bgImage}
                  alt=""
                  fill
                  sizes={isLarge ? '(max-width: 768px) 80vw, 50vw' : '(max-width: 768px) 80vw, 25vw'}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 z-0"
                />
              ) : (
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-warm-accent to-warm-accent-dark transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105" />
              )}
              {promo.bgImage && (
                <div className={`absolute inset-0 z-10 ${
                  isLarge
                    ? 'bg-gradient-to-t from-warm-fg/85 via-warm-fg/50 to-warm-fg/20'
                    : 'bg-gradient-to-t from-warm-fg/80 via-warm-fg/40 to-warm-fg/15'
                }`} />
              )}
              
              {/* Liquid Glass inner borders & glows */}
              <div className="absolute inset-0 z-20 rounded-[24px] border border-warm-surface/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] pointer-events-none" />
              {isLarge && (
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-warm-surface/10 blur-2xl z-10" />
              )}

              {/* Decorative SVG for small cards */}
              {!isLarge && (
                isFresh ? (
                  <svg className="absolute -bottom-2 -right-2 w-20 h-20 text-warm-surface/10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 z-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3m14-7l4 4m-4 0l-4-4m-2 10l-4 4m4 0l4-4" />
                  </svg>
                ) : (
                  <svg className="absolute -bottom-2 -right-2 w-20 h-20 text-warm-surface/10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 z-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.5 1.5 0 002.122 0l4.318-4.318a1.5 1.5 0 000-2.122L11.16 3.659A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                )
              )}
              
              <div className="relative z-20 w-full">
                {isLarge && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-warm-accent text-warm-fg mb-2">
                    Featured Deal
                  </span>
                )}
                <h2 className={`font-black text-warm-surface drop-shadow-md leading-tight mb-1 font-display tracking-tight ${
                  isLarge ? 'text-2xl md:text-3xl' : 'text-lg'
                }`}>{promo.title}</h2>
                {promo.subtitle && (
                  <p className="mb-4 text-sm font-medium text-warm-surface/90 drop-shadow leading-relaxed max-w-[30ch]">{promo.subtitle}</p>
                )}
                <div className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  isLarge
                    ? 'bg-warm-surface text-warm-fg hover:bg-warm-surface/90 active:scale-95'
                    : promo.bgImage
                      ? 'text-warm-accent group-hover:text-warm-accent-hover'
                      : 'text-warm-fg group-hover:text-warm-fg'
                }`}>
                  {promo.ctaText}
                  <span className="text-sm transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
                </div>
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
    <section className="mb-8 px-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="col-span-1 md:col-span-2 h-64 rounded-[24px] bg-warm-border-light animate-pulse" />
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex-1 rounded-[20px] bg-warm-border-light animate-pulse min-h-[116px]" />
          <div className="flex-1 rounded-[20px] bg-warm-border-light animate-pulse min-h-[116px]" />
        </div>
      </div>
    </section>
  );
}
