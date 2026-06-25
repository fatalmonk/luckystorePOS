'use client';

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
  bgGradient = 'from-[#ffe302] via-[#ffd524] to-[#f4b61a]',
  bgImage,
}: HeroBannerProps) {
  const hasBgImage = !!bgImage;

  return (
    <section
      className={`w-full mb-6 rounded-[18px] overflow-hidden relative h-40 flex flex-col justify-center p-5 z-10 ${
        hasBgImage ? 'bg-cover bg-center' : `bg-gradient-to-r ${bgGradient}`
      }`}
      style={hasBgImage ? { backgroundImage: `url(${bgImage})` } : {}}
    >
      {hasBgImage && <div className="absolute inset-0 bg-black/20 z-0" />}

      <div className="absolute -top-5 -right-5 w-[100px] h-[100px] bg-white/5 rounded-full z-0" />
      <div className="absolute bottom-0 right-0 w-[140px] h-[140px] bg-white/[0.03] rounded-full translate-x-1/3 translate-y-1/3 z-0" />

      <div className={`relative z-10 max-w-3xl ${hasBgImage || !bgGradient.includes('#fff8c0') ? 'text-white' : 'text-gray-900'}`}>
        {badge && (
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest opacity-85 mb-1.5">
            {badge}
          </p>
        )}
        <h2 className="text-xl lg:text-2xl font-extrabold mb-1 leading-tight">{title}</h2>
        <p className="text-sm opacity-90 mb-3">{subtitle}</p>
        <button 
          onClick={() => window.location.href = '/category?theme=deals'}
          className="inline-flex items-center gap-2 rounded-full bg-[#1c1917] px-4 py-2 text-sm font-bold text-[#ffe302] hover:bg-[#292524] active:scale-[0.97] active:translate-y-[0.5px] transition-all duration-100"
        >
          Shop Now
          <span aria-hidden="true" className="text-base">→</span>
        </button>
      </div>
    </section>
  );
}