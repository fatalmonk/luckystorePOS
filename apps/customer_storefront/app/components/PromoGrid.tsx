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
    bgColor: '#fee2e2',
  },
  {
    id: 'daily-deals',
    type: 'small',
    title: 'Daily Deals',
    ctaText: 'Shop now',
    ctaHref: '/category?theme=deals',
    bgColor: '#dcfce7',
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
    <section className="mb-8 px-4 sm:px-6 lg:px-8 xl:px-10" aria-label="Promotions">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href={largePromo.ctaHref}
          className="relative col-span-1 md:col-span-2 h-64 flex flex-col justify-end overflow-hidden rounded-[18px] p-5 group"
        >
          <div className="absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-105" style={largePromoBgStyle} />
          <div className="relative z-20 w-full md:w-3/4">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{largePromo.title}</h2>
            {largePromo.subtitle && (
              <p className="mb-4 text-lg font-bold text-white opacity-90">{largePromo.subtitle}</p>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black hover:bg-gray-100 transition-colors">
              {largePromo.ctaText}
              <span className="text-lg" aria-hidden="true">→</span>
            </span>
          </div>
        </Link>

        <div className="col-span-1 flex flex-col gap-4">
          {smallPromos.map((promo) => (
            <Link
              key={promo.id}
              href={promo.ctaHref}
              className="relative flex flex-1 flex-col justify-end overflow-hidden rounded-[18px] p-4 group"
              style={promo.bgColor ? { backgroundColor: promo.bgColor } : {}}
            >
              {promo.bgColor && (
                <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" style={{ backgroundColor: promo.bgColor }} />
              )}
              <div className="relative z-10">
                <h3 className="text-lg font-bold text-black mb-2">{promo.title}</h3>
                <span className="text-sm font-bold underline hover:no-underline transition-colors">{promo.ctaText}</span>
              </div>
            </Link>
          ))}
        </div>
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
