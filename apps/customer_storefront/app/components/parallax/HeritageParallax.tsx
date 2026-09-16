import Link from 'next/link';
import { withLocale, type Locale } from '../../lib/i18n/config';
import { getDictionary } from '../../lib/i18n/dictionaries';

export function HeritageParallax({ locale = 'en' }: { locale?: Locale }) {
  const dict = getDictionary(locale);

  return (
    <section
      aria-labelledby="heritage-title"
      className="mt-8 border-y border-warm-border py-6 sm:mt-20 sm:py-10 lg:mt-20"
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-wider text-warm-muted">
            {dict.heritage.badge}
          </p>
          <h2
            id="heritage-title"
            className="mt-2 text-balance font-display text-2xl font-black leading-tight text-warm-fg sm:text-3xl"
          >
            {dict.heritage.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-warm-muted sm:text-base sm:leading-7">
            {dict.heritage.description}
          </p>
        </div>

        <Link
          href={withLocale('/category', locale)}
          className="inline-flex min-h-11 w-max items-center justify-center rounded-warm-md border border-warm-muted bg-warm-surface px-5 py-2.5 text-sm font-extrabold text-warm-fg transition-colors hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        >
          {dict.heritage.cta}
        </Link>
      </div>
    </section>
  );
}
