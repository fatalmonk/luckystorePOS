'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SearchInput } from './ui/Input';

interface HeaderProps {
  cartCount: number;
}

export function Header({ cartCount }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const hideOnPaths = ['/order'];
  const shouldHide = hideOnPaths.some((path) => pathname?.startsWith(path));

  if (shouldHide) return null;

  return (
    <header
      className="h-[60px] bg-white flex items-center px-4 gap-3.5 flex-shrink-0 z-50 relative"
      style={{
        boxShadow: '0 1px 0 0 linear-gradient(90deg, transparent, #e7e5e4, transparent)',
      }}
    >
      <Link href="/" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 bg-[#dc5f3b] rounded-lg grid place-items-center text-white text-[13px] font-bold font-serif">
          L
        </div>
        <span className="font-extrabold text-base tracking-tight text-[#1c1917]">Lucky Store</span>
      </Link>

      <SearchInput
        onSearch={(term) => {
          if (term.trim()) {
            router.push(`/category?q=${encodeURIComponent(term)}`);
          }
        }}
      />

      <Link
        href="/cart"
        className="relative w-[38px] h-[38px] rounded-[10px] grid place-items-center text-xl text-[#1c1917] hover:bg-[#faf8f5] transition-colors"
      >
        🛒
        {cartCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[17px] h-[17px] bg-[#dc5f3b] text-white text-[10px] font-bold rounded-full grid place-items-center px-1">
            {cartCount}
          </span>
        )}
      </Link>
    </header>
  );
}
