'use client';

import Link from 'next/link';
import { Button } from '../components/ui/Button';

export default function RootError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">⚠️</div>
      <h1 className="text-xl font-extrabold mb-2">Something went wrong</h1>
      <p className="text-sm text-warm-muted mb-6 max-w-sm">
        We couldn&apos;t load this page. Please try again.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Link
          href="/bn"
          className="inline-flex min-h-[44px] items-center justify-center rounded-[14px] border border-warm-border bg-warm-bg px-4 text-sm font-semibold text-warm-fg transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-warm-border-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent active:scale-[0.98]"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
