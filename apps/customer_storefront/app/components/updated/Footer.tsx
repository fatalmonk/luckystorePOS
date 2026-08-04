'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const footerFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-campaign-surface)]';

const socialLinks = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/8801731944544',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/luckystore1947',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/luckystore1947',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
      </svg>
    ),
  },
];

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="site-footer mt-10 block w-full overflow-hidden px-4 pb-28 pt-8 font-body sm:mt-16 sm:px-6 sm:pb-8 sm:pt-14 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8 sm:space-y-10">
        {/* Lead — desktop only */}
        <div className="hidden gap-6 border-b border-warm-border/30 pb-7 sm:grid lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div className="max-w-2xl">
            <h2 className="campaign-on-image text-2xl font-black tracking-tight sm:text-5xl">
              Need help with an order?
            </h2>
            <p className="campaign-on-image-muted mt-2 max-w-xl text-xs leading-5 sm:text-sm sm:leading-6">
              Contact the Lucky Store team directly, or use the links below to keep shopping and find answers.
            </p>
            <a
              href="mailto:hello@luckystore1947.com"
              className={`campaign-on-image mt-4 inline-flex min-h-[44px] items-center border-b border-warm-accent text-sm font-extrabold break-all transition-colors hover:text-warm-accent sm:text-xl lg:text-2xl ${footerFocus}`}
            >
              hello@luckystore1947.com
            </a>
          </div>

          <div className="site-footer-logo flex min-h-[100px] items-center justify-center rounded-[20px] p-3 sm:min-h-[190px] sm:p-4">
            <Image
              src="/logo-bangla.png"
              alt="লাকি স্টোর — ১৯৪৭"
              width={390}
              height={210}
              className="h-auto max-h-[120px] w-full object-contain sm:max-h-[180px]"
            />
          </div>
        </div>

        {/* Links — compact grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 text-sm sm:grid-cols-4 sm:gap-y-8 lg:grid-cols-5">
          <nav aria-label="Shop links" className="col-span-1">
            <h2 className="site-footer-heading text-sm font-black sm:text-xs">Shop</h2>
            <ul className="mt-2 space-y-1">
              <li><Link href="/category" className={`site-footer-link inline-flex min-h-[44px] items-center text-sm sm:min-h-[36px] sm:text-sm ${footerFocus}`}>All groceries</Link></li>
              <li><Link href="/category?theme=deals" className={`site-footer-link inline-flex min-h-[44px] items-center text-sm sm:min-h-[36px] sm:text-sm ${footerFocus}`}>Weekly deals</Link></li>
              <li><Link href="/category?theme=new" className={`site-footer-link inline-flex min-h-[44px] items-center text-sm sm:min-h-[36px] sm:text-sm ${footerFocus}`}>New arrivals</Link></li>
            </ul>
          </nav>

          <nav aria-label="Top categories" className="col-span-1">
            <h2 className="site-footer-heading text-sm font-black sm:text-xs">Categories</h2>
            <ul className="mt-2 space-y-1">
              <li><Link href="/category/oil-and-ghee" className={`site-footer-link inline-flex min-h-[44px] items-center text-sm sm:min-h-[36px] sm:text-sm ${footerFocus}`}>Oil &amp; Ghee</Link></li>
              <li><Link href="/category/rice-and-grain" className={`site-footer-link inline-flex min-h-[44px] items-center text-sm sm:min-h-[36px] sm:text-sm ${footerFocus}`}>Rice &amp; Grains</Link></li>
              <li><Link href="/category/dairy-and-eggs" className={`site-footer-link inline-flex min-h-[44px] items-center text-sm sm:min-h-[36px] sm:text-sm ${footerFocus}`}>Dairy &amp; Eggs</Link></li>
              <li><Link href="/category/snacks" className={`site-footer-link inline-flex min-h-[44px] items-center text-sm sm:min-h-[36px] sm:text-sm ${footerFocus}`}>Snacks</Link></li>
              <li><Link href="/category/cold-beverages" className={`site-footer-link inline-flex min-h-[44px] items-center text-sm sm:min-h-[36px] sm:text-sm ${footerFocus}`}>Beverages</Link></li>
              <li><Link href="/category/personal-care" className={`site-footer-link inline-flex min-h-[44px] items-center text-sm sm:min-h-[36px] sm:text-sm ${footerFocus}`}>Personal Care</Link></li>
            </ul>
          </nav>

          <nav aria-label="Customer help links" className="col-span-1">
            <h2 className="site-footer-heading text-sm font-black sm:text-xs">Help</h2>
            <ul className="mt-2 space-y-1">
              <li><Link href="/contact" className={`site-footer-link inline-flex min-h-[44px] items-center text-sm sm:min-h-[36px] sm:text-sm ${footerFocus}`}>Contact us</Link></li>
              <li><Link href="/order" className={`site-footer-link inline-flex min-h-[44px] items-center text-sm sm:min-h-[36px] sm:text-sm ${footerFocus}`}>Track order</Link></li>
            </ul>
          </nav>

          <div className="col-span-2 sm:col-span-1">
            <h2 className="site-footer-heading text-sm font-black sm:text-xs">Visit</h2>
            <address className="campaign-on-image-muted mt-2 not-italic text-sm leading-6 sm:text-xs sm:leading-5">
              665 Percival Hill Road, Emdad Park<br />
              Chittagong 4203, Bangladesh
            </address>
            <a
              href="https://maps.app.goo.gl/Yd3mAphotMJiVPM97"
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-warm-border/40 bg-warm-surface/50 px-3 py-1.5 text-sm font-bold transition-colors hover:border-warm-accent hover:text-warm-accent sm:text-xs ${footerFocus}`}
            >
              <span className="h-4 w-4"><MapPinIcon /></span>
              Get directions
            </a>
            <a
              href="tel:+880****4544"
              className={`mt-1 inline-flex min-h-11 items-center text-sm font-bold text-warm-accent sm:text-xs ${footerFocus}`}
            >
              +880 1731-944544
            </a>
          </div>

          <nav aria-label="Social links" className="col-span-2 sm:col-span-4 lg:col-span-1">
            <h2 className="site-footer-heading text-sm font-black sm:text-xs">Follow</h2>
            <ul className="mt-2 flex flex-wrap items-center gap-2">
              {socialLinks.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`site-footer-link inline-flex h-12 w-12 items-center justify-center rounded-full border border-warm-border/40 bg-warm-surface/50 transition-colors hover:border-warm-accent hover:text-warm-accent ${footerFocus}`}
                  >
                    <span className="h-5 w-5">{social.icon}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Giant watermark — desktop only */}
        <div className="hidden overflow-hidden py-2 text-center select-none sm:block" aria-hidden="true">
          <p className="campaign-on-image whitespace-nowrap text-[11.4vw] font-black leading-none tracking-[-0.065em] opacity-95 xl:text-[9rem]">
            LUCKY STORE
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-warm-border/30 pt-5 text-xs font-semibold sm:flex-row sm:items-center sm:justify-between sm:text-xs">
          <span>© Lucky Store 1947</span>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/privacy" className={`inline-flex min-h-[44px] items-center underline-offset-2 transition-colors hover:text-warm-accent ${footerFocus}`}>Privacy &amp; terms</Link>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span>Chittagong, Bangladesh · Shop local</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
