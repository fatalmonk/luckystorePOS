import React from 'react';
import Link from 'next/link';
import {
  FacebookLogo,
  InstagramLogo,
  WhatsappLogo,
} from '@phosphor-icons/react/dist/ssr';
import { Logo } from '../ui/Logo';

const footerFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-campaign-surface)]';

const socialLinks = [
  {
    label: 'Facebook',
    href: 'https://facebook.com/luckystore1947',
    icon: FacebookLogo,
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/luckystore1947',
    icon: InstagramLogo,
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/8801731944544',
    icon: WhatsappLogo,
  },
] as const;

const shopLinks = [
  { label: 'GROCERIES', href: '/category' },
  { label: 'WEEKLY DEALS', href: '/category?theme=deals' },
  { label: 'NEW ARRIVALS', href: '/category?theme=new' },
  { label: 'COOKING ESSENTIALS', href: '/category/cooking-essentials' },
] as const;

const helpLinks = [
  { label: 'ABOUT US', href: '/contact#about' },
  { label: 'CONTACT', href: '/contact' },
  { label: 'FAQ', href: '/contact#faq' },
  { label: 'WISHLIST', href: '/wishlist' },
] as const;

const legalLinks = [
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Terms of service', href: '/terms' },
  { label: 'Security policy', href: '/security-policy' },
] as const;

export function Footer() {
  return (
    <footer className="site-footer mt-10 w-full border-t border-[var(--color-campaign-border)] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-10 font-body sm:mt-14 sm:px-8 sm:pb-8 sm:pt-14 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8 lg:gap-12">
          <div className="md:col-span-5 lg:col-span-6">
            <Logo className="[&_img]:!h-10 sm:[&_img]:!h-12" />

            <p className="site-footer-muted mt-5 max-w-md text-sm leading-6 sm:text-[15px] sm:leading-7">
              Daily groceries, pantry staples, snacks, dairy, and household essentials for Chittagong homes.
            </p>

            <address className="mt-5 flex flex-col items-start not-italic">
              <a
                href="tel:+8801731944544"
                className={`site-footer-link text-sm ${footerFocus}`}
              >
                +880 1731 944544
              </a>
              <a
                href="mailto:hello@luckystore1947.com"
                className={`site-footer-link text-sm ${footerFocus}`}
              >
                hello@luckystore1947.com
              </a>
            </address>

            <div className="mt-5 flex items-center gap-2" aria-label="Lucky Store on social media">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className={`site-footer-text inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-campaign-border)] bg-[var(--color-campaign-control)] transition-colors hover:border-warm-accent hover:bg-[var(--color-campaign-control-hover)] hover:text-warm-accent active:translate-y-px ${footerFocus}`}
                >
                  <Icon size={20} weight="fill" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 border-t border-[var(--color-campaign-border)] pt-8 md:col-span-7 md:border-t-0 md:pt-5 lg:col-span-6 lg:gap-x-12 lg:pt-6">
            <nav aria-labelledby="footer-shop-heading">
              <h2 id="footer-shop-heading" className="site-footer-heading">
                Shop
              </h2>
              <ul className="mt-3">
                {shopLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={`site-footer-link ${footerFocus}`}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-labelledby="footer-help-heading">
              <h2 id="footer-help-heading" className="site-footer-heading">
                Help
              </h2>
              <ul className="mt-3">
                {helpLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={`site-footer-link ${footerFocus}`}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-5 rounded-warm-lg border border-[var(--color-campaign-border)] bg-[var(--color-campaign-control)] p-5 sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="site-footer-text font-display text-lg font-extrabold tracking-tight sm:text-xl">
              Ready for the weekly shop?
            </p>
            <p className="site-footer-muted mt-1 max-w-xl text-sm leading-6">
              Browse everyday groceries and order online from Lucky Store.
            </p>
          </div>
          <Link
            href="/category"
            className={`inline-flex min-h-12 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-warm-md bg-warm-accent px-6 py-3 text-center text-sm font-extrabold text-warm-accent-text transition-colors hover:bg-warm-accent-hover active:translate-y-px sm:w-auto ${footerFocus}`}
          >
            Shop groceries online
          </Link>
        </div>

        <div className="site-footer-bottom mt-8 border-t pt-5">
          <div className="flex flex-col gap-3 text-[13px] font-medium sm:flex-row sm:items-center sm:justify-between">
            <p>© Lucky Store. Est. 1947.</p>
            <div className="flex flex-wrap items-center gap-x-5">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`inline-flex min-h-11 items-center transition-colors hover:text-warm-accent ${footerFocus}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <p>Chittagong, Bangladesh</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
