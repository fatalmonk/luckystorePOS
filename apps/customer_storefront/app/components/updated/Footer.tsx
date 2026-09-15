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
  { label: 'Groceries', href: '/category' },
  { label: 'Weekly deals', href: '/category?theme=deals' },
  { label: 'New arrivals', href: '/category?theme=new' },
  { label: 'Cooking essentials', href: '/category/cooking-essentials' },
] as const;

const helpLinks = [
  { label: 'About us', href: '/contact#about' },
  { label: 'Delivery info', href: '/delivery' },
  { label: 'Contact', href: '/contact' },
  { label: 'FAQ', href: '/contact#faq' },
  { label: 'Wishlist', href: '/wishlist' },
] as const;

const legalLinks = [
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Terms of service', href: '/terms' },
  { label: 'Security policy', href: '/security-policy' },
] as const;

export function Footer() {
  return (
    <footer className="site-footer mt-6 w-full border-t border-[var(--color-campaign-border)] pb-[calc(5rem+env(safe-area-inset-bottom))] font-body sm:mt-10 md:pb-6">
      <div className="bg-warm-accent text-[#0B0B0D]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-5 sm:px-8 sm:py-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <div className="flex items-center gap-4">
            <span className="hidden h-[2px] w-7 shrink-0 bg-[#0B0B0D] sm:inline-block" aria-hidden="true" />
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-[#0B0B0D] sm:text-3xl">
                Ready for the weekly shop?
              </h2>
              <p className="mt-1 text-sm text-[#0B0B0D]/85 sm:text-base">
                Everyday groceries, delivered with care.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 sm:gap-8">
            <Link
              href="/category"
              className="inline-flex min-h-12 items-center justify-center gap-4 rounded-lg bg-[#0B0B0D] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#232328] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B0B0D]"
            >
              Shop groceries online <ArrowRight size={20} aria-hidden="true" />
            </Link>
            <div className="hidden items-center gap-2.5 sm:flex" aria-hidden="true">
              <svg width="22" height="26" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[#0B0B0D]">
                <line x1="18" y1="6" x2="8" y2="2" />
                <line x1="17" y1="14" x2="6" y2="14" />
                <line x1="18" y1="22" x2="8" y2="26" />
              </svg>
              <div className="font-display text-xs font-extrabold uppercase leading-tight tracking-wider text-[#0B0B0D]">
                <div>GOOD</div>
                <div>FOOD</div>
                <div>BRIGHTER</div>
                <div>DAYS</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-12 xl:gap-8">
          <div className="min-w-0 xl:col-span-4">
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

            <div className="mt-4 flex items-center gap-2.5" aria-label="Lucky Store on social media">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0B0B0D] text-white transition-colors hover:bg-warm-accent hover:text-warm-accent-text ${footerFocus}`}
                >
                  <Icon size={20} weight="fill" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 pt-2 sm:pt-0 xl:col-span-4">
            <nav aria-labelledby="footer-shop-heading">
              <h2 id="footer-shop-heading" className="text-base font-extrabold tracking-tight text-warm-fg sm:text-lg">
                Shop
              </h2>
              <ul className="mt-3 space-y-2.5 sm:mt-5">
                {shopLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={`site-footer-link !h-auto !min-h-0 py-0.5 text-sm font-medium ${footerFocus}`}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-labelledby="footer-help-heading">
              <h2 id="footer-help-heading" className="text-base font-extrabold tracking-tight text-warm-fg sm:text-lg">
                Help
              </h2>
              <ul className="mt-3 space-y-2.5 sm:mt-5">
                {helpLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} prefetch={link.href === '/wishlist' ? false : undefined} className={`site-footer-link !h-auto !min-h-0 py-0.5 text-sm font-medium ${footerFocus}`}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="relative hidden min-h-64 xl:col-span-4 xl:block" aria-hidden="true">
            <Image src="/images/footer-grocery-tote.png" alt="" fill sizes="380px" className="object-contain object-bottom" />
          </div>
        </div>

        <div className="site-footer-bottom mt-10 border-t pt-5 sm:mt-12 sm:pt-6">
          <div className="flex flex-col gap-3 text-xs sm:text-[13px]">
            <div className="flex items-center justify-between font-medium">
              <p>© Lucky Store. Est. 1947.</p>
              <p>Chittagong, Bangladesh</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-medium">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`transition-colors hover:text-warm-accent ${footerFocus}`}
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
