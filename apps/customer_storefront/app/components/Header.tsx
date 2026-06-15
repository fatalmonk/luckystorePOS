import Link from 'next/link';
import Image from 'next/image';
import { HeaderCartButton } from './HeaderCartButton';
import { HeaderSearch } from './HeaderSearch';

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-[68px] bg-[#ffe721] border-b border-yellow-300 flex items-center px-4 gap-3 flex-shrink-0">
      {/* Left: Logo + Location */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 min-h-[44px]">
          <Image
            src="/logo-mark.svg"
            alt="Lucky Store"
            width={36}
            height={36}
            className="rounded-full bg-white"
            priority
          />
          <span className="font-extrabold text-base text-[#1c1917] hidden sm:block">Lucky Store</span>
        </Link>
        <button
          type="button"
          className="hidden md:flex flex-col items-start text-xs text-[#1c1917] hover:bg-yellow-400/60 px-2 py-1 rounded-lg transition-colors min-h-[44px] justify-center"
        >
          <span className="text-[9px] uppercase tracking-wider text-[#1c1917]/70 font-semibold">Delivery to</span>
          <span className="font-semibold text-[#1c1917]/90 flex items-center gap-0.5">Chattogram <span className="text-[10px] opacity-70">▼</span></span>
        </button>
      </div>

      {/* Center: Search form (real <form> + client enhancements) */}
      <HeaderSearch />

      {/* Right: Account + Cart */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          className="flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
        >
          <span aria-hidden="true" className="text-xl">👤</span>
          <span className="hidden lg:block text-sm font-medium">Sign In</span>
        </button>
        <HeaderCartButton />
      </div>
    </header>
  );
}
