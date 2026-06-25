import Link from 'next/link';

interface HeroBannerProps {
  title: string;
  subtitle: string;
  badge?: string;
  bgGradient?: string;
  bgImage?: string;
}

export function HeroBanner({
  title,
  subtitle,
  badge,
  bgGradient = 'from-[#ffe302] via-[#ffd700] to-[#f5b800]',
  bgImage,
}: HeroBannerProps) {
  const hasBgImage = !!bgImage;

  return (
    <section
      className={`w-full mb-6 rounded-[24px] overflow-hidden relative h-44 flex flex-col justify-center p-6 border border-stone-200/40 shadow-sm hover:shadow-md transition-shadow duration-300 ${
        hasBgImage ? 'bg-cover bg-center' : `bg-gradient-to-r ${bgGradient}`
      }`}
      style={hasBgImage ? { backgroundImage: `url(${bgImage})` } : {}}
    >
      {/* Dark overlay for rich legibility on background images */}
      {hasBgImage && <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-950/40 to-transparent z-0" />}

      {/* Decorative premium radial vector blobs */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl z-0 pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-40 h-40 bg-black/5 rounded-full blur-2xl z-0 pointer-events-none" />

      {/* Content wrapper */}
      <div className="relative z-10 max-w-lg">
        {badge && (
          <p className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block mb-2 ${
            hasBgImage ? 'text-white bg-white/20 backdrop-blur-md' : 'text-stone-900 bg-stone-950/10'
          }`}>
            {badge}
          </p>
        )}
        <h2 className={`text-2xl lg:text-3xl font-black mb-1.5 leading-none font-display tracking-tight ${
          hasBgImage ? 'text-white' : 'text-stone-950'
        }`}>
          {title}
        </h2>
        <p className={`text-xs sm:text-sm font-medium mb-4 max-w-[45ch] ${
          hasBgImage ? 'text-stone-100/90' : 'text-stone-700/90'
        }`}>
          {subtitle}
        </p>
        <Link 
          href="/category?theme=deals"
          className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-4.5 py-1.5 text-xs font-bold text-white hover:bg-stone-900 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-sm hover:shadow"
        >
          Shop Now
          <span aria-hidden="true" className="text-sm transition-transform duration-300 group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </section>
  );
}