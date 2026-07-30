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
            href="#how-it-works"
            className="campaign-secondary-action mt-6 inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2.5 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0d]"
          >
            How ordering works ↓
          </Link>
        </div>
      </section>
    </ParallaxHero>
  );
}
