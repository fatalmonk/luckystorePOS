'use client'; // path-based active state + cart badge on Cart link

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartContext } from './CartProvider';

interface ActiveLinkProps {
  href: string;
  icon: string;
  label: string;
  showBadge?: boolean;
}

export function ActiveLink({ href, icon, label, showBadge }: ActiveLinkProps) {
  const pathname = usePathname();
  const { totalItems } = useCartContext();
  const isActive = pathname === href || (href !== '/' && pathname?.startsWith(`${href}/`));
  const badgeCount = showBadge ? totalItems : 0;

  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 min-h-[44px] px-5 relative transition-all duration-200 ${
        isActive ? 'text-[#FFF34D]' : 'text-gray-600 hover:text-gray-800'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && (
        <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#FFF34D] rounded-full" />
      )}
      <span className="text-[22px] leading-none" aria-hidden="true">{icon}</span>
      <span className="text-[10px] font-semibold">{label}</span>
      {badgeCount > 0 && (
        <span className="absolute top-1 right-3 min-w-[16px] h-4 bg-[#FFF34D] text-[#5c5200] text-[10px] font-bold rounded-full grid place-items-center px-1">
          {badgeCount}
        </span>
      )}
    </Link>
  );
}
