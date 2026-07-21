'use client';

import Link from 'next/link';

export function WhatsAppFloat() {
  const message = encodeURIComponent('Hi Lucky Store, I have a question about my order/products.');
  return (
    <Link
      href={`https://wa.me/8801731944544?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-[72px] right-3 z-40 w-12 h-12 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200 md:hidden"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.66 13.93c-.24.67-1.37 1.26-1.91 1.34-.51.08-1.01.1-1.48-.1-.34-.14-.79-.33-1.36-.66-2.39-1.25-3.94-4.17-4.06-4.36-.12-.19-.97-1.28-.97-2.44 0-1.16.6-1.72.83-1.96.23-.23.51-.29.68-.29.17 0 .34 0 .49.01.16 0 .37-.06.57.44.2.5.77 1.83.84 1.96.07.14.12.3.02.48-.1.19-.15.31-.3.48-.15.17-.31.36-.44.49-.14.13-.28.27-.13.53.15.26.67 1.1 1.44 1.78.99.88 1.82 1.15 2.21 1.28.26.08.46.06.63-.09.19-.18.72-.84.91-1.13.19-.29.38-.24.57-.14.19.1 1.2.57 1.41.67.21.1.35.15.4.24.05.08.05.48-.19 1.15z" />
      </svg>
    </Link>
  );
}
