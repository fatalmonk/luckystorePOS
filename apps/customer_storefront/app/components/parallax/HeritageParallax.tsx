import Link from 'next/link';

export function HeritageParallax() {
  return (
    <section
      aria-labelledby="heritage-title"
      className="mt-14 border-y border-warm-border py-8 sm:mt-20 sm:py-10 lg:mt-20"
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-wider text-warm-muted">
            Chittagong grocery
          </p>
          <h2
            id="heritage-title"
            className="mt-2 font-display text-2xl font-black leading-tight text-warm-fg sm:text-3xl"
          >
            Serving Chittagong since 1947.
          </h2>
          <p className="mt-3 text-sm leading-6 text-warm-muted sm:text-base sm:leading-7">
            Browse pantry staples, snacks, dairy, and household essentials from a
            local store built around everyday grocery runs.
          </p>
        </div>

        <Link
          href="/category"
          className="inline-flex min-h-11 w-max items-center justify-center rounded-warm-md bg-warm-accent px-5 py-2.5 text-sm font-extrabold text-warm-accent-text transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        >
          Shop groceries
        </Link>
      </div>
    </section>
  );
}
