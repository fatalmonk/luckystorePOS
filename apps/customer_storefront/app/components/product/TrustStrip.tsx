'use client';

interface TrustStripProps {
  className?: string;
}

/**
 * Compact trust strip for the product detail page.
 * Surfaces delivery, COD, and support reassurance without cluttering the CTA.
 */
export function TrustStrip({ className = '' }: TrustStripProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
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
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
        <span>Free delivery in Chittagong</span>
      </div>

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
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5a8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span>WhatsApp support</span>
      </div>
    </div>
  );
}
