import React from 'react';
import Link from 'next/link';

const footerFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-surface';

const socialLinks = [
  {
    label: 'Facebook',
    href: 'https://facebook.com/luckystore1947',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/luckystore1947',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/8801731944544',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
  },
];

const col1Links = [
  { label: 'GROCERIES', href: '/category' },
  { label: 'WEEKLY DEALS', href: '/category?theme=deals' },
  { label: 'NEW ARRIVALS', href: '/category?theme=new' },
  { label: 'CATEGORIES', href: '/category' },
  { label: 'ABOUT US', href: '/contact' },
];

const col2Links = [
  { label: 'CONTACT', href: '/contact' },
  { label: 'TRACK ORDER', href: '/order' },
  { label: 'PRIVACY & TERMS', href: '/privacy' },
  { label: 'SECURITY POLICY', href: '/security-policy' },
  { label: 'FAQ', href: '/contact#faq' },
];

export function Footer() {
  return (
    <footer className="site-footer mt-12 w-full border-t border-warm-border/30 px-5 pb-24 pt-10 font-body text-xs sm:px-8 sm:pb-8 sm:pt-14 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.3fr_1fr_1fr] md:gap-12 lg:gap-20">
          {/* Left Column: Brand & Direct Contact */}
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-black uppercase tracking-widest text-warm-fg sm:text-3xl">
              LUCKY STORE
            </h2>

            <p className="max-w-sm font-body text-sm leading-relaxed text-warm-muted">
              Do you have any questions, suggestions, or just want to say hello? We are here to help.
            </p>

            <div className="space-y-1.5 pt-2">
              <div>
                <a
                  href="tel:+8801731944544"
                  className={`inline-block border-b border-warm-fg/40 font-body text-sm font-medium tracking-wide text-warm-fg transition-colors hover:border-warm-accent hover:text-warm-accent ${footerFocus}`}
                >
                  +880 1731 944544
                </a>
              </div>
              <div>
                <a
                  href="mailto:hello@luckystore1947.com"
                  className={`inline-block border-b border-warm-fg/40 font-body text-sm font-medium tracking-wide text-warm-fg transition-colors hover:border-warm-accent hover:text-warm-accent ${footerFocus}`}
                >
                  hello@luckystore1947.com
                </a>
              </div>
            </div>
          </div>

          {/* Center & Right Navigation Grid */}
          <div className="grid grid-cols-2 gap-8 md:col-span-2 md:gap-12 lg:gap-16">
            {/* Nav Column 1 */}
            <nav aria-label="Main Navigation">
              <ul className="space-y-4">
                {col1Links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={`inline-flex min-h-11 items-center font-display text-base font-extrabold uppercase tracking-wider text-warm-fg transition-colors hover:text-warm-accent sm:text-lg ${footerFocus}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Nav Column 2 */}
            <nav aria-label="Secondary Navigation">
              <ul className="space-y-4">
                {col2Links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={`inline-flex min-h-11 items-center font-display text-base font-extrabold uppercase tracking-wider text-warm-fg transition-colors hover:text-warm-accent sm:text-lg ${footerFocus}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Stay Connected (Left) & Shop Groceries Online (Right) - Same Line */}
        <div className="mt-12 flex flex-col gap-6 border-t border-warm-border/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="font-body text-xs font-medium text-warm-muted">Stay connected</span>
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-warm-fg transition-colors hover:text-warm-accent ${footerFocus}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <Link
            href="/category"
            className={`group inline-flex items-center gap-2 font-body text-sm font-semibold tracking-wide text-warm-fg transition-colors hover:text-warm-accent ${footerFocus}`}
          >
            <span>Shop groceries online</span>
            <span className="font-display text-base transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              ↗
            </span>
          </Link>
        </div>

        {/* Legal Bottom Bar */}
        <div className="mt-8 border-t border-warm-border/30 pt-6">
          <div className="flex flex-col gap-3 font-body text-[11px] font-semibold uppercase tracking-wider text-warm-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              COPYRIGHT {new Date().getFullYear()} LUCKY STORE – ALL RIGHTS RESERVED
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/privacy" className={`hover:text-warm-accent ${footerFocus}`}>
                PRIVACY &amp; TERMS
              </Link>
              <span>|</span>
              <Link href="/security-policy" className={`hover:text-warm-accent ${footerFocus}`}>
                SECURITY
              </Link>
              <span>|</span>
              <span>CHITTAGONG, BANGLADESH</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}