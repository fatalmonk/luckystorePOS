import Link from 'next/link';

interface LogoProps {
  className?: string;
  href?: string;
}

export function Logo({ className = '', href = '/' }: LogoProps) {
  const content = (
    <div className={`flex items-center gap-1.5 select-none group ${className}`}>
      {/* Wordmark */}
      <span className="font-display font-black text-warm-fg tracking-tighter text-sm sm:text-lg leading-none transition-colors duration-200 group-hover:text-warm-muted uppercase">
        LUCKY STORE
      </span>
      {/* Yellow Dot */}
      <span 
        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-warm-accent transition-transform duration-300 group-hover:scale-125 flex-shrink-0" 
        aria-hidden="true" 
      />
      {/* Monospace Year — hidden on mobile */}
      <span className="hidden sm:inline font-mono text-xs text-warm-muted font-medium mt-0.5 flex-shrink-0">
        1947
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center min-h-[44px] flex-shrink-0" aria-label="Lucky Store 1947">
        {content}
      </Link>
    );
  }

  return content;
}
