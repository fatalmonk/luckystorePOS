interface ResponsiveBannerProps {
  desktopImageUrl: string;
  mobileImageUrl: string;
  altText: string;
  /** Whether this banner is the page's LCP image. Most banners should leave this false. */
  priority?: boolean;
  /** Focal point for the crop, e.g. '50% 60%'. */
  objectPosition?: string;
}

export default function ResponsiveBanner({
  desktopImageUrl,
  mobileImageUrl,
  altText,
  priority = false,
  objectPosition = '50% 50%',
}: Readonly<ResponsiveBannerProps>) {
  if (!desktopImageUrl || !mobileImageUrl) return null;

  return (
    <div className="relative w-full max-w-7xl mx-auto overflow-hidden rounded-2xl bg-warm-border-light">
      <picture className="block">
        <source media="(min-width: 768px)" srcSet={desktopImageUrl} />
        <img
          src={mobileImageUrl}
          alt={altText}
          fetchPriority={priority ? 'high' : 'auto'}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          className="block w-full aspect-[4/5] md:aspect-[3/1] object-cover motion-reduce:transition-none"
          style={{ objectPosition }}
        />
      </picture>
    </div>
  );
}
