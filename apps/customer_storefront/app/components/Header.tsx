'use client';

import Link from 'next/link';
import { MagnifyingGlass, User, Heart } from '@phosphor-icons/react';
import { HeaderCartButton } from './HeaderCartButton';
import { HeaderSearch } from './HeaderSearch';
import { Logo } from './ui/Logo';
import { useState, useEffect } from 'react';
import { getLocalWishlist } from '../lib/wishlistHelpers';
import { useToast } from './Toast';

export function Header() {
  const [wishlistCount, setWishlistCount] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    const updateWishlistCount = () => setWishlistCount(getLocalWishlist().length);
    updateWishlistCount();
    window.addEventListener('storage', updateWishlistCount);
    return () => window.removeEventListener('storage', updateWishlistCount);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full px-3 sm:px-4 pt-3 pb-1 bg-warm-bg">
      <div className="max-w-5xl mx-auto h-[64px] bg-white border border-warm-border rounded-full flex items-center px-4 sm:px-6 justify-between gap-2 sm:gap-4 shadow-sm hover:shadow-md transition-all duration-300">
        {/* Logo */}
        <Logo />

        {/* Search */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <HeaderSearch />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Mobile search button */}
          <Link
            href="/search"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-warm-bg text-warm-fg transition-colors"
            aria-label="Search page"
          >
            <MagnifyingGlass weight="bold" size={18} aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => showToast('Sign in coming soon')}
            className="flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-full hover:bg-warm-bg transition-colors text-warm-fg"
            aria-label="Sign In"
          >
            <User weight="bold" size={16} aria-hidden="true" />
            <span className="hidden sm:block text-xs font-bold">Sign In</span>
          </button>

          <Link
            href="/wishlist"
            className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-warm-bg transition-colors text-warm-fg"
            aria-label="Wishlist"
          >
            <Heart weight="bold" size={18} aria-hidden="true" />
            {wishlistCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center border-2 border-white">
                {wishlistCount}
              </span>
            )}
          </Link>

          <HeaderCartButton />
        </div>
      </div>

      {/* Category Pills Strip - Floating below the main nav bar */}
      <div className="max-w-5xl mx-auto mt-2 px-2">
        <nav className="flex flex-nowrap items-center overflow-x-auto h-[38px] gap-1.5 scrollbar-hide py-0.5">
          <Link
            href="/category?theme=deals"
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-warm-fg text-warm-accent text-xs font-bold hover:bg-warm-fg transition-colors"
          >
            Deals
          </Link>
          <Link
            href="/category?theme=bestsellers"
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white text-warm-fg border border-warm-border text-xs font-bold hover:bg-stone-50 transition-colors"
          >
            Best Sellers
          </Link>
          <Link
            href="/category?theme=new"
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white text-warm-fg border border-warm-border text-xs font-bold hover:bg-stone-50 transition-colors"
          >
            New
          </Link>
          <span className="hidden sm:inline-flex items-center text-[10px] font-semibold text-warm-muted ml-auto whitespace-nowrap">
            Delivery in as little as 1 hour
          </span>
        </nav>
      </div>
    </header>
  );
}
