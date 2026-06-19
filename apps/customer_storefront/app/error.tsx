'use client';

import Link from 'next/link';
import { Button } from './components/ui/Button';

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
      <p className="text-sm text-[#78716c] mb-6 max-w-sm">
        We couldn&apos;t load this page. Please try again.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Link href="/">
          <Button variant="secondary">Go Home</Button>
        </Link>
      </div>
    </div>
  );
}