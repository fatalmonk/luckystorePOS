'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  cartCount: number;
}

const navItems = [
  { icon: '🏠', label: 'Home', href: '/' },
  { icon: '📂', label: 'Browse', href: '/category' },
  { icon: '🛒', label: 'Cart', href: '/cart', showBadge: true },
  { icon: '📋', label: 'Orders', href: '/order' },
];

export function BottomNav({ cartCount }: BottomNavProps) {
  const pathname = usePathname();

  // Hide on checkout and order confirmation
  const hideOnPaths = ['/checkout', '/order'];
  const shouldHide = hideOnPaths.some((path) => pathname?.startsWith(path));

  if (shouldHide) return null;

  return (
    <nav className="h-[68px] bg-white border-t border-[#f5f5f4] flex items-center justify-around flex-shrink-0 z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-2 px-5 relative transition-colors ${
              isActive ? 'text-[#dc5f3b]' : 'text-[#a8a29e]'
            }`}
          >
            <span className="text-[22px] leading-none">{item.icon}</span>
            <span className="text-[10px] font-semibold">{item.label}</span>
            {item.showBadge && cartCount > 0 && (
              <span className="absolute top-1 right-3 min-w-[16px] h-4 bg-[#dc5f3b] text-white text-[10px] font-bold rounded-full grid place-items-center px-1">
                {cartCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
