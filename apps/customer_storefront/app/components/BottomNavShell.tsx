'use client'; // hides bottom nav on /checkout and /order

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export function BottomNavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideOnPaths = ['/checkout', '/order'];
  const shouldHide = hideOnPaths.some((path) => pathname?.startsWith(path));
  if (shouldHide) return null;
  return <>{children}</>;
}
