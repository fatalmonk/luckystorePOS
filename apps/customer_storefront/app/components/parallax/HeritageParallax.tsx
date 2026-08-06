import Link from 'next/link';
import { ParallaxHero } from './ParallaxHero';

export function HeritageParallax() {
  return (
    <div className="mt-16 sm:mt-20 lg:mt-24">
      <ParallaxHero imageUrl="/banners/hero_grocery_banner_1200.avif">
        <section
          aria-labelledby="heritage-parallax-title"
          className="relative isolate flex min-h-[28rem] items-end overflow-hidden px-5 py-7 sm:min-h-[32rem] sm:px-8 sm:py-10 lg:min-h-[36rem] lg:px-12 lg:py-12"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(11,11,13,0.55)_0%,rgba(11,11,13,0.35)_42%,rgba(11,11,13,0.12)_76%,rgba(11,11,13,0.05)_100%)]"
          />

          <div className="max-w-xl">
            <p className="campaign-kicker !text-white">Chittagong · Since 1947</p>
            <h2
              id="heritage-parallax-title"
              className="campaign-on-image mt-3 max-w-[12ch] text-balance font-display text-[2.35rem] font-black leading-[0.98] tracking-[-0.035em] sm:text-5xl lg:text-[3.75rem] !text-white"
            >
              A Chittagong grocery store since 1947.
            </h2>
            <p className="campaign-on-image-muted mt-4 max-w-lg text-sm leading-6 sm:text-base sm:leading-7 !text-white/80">
              Lucky Store has served local shoppers since 1947. Now you can browse
              groceries online, order for local delivery, and pay cash when it arrives.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href="/category"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-warm-accent px-5 py-2.5 text-sm font-extrabold text-warm-accent-text transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0d]"
              >
                Shop groceries →
              </Link>
            </div>
          </div>
        </section>
      </ParallaxHero>
    </div>
  );
}
