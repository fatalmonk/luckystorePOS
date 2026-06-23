import Link from 'next/link';
import Image from 'next/image';
import { HeaderCartButton } from './HeaderCartButton';
import { HeaderSearch } from './HeaderSearch';

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex-shrink-0">
      {/* Top strip: logo + search + actions on warm neutral to reduce yellow fatigue */}
      <div className="h-[64px] bg-[#fffdf5] border-b border-[#e7e5e4] flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 min-h-[44px] flex-shrink-0">
          <Image
            src="/logo-mark.svg"
            alt="Lucky Store"
            width={34}
            height={34}
            className="rounded-full bg-[#ffe302]"
            priority
          />
          <span className="font-extrabold text-[15px] text-[#1c1917] hidden sm:block tracking-tight">
            Lucky Store
          </span>
        </Link>

        {/* Search */}
        <div className="flex-1 min-w-0">
          <HeaderSearch />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            className="flex items-center gap-2 min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl hover:bg-[#f5f5f4] transition-colors"
            aria-label="Sign In"
          >
            <span aria-hidden="true" className="text-lg">👤</span>
            <span className="hidden lg:block text-sm font-medium">Sign In</span>
          </button>
          <HeaderCartButton />
        </div>
      </div>

      {/* Sub-nav strip: yellow accent for thematic pills only */}
      <nav className="bg-[#ffe302] flex flex-nowrap items-center overflow-x-auto px-3 sm:px-4 py-2 md:py-0 h-[44px] gap-2 z-40 relative scrollbar-hide">
        <Link
          href="/category?theme=deals"
          className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#1c1917] text-[#ffe302] text-xs font-bold hover:bg-[#292524] transition-colors"
        >
          Deals
        </Link>
        <Link
          href="/category?theme=bestsellers"
          className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/70 text-[#1c1917] text-xs font-bold hover:bg-white transition-colors"
        >
          Best Sellers
        </Link>
        <Link
          href="/category?theme=new"
          className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/70 text-[#1c1917] text-xs font-bold hover:bg-white transition-colors"
        >
          New
        </Link>
        <span className="hidden sm:inline-flex items-center text-[10px] sm:text-xs font-semibold text-[#1c1917]/80 whitespace-nowrap flex-shrink-0">
          Delivery in as soon as 1 hour
        </span>
      </nav>
    </header>
  );
}
