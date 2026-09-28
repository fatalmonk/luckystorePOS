import Link from 'next/link';

function SearchIcon({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">
        <SearchIcon size={56} />
      </div>
      <h1 className="text-xl font-extrabold mb-2">Page not found</h1>
      <p className="text-sm text-warm-muted mb-6 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/bn"
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[14px] bg-warm-accent px-4 text-sm font-semibold text-warm-fg transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent active:scale-[0.98]"
      >
        Start Shopping
      </Link>
    </div>
  );
}
