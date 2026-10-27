'use client'; // hides bottom nav on /checkout and /order

import React, { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';

export function BottomNavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hideOnPaths = ['/checkout', '/order'];
  const shouldHide = hideOnPaths.some((path) => pathname?.startsWith(path));
  if (shouldHide) return null;

  const content = (
    <div
      data-bottom-nav-shell="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] transition-transform duration-300 md:hidden"
    >
      {children}
    </div>
  );

  if (!mounted || typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
}
