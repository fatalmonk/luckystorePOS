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
    <div className={`flex items-center select-none group ${className}`}>
      {/* Light theme logo */}
      <Image
        src="/logo-main.png"
        alt="Lucky Store 1947"
        width={210}
        height={48}
        priority
        className={`h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105 ${
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
        className={`h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105 ${
          isWhite ? 'block' : 'hidden dark:block'
        }`}
      />
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