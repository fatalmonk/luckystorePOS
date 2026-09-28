'use client';

import React from 'react';
import Link from 'next/link';

export default function CategoryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 py-16 text-center">
      <p className="home-section-kicker">The aisle did not load</p>
      <h1 className="home-section-title mt-2">We could not show these products.</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-warm-muted">
        Check your connection and try again. Your cart has not been changed.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="home-primary-action min-h-11 rounded-full px-5 py-2.5 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        >
          Try again
        </button>
        <Link
          href="/category"
          className="inline-flex min-h-11 items-center rounded-full border border-warm-border bg-warm-surface px-5 py-2.5 text-sm font-bold text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        >
          Browse all products
        </Link>
      </div>
    </main>
  );
}
