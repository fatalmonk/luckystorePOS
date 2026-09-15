import Link from 'next/link';

export function HeritageParallax() {
  return (
    <section
      aria-labelledby="heritage-title"
      className="mt-8 border-y border-warm-border py-6 sm:mt-20 sm:py-10 lg:mt-20"
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-wider text-warm-muted">
            Roots & Heritage
          </p>
          <h2
            id="heritage-title"
            className="mt-2 text-balance font-display text-2xl font-black leading-tight text-warm-fg sm:text-3xl"
          >
            Serving Chittagong since 1947.
          </h2>
          <p className="mt-3 text-sm leading-6 text-warm-muted sm:text-base sm:leading-7">
            Long before grocery apps, there was a counter, a scale, and an unshakeable promise of purity. For over 7 decades, <span translate="no">Lucky Store</span> has stood with the families of Chittagong—delivering honest provisions from hands you have always known.
          </p>
        </div>

        <Link
          href="/category"
          className="inline-flex min-h-11 w-max items-center justify-center rounded-warm-md border border-warm-muted bg-warm-surface px-5 py-2.5 text-sm font-extrabold text-warm-fg transition-colors hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        >
          Shop groceries
        </Link>
      </div>
    </section>
  );
}
