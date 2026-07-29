import Link from 'next/link';

interface LogoProps {
  className?: string;
  href?: string;
  variant?: 'default' | 'white';
}

export function Logo({ className = '', href = '/', variant = 'default' }: LogoProps) {
  const isWhite = variant === 'white';
  
  // FIX 1: Simplified dark mode logic. 
  // Since your tailwind.config uses [data-theme="dark"], standard 'dark:' works perfectly.
  // We also use 'fill-warm-fg' instead of hardcoded hex to respect your theme variables.
  const iconAccentClass = isWhite 
    ? "fill-white" 
    : "fill-warm-fg dark:fill-white";

  const content = (
    <div className={`flex items-center gap-2 select-none group ${className}`}>
      {/* Brand Mark Icon */}
      {/* FIX 2: Added aria-hidden="true" so screen readers skip the complex SVG path */}
      <svg 
        className="h-7 sm:h-8 w-auto flex-shrink-0 transition-transform duration-300 group-hover:scale-105" 
        viewBox="417 25 610 755" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g transform="matrix(1, 0, 0, 1, 417, 25)">
          {/* Handle/Strap - Dynamic Color */}
          <path className={iconAccentClass} d="M 216.664062 180.183594 C 226.667969 180.183594 234.785156 172.066406 234.785156 162.0625 L 234.785156 126.972656 C 234.785156 81.589844 271.761719 44.613281 317.289062 44.613281 C 362.816406 44.613281 399.792969 81.589844 399.792969 126.972656 L 399.792969 162.0625 C 399.792969 172.066406 407.910156 180.183594 417.914062 180.183594 C 427.921875 180.183594 436.039062 172.066406 436.039062 162.0625 L 436.039062 131.902344 C 436.039062 68.539062 388.480469 12.859375 325.117188 8.65625 C 256.246094 4.160156 198.539062 58.96875 198.539062 126.972656 L 198.539062 162.0625 C 198.539062 172.066406 206.65625 180.183594 216.664062 180.183594 Z M 216.664062 180.183594 "/>
          
          {/* Bag Body - Brand Color (Saffron) */}
          <path fill="#f0c444" d="M 597.855469 651.417969 L 557.980469 263.558594 C 554.792969 232.671875 528.835938 209.328125 497.808594 209.328125 L 136.769531 209.328125 C 105.742188 209.328125 79.785156 232.816406 76.597656 263.558594 L 66.59375 360.125 C 59.921875 424.9375 121.546875 475.539062 183.75 456.546875 L 217.53125 446.25 C 255.957031 434.507812 298.875 453.9375 313.953125 496.566406 C 319.175781 511.355469 318.449219 527.59375 313.808594 542.671875 L 298.875 591.390625 C 278.285156 658.667969 328.597656 726.671875 398.921875 726.671875 L 529.996094 726.671875 C 570.449219 726.527344 602.058594 691.582031 597.855469 651.417969 Z M 597.855469 651.417969 "/>
          
          {/* Tag/Label - Dynamic Color */}
          <path className={iconAccentClass} d="M 230.292969 487.71875 L 34.984375 547.3125 C 6.5625 556.011719 4.535156 595.453125 31.9375 607.050781 L 78.480469 626.625 C 103.132812 637.066406 122.851562 656.640625 133.289062 681.433594 L 152.863281 727.976562 C 164.464844 755.382812 203.902344 753.351562 212.601562 724.933594 L 272.195312 529.625 C 280.171875 503.960938 256.101562 479.890625 230.292969 487.71875 Z M 230.292969 487.71875 "/>
        </g>
      </svg>
      
      {/* Wordmark */}
      <span className={`font-display font-black tracking-tighter text-sm sm:text-lg leading-none transition-colors duration-200 uppercase ${
        isWhite ? 'text-white group-hover:text-white/80' : 'text-warm-fg group-hover:text-warm-muted'
      }`}>
        LUCKY STORE
      </span>
      
      {/* Yellow Dot */}
      <span 
        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-warm-accent transition-transform duration-300 group-hover:scale-125 flex-shrink-0" 
        aria-hidden="true" 
      />
      
      {/* Monospace Year — hidden on mobile */}
      <span className={`hidden sm:inline font-mono text-xs font-medium mt-0.5 flex-shrink-0 ${
        isWhite ? 'text-white/70' : 'text-warm-muted'
      }`}>
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