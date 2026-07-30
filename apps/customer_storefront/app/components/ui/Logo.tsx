import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  href?: string;
  variant?: 'default' | 'white';
}

export function Logo({ className = '', href = '/', variant = 'default' }: LogoProps) {
  const isWhite = variant === 'white';

  const content = (
    <div className={`flex items-center justify-center select-none group py-0.5 ${className}`}>
      {/* Light theme logo */}
      <Image
        src="/logo-main.png"
        alt="Lucky Store 1947"
        width={210}
        height={48}
        priority
        className={`h-8 sm:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02] ${
          isWhite ? 'hidden' : 'block dark:hidden'
        }`}
      />
      {/* Dark theme / inverse logo */}
      <Image
        src="/logo-main-inverse.png"
        alt="Lucky Store 1947"
        width={210}
        height={48}
        priority
        className={`h-8 sm:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02] ${
          isWhite ? 'block' : 'hidden dark:block'
        }`}
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center min-h-[44px] shrink-0 my-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent rounded-lg" aria-label="Lucky Store 1947">
        {content}
      </Link>
    );
  }

  return content;
}
