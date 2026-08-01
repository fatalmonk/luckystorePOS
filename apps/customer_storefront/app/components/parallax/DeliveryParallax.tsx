import React from 'react';
import Link from 'next/link';
import { ParallaxHero } from './ParallaxHero';

export function DeliveryParallax() {
  return (
    <ParallaxHero
      imageUrl="/banners/native_ad_banner_1200.avif"
      imgPosition="50% 48%"
      speed={0.16}
    >
      <section
        aria-labelledby="delivery-parallax-title"
        className="relative isolate flex min-h-[19rem] items-center overflow-hidden px-5 py-7 sm:min-h-[22rem] sm:px-8 sm:py-9 lg:px-12"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(11,11,13,0.55)_0%,rgba(11,11,13,0.35)_38%,rgba(11,11,13,0.12)_68%,rgba(11,11,13,0.05)_100%)]"
        />

        <div className="max-w-lg">
          <p className="campaign-kicker">Delivery in Chittagong</p>
          <h2
            id="delivery-parallax-title"
            className="campaign-on-image mt-3 max-w-[13ch] text-balance font-display text-[2rem] font-black leading-[1.02] tracking-[-0.03em] sm:text-[2.75rem]"
          >
            Your grocery order, prepared close to home.
          </h2>
          <p className="campaign-on-image-muted mt-3 max-w-md text-sm leading-6 sm:text-base sm:leading-7">
            Choose what you need online. We prepare your order locally and deliver it
            across Chittagong.
          </p>
          <Link
            href="https://wa.me/8801731944544?text=Hello%20Lucky%20Store%2C%20I%20need%20help%20with%20my%20order."
            target="_blank"
            rel="noopener noreferrer"
            className="campaign-secondary-action mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0d]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.3A8.5 8.5 0 1 1 20.5 11.6Z" />
              <path d="M8.1 7.8c.2-.4.5-.4.8-.4h.4c.2 0 .4.1.5.4l.8 1.9c.1.3 0 .5-.1.7l-.6.7c-.2.2-.1.4 0 .6.6 1.1 1.5 2 2.6 2.6.2.1.4.2.6 0l.8-.9c.2-.2.4-.3.7-.2l2 .9c.3.1.4.3.4.5 0 .3-.2 1.5-.9 2.1-.6.6-1.5.8-2.4.6-1.1-.2-2.6-.8-4.3-2.3-2-1.8-3.3-4.1-3.4-5.6 0-.6.2-1.2.5-1.6Z" />
            </svg>
            Chat on WhatsApp ↗
          </Link>
        </div>
      </section>
    </ParallaxHero>
  );
}
