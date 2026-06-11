'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface HeaderProps {
  cartCount: number;
  onCartClick?: () => void;
}

export function Header({ cartCount, onCartClick }: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const prevCount = useRef(cartCount);

  useEffect(() => setMounted(true), []);

  // Elastic bounce when cart count increases
  useEffect(() => {
    if (mounted && cartCount > prevCount.current) {
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 500);
      return () => clearTimeout(t);
    }
    prevCount.current = cartCount;
  }, [cartCount, mounted]);

  const pathname = usePathname();
  const router = useRouter();
  const hideOnPaths = ['/order'];
  const shouldHide = hideOnPaths.some((path) => pathname?.startsWith(path));

  if (shouldHide) return null;

  const handleSearch = (term: string) => {
    if (term.trim()) {
      router.push(`/category?q=${encodeURIComponent(term)}`);
      setSearchOpen(false);
    }
  };

  return (
    <header
      className="sticky top-0 z-50 h-[68px] bg-[#FFF34D] border-b border-yellow-300 flex items-center px-4 gap-3 flex-shrink-0"
    >
      {/* Left: Logo + Location */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-mark.svg" alt="Lucky Store" className="w-9 h-9 rounded-full bg-white" />
          <span className="font-extrabold text-base text-[#1c1917] hidden sm:block">Lucky Store</span>
        </Link>
        <button className="hidden md:flex flex-col items-start text-xs text-[#5c5200] hover:bg-yellow-400 px-2 py-1 rounded-lg transition-colors">
          <span className="font-medium">Delivery to</span>
          <span className="font-bold">Chattogram ▼</span>
        </button>
      </div>

      {/* Center: Dominant Search */}
      <div className="flex-1 max-w-2xl mx-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search everything..."
            className="w-full h-11 pl-4 pr-12 rounded-full bg-white border-2 border-transparent focus:border-[#0071DC] outline-none text-sm shadow-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const term = (e.target as HTMLInputElement).value;
                if (term.trim()) router.push(`/category?q=${encodeURIComponent(term)}`);
              }
            }}
          />
          <button className="absolute right-1 top-1 h-9 w-9 bg-[#0071DC] rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
            🔍
          </button>
        </div>
      </div>

      {/* Right: Account + Cart */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
          <span className="text-xl">👤</span>
          <span className="hidden lg:block text-sm font-medium">Sign In</span>
        </button>
        <button
          onClick={onCartClick ? onCartClick : () => router.push('/cart')}
          className="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
        >
          <span className="text-xl">🛒</span>
          <span className="hidden lg:block text-sm font-medium">Cart</span>
          {mounted && cartCount > 0 && (
            <span
              className={`absolute -top-1 right-1 min-w-[20px] h-5 bg-[#1c1917] text-[#FFF34D] text-xs font-bold rounded-full grid place-items-center px-1 ${bouncing ? 'cart-bounce' : ''}`}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}