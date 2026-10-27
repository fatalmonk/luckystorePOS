'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocaleFromPathname, stripLocalePrefix } from '../lib/i18n/config';

export function WhatsAppFloat() {
  const pathname = usePathname();
  const normalizedPath = pathname ? stripLocalePrefix(pathname) : '';
  const hideOnPaths = ['/checkout', '/order'];
  const shouldHide = hideOnPaths.some((path) => normalizedPath.startsWith(path));

  if (shouldHide) return null;

  const locale = getLocaleFromPathname(pathname);
  const message = encodeURIComponent(
    locale === 'bn'
      ? 'হ্যালো লাকি স্টোর, আমার অর্ডার/পণ্য সম্পর্কে কিছু জানার ছিল।'
      : 'Hi Lucky Store, I have a question about my order/products.'
  );

  return (
    <Link
      href={`https://wa.me/8801731944544?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={locale === 'bn' ? 'হোয়াটসঅ্যাপে যোগাযোগ করুন (নতুন ট্যাবে খুলবে)' : 'Chat on WhatsApp (opens in a new tab)'}
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.35),0_2px_8px_rgba(0,0,0,0.12)] transition-[transform,box-shadow] duration-200 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_12px_28px_rgba(37,211,102,0.45)] active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 md:bottom-6 md:right-6 md:h-13 md:w-13"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.66 13.93c-.24.67-1.37 1.26-1.91 1.34-.51.08-1.01.1-1.48-.1-.34-.14-.79-.33-1.36-.66-2.39-1.25-3.94-4.17-4.06-4.36-.12-.19-.97-1.28-.97-2.44 0-1.16.6-1.72.83-1.96.23-.23.51-.29.68-.29.17 0 .34 0 .49.01.16 0 .37-.06.57.44.2.5.77 1.83.84 1.96.07.14.12.3.02.48-.1.19-.15.31-.3.48-.15.17-.31.36-.44.49-.14.13-.28.27-.13.53.15.26.67 1.1 1.44 1.78.99.88 1.82 1.15 2.21 1.28.26.08.46.06.63-.09.19-.18.72-.84.91-1.13.19-.29.38-.24.57-.14.19.1 1.2.57 1.41.67.21.1.35.15.4.24.05.08.05.48-.19 1.15z" />
      </svg>
    </Link>
  );
}
