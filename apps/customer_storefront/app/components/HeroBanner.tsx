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
      className={`mx-4 my-2 rounded-xl overflow-hidden relative h-32 sm:h-40 flex flex-col justify-center p-5 sm:p-6 lg:p-8 z-10 ${
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
        <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold mb-1 leading-tight">{title}</h2>
        <p className="text-xs sm:text-sm opacity-90">{subtitle}</p>
      </div>
    </section>
  );
}
