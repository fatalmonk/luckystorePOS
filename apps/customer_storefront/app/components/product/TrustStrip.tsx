import React from 'react';
import Link from 'next/link';

interface TrustStripProps {
  className?: string;
}

/**
 * Compact trust strip for the product detail page.
 * Surfaces delivery policy, COD, and doorstep inspection reassurance linking to /delivery.
 */
export function TrustStrip({ className = '' }: TrustStripProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Link
        href="/delivery"
        className="inline-flex items-center gap-1.5 text-xs text-warm-muted hover:text-warm-fg transition-colors group"
      >
        <svg
          className="w-4 h-4 shrink-0 text-warm-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
        <span className="underline decoration-warm-border group-hover:decoration-warm-fg underline-offset-2">
          Free delivery ৳500+ (1 km)
        </span>
      </Link>

      <span className="text-warm-border" aria-hidden="true">·</span>

      <div className="inline-flex items-center gap-1.5 text-xs text-warm-muted">
        <svg
          className="w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
          <circle cx="7.5" cy="15.5" r="0.5" fill="currentColor" />
          <circle cx="16.5" cy="15.5" r="0.5" fill="currentColor" />
        </svg>
        <span>Cash on delivery</span>
      </div>

      <span className="text-warm-border" aria-hidden="true">·</span>

      <Link
        href="/delivery"
        className="inline-flex items-center gap-1.5 text-xs text-warm-muted hover:text-warm-fg transition-colors group"
      >
        <svg
          className="w-4 h-4 shrink-0 text-warm-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span className="underline decoration-warm-border group-hover:decoration-warm-fg underline-offset-2">
          Doorstep inspection
        </span>
      </Link>
    </div>
  );
}
