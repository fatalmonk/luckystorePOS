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
        <div className="site-footer-lead grid gap-6 border-b pb-7 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="campaign-kicker">Local since 1947</p>
            <h2 className="campaign-on-image mt-2 text-2xl font-black tracking-[-0.035em] sm:text-5xl">
              Need help with an order?
            </h2>
            <p className="campaign-on-image-muted mt-2 max-w-xl text-xs sm:text-sm leading-5 sm:leading-6">
              Contact the Lucky Store team directly, or use the links below to keep
              shopping and find answers.
            </p>
            <a
              href="mailto:hello@luckystore1947.com"
              className={`campaign-on-image mt-4 inline-flex min-h-[44px] items-center border-b border-warm-accent text-sm font-extrabold break-all transition-colors hover:text-warm-accent sm:text-xl lg:text-2xl ${footerFocus}`}
            >
              hello@luckystore1947.com
            </a>
          </div>

          <div className="site-footer-logo flex min-h-[100px] sm:min-h-[190px] items-center justify-center rounded-[20px] p-3 sm:p-4">
            <Image
              src="/logo-bangla.png"
              alt="লাকি স্টোর — ১৯৪৭"
              width={390}
              height={210}
              className="h-auto max-h-[120px] sm:max-h-[180px] w-full object-contain"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          <nav aria-label="Shop links">
            <h2 className="site-footer-heading">Shop</h2>
            <ul className="mt-2.5 space-y-1">
              <li><Link href="/category" className={`site-footer-link inline-flex min-h-[36px] items-center ${footerFocus}`}>All groceries</Link></li>
              <li><Link href="/category?theme=deals" className={`site-footer-link inline-flex min-h-[36px] items-center ${footerFocus}`}>Weekly deals</Link></li>
              <li><Link href="/category?theme=new" className={`site-footer-link inline-flex min-h-[36px] items-center ${footerFocus}`}>New arrivals</Link></li>
            </ul>
          </nav>

          <nav aria-label="Customer help links">
            <h2 className="site-footer-heading">Help</h2>
            <ul className="mt-2.5 space-y-1">
              <li><Link href="/#how-it-works" className={`site-footer-link inline-flex min-h-[36px] items-center ${footerFocus}`}>How it works</Link></li>
              <li><Link href="/contact" className={`site-footer-link inline-flex min-h-[36px] items-center ${footerFocus}`}>Contact us</Link></li>
              <li><Link href="/privacy" className={`site-footer-link inline-flex min-h-[36px] items-center ${footerFocus}`}>Privacy &amp; terms</Link></li>
            </ul>
          </nav>

          <div>
            <h2 className="site-footer-heading">Visit</h2>
            <address className="campaign-on-image-muted mt-2.5 not-italic text-xs leading-5">
              665 Percival Hill Road<br />
              Emdad Park, Chittagong 4203<br />
              Bangladesh
            </address>
            <a
              href="tel:+8801731944544"
              className={`mt-1.5 inline-flex min-h-[44px] items-center text-xs font-bold text-warm-accent ${footerFocus}`}
            >
              +880 1731-944544
            </a>
          </div>

          <nav aria-label="Social links">
            <h2 className="site-footer-heading">Follow</h2>
            <ul className="mt-2.5 space-y-1">
              <li>
                <a href="https://wa.me/8801731944544" target="_blank" rel="noopener noreferrer" className={`site-footer-link inline-flex min-h-[36px] items-center ${footerFocus}`}>
                  WhatsApp ↗
                </a>
              </li>
              <li>
                <a href="https://facebook.com/luckystore1947" target="_blank" rel="noopener noreferrer" className={`site-footer-link inline-flex min-h-[36px] items-center ${footerFocus}`}>
                  Facebook ↗
                </a>
              </li>
              <li>
                <a href="https://instagram.com/luckystore1947" target="_blank" rel="noopener noreferrer" className={`site-footer-link inline-flex min-h-[36px] items-center ${footerFocus}`}>
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

        <div className="site-footer-bottom flex flex-col gap-2 border-t border-warm-border/30 pt-5 text-xs font-semibold sm:flex-row sm:items-center sm:justify-between">
          <span>© Lucky Store 1947</span>
          <span>Chittagong, Bangladesh · Shop local</span>
        </div>
      </div>
    </footer>
  );
}
