'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  cartCount: number;
  cartTotal?: number;
  onCartPillClick?: () => void;
}

const navItems = [
  { icon: '🏠', label: 'Home', href: '/' },
  { icon: '📂', label: 'Browse', href: '/category' },
  { icon: '🛒', label: 'Cart', href: '/cart', showBadge: true },
  { icon: '📋', label: 'Orders', href: '/order' },
];

export function BottomNav({ cartCount, cartTotal = 0, onCartPillClick }: BottomNavProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hideOnPaths = ['/checkout', '/order'];
  const shouldHide = hideOnPaths.some((path) => pathname?.startsWith(path));
  if (shouldHide) return null;

  return (
    <>
      {/* Floating cart summary pill */}
      {mounted && cartCount > 0 && (
        <button
          onClick={onCartPillClick}
          className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-40
            glass border rounded-full px-5 py-2.5
            flex items-center gap-3
            shadow-lg hover:shadow-xl
            transition-all duration-300 ease-out
            animate-[fadeUp_0.3s_ease]
            press-feedback"
          aria-label="View cart summary"
        >
          <span className="text-sm font-bold text-[#1c1917]">
            {cartCount} {cartCount === 1 ? 'item' : 'items'}
          </span>
          <span className="w-px h-4 bg-[#e7e5e4]" />
          <span className="text-sm font-extrabold text-[#FFF34D]">৳{cartTotal}</span>
        </button>
      )}

      {/* Nav bar */}
      <nav className="h-[68px] glass border-t flex items-center justify-around flex-shrink-0 z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2 px-5 relative transition-all duration-200 ${
                isActive ? 'text-[#FFF34D]' : 'text-[#a8a29e] hover:text-[#78716c]'
              }`}
            >
              {/* Active pill indicator */}
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#FFF34D] rounded-full" />
              )}
              <span className="text-[22px] leading-none">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
              {item.showBadge && mounted && cartCount > 0 && (
                <span className="absolute top-1 right-3 min-w-[16px] h-4 bg-[#FFF34D] text-[#5c5200] text-[10px] font-bold rounded-full grid place-items-center px-1">
                  {cartCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
