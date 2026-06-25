import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  href?: string;
  collapsed?: boolean;
}

export function Logo({ className = '', href = '/', collapsed = false }: LogoProps) {
  const content = collapsed ? (
    <div className={`flex items-center justify-center w-9 h-9 rounded-xl bg-warm-accent shadow-sm flex-shrink-0 select-none group transition-transform duration-200 active:scale-95 ${className}`}>
      <span className="font-display font-black text-warm-fg text-lg tracking-tighter">L</span>
    </div>
  ) : (
    <div className={`flex items-center gap-1.5 select-none group ${className}`}>
      {/* Wordmark */}
      <span className="font-display font-black text-warm-fg tracking-tighter text-lg leading-none transition-colors duration-200 group-hover:text-warm-muted uppercase">
        LUCKY STORE
      </span>
      {/* Yellow Dot */}
      <span 
        className="w-2 h-2 rounded-full bg-warm-accent transition-transform duration-300 group-hover:scale-125 flex-shrink-0" 
        aria-hidden="true" 
      />
      {/* Monospace Year */}
      <span className="font-mono text-xs text-warm-muted font-medium mt-0.5 flex-shrink-0">
        1947
      </span>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="flex items-center min-h-[44px] flex-shrink-0" aria-label="Lucky Store 1947">
        {content}
      </Link>
    );
  }

  return content;
}
