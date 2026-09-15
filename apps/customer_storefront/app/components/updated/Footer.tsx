import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Phone,
  EnvelopeSimple,
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
  { label: 'DELIVERY INFO', href: '/delivery' },
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
    <footer className="site-footer mt-6 w-full border-t border-[var(--color-campaign-border)] pb-[calc(5rem+env(safe-area-inset-bottom))] font-body sm:mt-10 md:pb-6">
      <div className="bg-warm-accent text-warm-accent-text">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 sm:px-8 sm:py-7 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8 lg:px-12">
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-3xl">Ready for the weekly shop?</h2>
            <p className="mt-1 text-sm sm:text-base">Everyday groceries, delivered with care.</p>
          </div>
          <Link href="/category" className="inline-flex min-h-12 items-center justify-center gap-4 rounded-warm-md bg-[#171a1d] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#30363b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171a1d] sm:justify-self-start lg:justify-self-end">
            Shop groceries online <ArrowRight size={20} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-8 sm:pt-10 lg:px-12">
        <div className="grid gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-12 xl:gap-8">
          <div className="min-w-0 xl:col-span-5">
            <Logo className="[&_img]:!h-10 sm:[&_img]:!h-12" />

            <p className="site-footer-muted mt-4 max-w-md text-sm leading-6 sm:mt-6 sm:text-[15px] sm:leading-7">
              Provisions for the Bengali hearth — pantry staples, fragrant tea, and daily comforts delivered with care across Chittagong since 1947.
            </p>

            <address className="mt-4 flex flex-col items-start not-italic sm:mt-6">
              <a
                href="tel:+8801731944544"
                className={`site-footer-link gap-3 text-sm ${footerFocus}`}
              >
                <Phone size={18} aria-hidden="true" className="shrink-0" />
                +880 1731 944544
              </a>
              <a
                href="mailto:hello@luckystore1947.com"
                className={`site-footer-link gap-3 break-all text-sm ${footerFocus}`}
              >
                <EnvelopeSimple size={18} aria-hidden="true" className="shrink-0" />
                hello@luckystore1947.com
              </a>
            </address>

            <div className="mt-4 flex items-center gap-2" aria-label="Lucky Store on social media">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#171a1d] text-white transition-colors hover:bg-warm-accent hover:text-warm-accent-text ${footerFocus}`}
                >
                  <Icon size={20} weight="fill" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-5 border-t border-[var(--color-campaign-border)] pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0 xl:col-span-4">
            <nav aria-labelledby="footer-shop-heading">
              <h2 id="footer-shop-heading" className="site-footer-heading">
                Shop
              </h2>
              <ul className="mt-2 sm:mt-4">
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
              <ul className="mt-2 sm:mt-4">
                {helpLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} prefetch={link.href === '/wishlist' ? false : undefined} className={`site-footer-link ${footerFocus}`}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="relative hidden min-h-64 xl:col-span-3 xl:block" aria-hidden="true">
            <Image src="/images/footer-grocery-tote.png" alt="" fill sizes="260px" className="object-contain object-bottom" />
          </div>
        </div>

        <div className="site-footer-bottom mt-8 border-t pt-4 sm:mt-10 sm:pt-6">
          <div className="grid grid-cols-2 items-center gap-x-2 text-[11px] font-medium min-[400px]:text-xs sm:text-[13px]">
            <p className="text-left">© Lucky Store. Est. 1947.</p>
            <p className="justify-self-end text-right">Chittagong, Bangladesh</p>
            <div className="col-span-2 mt-2 flex flex-wrap items-center justify-center gap-x-4 border-t border-[var(--color-campaign-border)] sm:justify-start sm:gap-x-6">
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
          </div>
        </div>
      </div>
    </footer>
  );
}
