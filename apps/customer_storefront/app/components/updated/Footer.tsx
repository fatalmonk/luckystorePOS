'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const footerFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-campaign-surface)]';

export function Footer() {
  return (
    <footer className="site-footer mt-16 block w-full overflow-hidden px-4 pb-28 pt-10 font-body sm:px-6 sm:pb-8 sm:pt-14 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="site-footer-lead grid gap-7 border-b pb-9 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="campaign-kicker">Local since 1947</p>
            <h2 className="campaign-on-image mt-3 text-3xl font-black tracking-[-0.035em] sm:text-5xl">
              Need a hand with your order?
            </h2>
            <p className="campaign-on-image-muted mt-3 max-w-xl text-sm leading-6">
              Talk to the Lucky Store team directly, or find the essentials you need through
              the links below.
            </p>
            <a
              href="mailto:hello@luckystore1947.com"
              className={`campaign-on-image mt-6 inline-flex min-h-11 items-center border-b border-warm-accent text-lg font-extrabold transition-colors hover:text-warm-accent sm:text-2xl ${footerFocus}`}
            >
              hello@luckystore1947.com
            </a>
          </div>

          <div className="site-footer-logo flex min-h-[150px] items-center justify-center rounded-[22px] p-4 sm:min-h-[190px]">
            <Image
              src="/logo-bangla.png"
              alt="লাকি স্টোর — ১৯৪৭"
              width={390}
              height={210}
              className="h-auto max-h-[180px] w-full object-contain"
            />
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <nav aria-label="Shop links">
            <h2 className="site-footer-heading">Shop</h2>
            <ul className="mt-3 space-y-1">
              <li><Link href="/category" className={`site-footer-link ${footerFocus}`}>All groceries</Link></li>
              <li><Link href="/category?theme=deals" className={`site-footer-link ${footerFocus}`}>Weekly deals</Link></li>
              <li><Link href="/category?theme=new" className={`site-footer-link ${footerFocus}`}>New arrivals</Link></li>
            </ul>
          </nav>

          <nav aria-label="Customer help links">
            <h2 className="site-footer-heading">Help</h2>
            <ul className="mt-3 space-y-1">
              <li><Link href="/#how-it-works" className={`site-footer-link ${footerFocus}`}>How it works</Link></li>
              <li><Link href="/contact" className={`site-footer-link ${footerFocus}`}>Contact us</Link></li>
              <li><Link href="/privacy" className={`site-footer-link ${footerFocus}`}>Privacy &amp; terms</Link></li>
            </ul>
          </nav>

          <div>
            <h2 className="site-footer-heading">Visit</h2>
            <address className="campaign-on-image-muted mt-4 not-italic text-xs leading-6">
              665 Percival Hill Road<br />
              Emdad Park, Chittagong 4203<br />
              Bangladesh
            </address>
            <a
              href="tel:+8801731944544"
              className={`mt-2 inline-flex min-h-11 items-center text-xs font-bold text-warm-accent ${footerFocus}`}
            >
              +880 1731-944544
            </a>
          </div>

          <nav aria-label="Social links">
            <h2 className="site-footer-heading">Follow</h2>
            <ul className="mt-3 space-y-1">
              <li>
                <a href="https://wa.me/8801731944544" target="_blank" rel="noopener noreferrer" className={`site-footer-link ${footerFocus}`}>
                  WhatsApp ↗
                </a>
              </li>
              <li>
                <a href="https://facebook.com/luckystore1947" target="_blank" rel="noopener noreferrer" className={`site-footer-link ${footerFocus}`}>
                  Facebook ↗
                </a>
              </li>
              <li>
                <a href="https://instagram.com/luckystore1947" target="_blank" rel="noopener noreferrer" className={`site-footer-link ${footerFocus}`}>
                  Instagram ↗
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="hidden overflow-hidden py-2 text-center select-none sm:block" aria-hidden="true">
          <p className="campaign-on-image whitespace-nowrap text-[11.4vw] font-black leading-none tracking-[-0.065em] opacity-95 xl:text-[9rem]">
            LUCKY STORE
          </p>
        </div>

        <div className="site-footer-bottom flex flex-col gap-2 border-t pt-5 text-xs font-semibold sm:flex-row sm:items-center sm:justify-between">
          <span>© Lucky Store 1947</span>
          <span>Chittagong, Bangladesh · Shop local</span>
        </div>
      </div>
    </footer>
  );
}
