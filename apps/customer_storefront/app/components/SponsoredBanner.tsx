interface SponsoredBannerProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  bgColor?: string;
  textColor?: string;
}

export function SponsoredBanner({
  title,
  subtitle,
  ctaText = 'Shop now',
  ctaHref = '#',
  bgColor = '#f0f9ff',
  textColor = '#1c1917',
}: SponsoredBannerProps) {
  return (
    <section className="mb-6 px-3 sm:px-4 lg:px-6">
      <a
        href={ctaHref}
        className="block rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 transition-shadow hover:shadow-md"
        style={{ backgroundColor: bgColor }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-0.5">
              Sponsored
            </p>
            <p className={`text-sm sm:text-base font-bold truncate`} style={{ color: textColor }}>
              {title}
            </p>
            {subtitle && (
              <p className="text-xs sm:text-sm opacity-75 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <span
            className="flex-shrink-0 text-sm font-bold underline hover:no-underline"
            style={{ color: textColor }}
          >
            {ctaText}
          </span>
        </div>
      </a>
    </section>
  );
}
