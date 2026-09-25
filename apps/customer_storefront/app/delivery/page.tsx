import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { Header } from '../components/updated/Header';
import { Footer } from '../components/updated/Footer';
import { BottomNav } from '../components/BottomNav';
import { WhatsAppFloat } from '../components/WhatsAppFloat';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { DeliveryFaqAccordion } from './DeliveryFaqAccordion';
import {
  DELIVERY_POLICY,
  COVERED_AREAS,
  getDeliveryFaqSchema,
  getDeliveryServiceSchema,
} from './deliveryData';

export const metadata: Metadata = {
  title: 'Grocery & Daily Bazaar Delivery in Chattogram | Lucky Store',
  description: `Local grocery delivery within ${DELIVERY_POLICY.radiusKm} km of Chawkbazar, Chattogram. Free delivery on orders ৳${DELIVERY_POLICY.freeDeliveryThresholdBdt}+ with Cash on Delivery and doorstep inspection. View timings & areas.`,
  alternates: {
    canonical: DELIVERY_POLICY.canonicalUrl,
    languages: {
      'en-BD': 'https://www.luckystore1947.com/delivery',
      'bn-BD': 'https://www.luckystore1947.com/bn/delivery',
      'x-default': 'https://www.luckystore1947.com/delivery',
    },
  },
  openGraph: {
    title: 'Grocery & Daily Bazaar Delivery in Chattogram | Lucky Store',
    description: `Local grocery delivery within ${DELIVERY_POLICY.radiusKm} km of Chawkbazar, Chattogram. Free delivery on orders ৳${DELIVERY_POLICY.freeDeliveryThresholdBdt}+ with Cash on Delivery and doorstep inspection. View timings & areas.`,
    url: DELIVERY_POLICY.canonicalUrl,
    siteName: DELIVERY_POLICY.storeName,
    locale: 'en_BD',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grocery & Daily Bazaar Delivery in Chattogram | Lucky Store',
    description: `Local grocery delivery within ${DELIVERY_POLICY.radiusKm} km of Chawkbazar, Chattogram. Free delivery on orders ৳${DELIVERY_POLICY.freeDeliveryThresholdBdt}+ with Cash on Delivery and doorstep inspection.`,
  },
};

export default function DeliveryHubPage() {
  const faqSchema = getDeliveryFaqSchema();
  const deliveryServiceSchema = getDeliveryServiceSchema();

  return (
    <>
      <Script
        id="delivery-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="delivery-service-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(deliveryServiceSchema) }}
      />

      <Header />

      <main className="flex-1 overflow-x-hidden pb-16">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 space-y-10">
          <Breadcrumbs items={[{ label: 'Delivery Information', href: '/delivery' }]} />

          {/* Hero Header */}
          <header className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-warm-border bg-warm-surface px-3.5 py-1 text-xs font-black uppercase tracking-wider text-warm-fg">
              <span className="inline-block h-2 w-2 rounded-full bg-warm-accent" aria-hidden="true" />
              Chattogram Delivery Hub
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-warm-fg">
              Online Grocery &amp; Daily Bazaar Delivery in Chattogram
            </h1>
            <p className="max-w-3xl text-base sm:text-lg leading-relaxed text-warm-muted">
              Direct doorstep delivery from Lucky Store in Chawkbazar (Est. {DELIVERY_POLICY.establishedYear}). We
              fulfill fresh pantry essentials, fragrant tea, cooking oils, and household necessities strictly within
              our verified {DELIVERY_POLICY.radiusLabel}, backed by full doorstep product inspection and Cash on
              Delivery.
            </p>
          </header>

          {/* Quick Stats Trust Strip */}
          <section
            aria-label="Delivery snapshot"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
          >
            <div className="rounded-2xl border border-warm-border bg-warm-surface p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-warm-muted">Coverage Boundary</p>
              <p className="mt-1 text-lg sm:text-xl font-black text-warm-fg">{DELIVERY_POLICY.radiusKm} km Radius</p>
              <p className="text-xs text-warm-muted mt-0.5">Authoritative GeoCircle</p>
            </div>
            <div className="rounded-2xl border border-warm-border bg-warm-surface p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-warm-muted">Free Delivery</p>
              <p className="mt-1 text-lg sm:text-xl font-black text-warm-fg">৳{DELIVERY_POLICY.freeDeliveryThresholdBdt}+ Orders</p>
              <p className="text-xs text-warm-muted mt-0.5">৳{DELIVERY_POLICY.standardDeliveryFeeBdt} for smaller orders</p>
            </div>
            <div className="rounded-2xl border border-warm-border bg-warm-surface p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-warm-muted">Delivery Hours</p>
              <p className="mt-1 text-lg sm:text-xl font-black text-warm-fg">09:00 AM–12:30 AM</p>
              <p className="text-xs text-warm-muted mt-0.5">Daily dispatch window</p>
            </div>
            <div className="rounded-2xl border border-warm-border bg-warm-surface p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-warm-muted">Payment &amp; Check</p>
              <p className="mt-1 text-lg sm:text-xl font-black text-warm-fg">COD &amp; bKash</p>
              <p className="text-xs text-warm-muted mt-0.5">Doorstep inspection</p>
            </div>
          </section>

          {/* Section 1: Coverage & Neighborhood Boundaries */}
          <section aria-labelledby="coverage-heading" className="space-y-4">
            <div className="border-b border-warm-border pb-3">
              <h2 id="coverage-heading" className="text-2xl font-black text-warm-fg">
                Delivery Coverage &amp; Service Boundaries
              </h2>
              <p className="mt-1 text-sm text-warm-muted">
                Our in-house delivery team operates strictly within a verified {DELIVERY_POLICY.radiusLabel} centered
                at our Chawkbazar store.
              </p>
            </div>

            <div className="rounded-2xl border border-warm-border bg-warm-surface p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-border pb-4">
                <div>
                  <h3 className="text-base font-bold text-warm-fg">Central Fulfillment Hub</h3>
                  <p className="text-sm text-warm-muted">
                    {DELIVERY_POLICY.storeName}, {DELIVERY_POLICY.hubAddress}
                  </p>
                </div>
                <div className="shrink-0 text-xs font-semibold rounded-full bg-warm-image-well px-3 py-1.5 text-warm-fg border border-warm-border">
                  GPS: {DELIVERY_POLICY.hubCoordinates.display}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-warm-muted">
                    Areas &amp; Nearby Parts of Neighborhoods Within 1 km Radius
                  </h3>
                  <span className="text-xs font-semibold text-warm-dim">
                    *Portions outside 1 km GeoCircle are excluded
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {COVERED_AREAS.map((area) => (
                    <div
                      key={area.name}
                      className="rounded-xl border border-warm-border bg-warm-image-well/40 p-3.5 transition-colors hover:border-warm-accent"
                    >
                      <p className="text-sm font-bold text-warm-fg">{area.name}</p>
                      <p className="text-xs text-warm-muted mt-0.5">{area.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-warm-image-well/70 p-4 text-xs sm:text-sm text-warm-muted leading-relaxed space-y-1">
                <p>
                  <strong className="text-warm-fg font-bold">Authoritative GeoCircle boundary:</strong> Delivery coverage is strictly defined by our {DELIVERY_POLICY.radiusLabel} ({DELIVERY_POLICY.radiusMeters} m GeoCircle) around our Chawkbazar store.
                </p>
                <p>
                  Neighborhoods listed above are served only for the streets, lanes, and addresses that fall within this 1 km radius. Portions beyond 1 km are not covered, ensuring orders arrive fresh and prompt through direct store fulfillment.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Delivery Fees & Minimum Order */}
          <section aria-labelledby="pricing-heading" className="space-y-4">
            <div className="border-b border-warm-border pb-3">
              <h2 id="pricing-heading" className="text-2xl font-black text-warm-fg">
                Transparent Delivery Fees &amp; Thresholds
              </h2>
              <p className="mt-1 text-sm text-warm-muted">
                Simple, honest pricing with zero hidden handling fees or surprise charges.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border-2 border-warm-accent bg-warm-surface p-6 space-y-3 relative overflow-hidden">
                <div className="absolute top-3 right-3 rounded-full bg-warm-accent px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-warm-accent-text">
                  Most Popular
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-warm-muted">Standard Order</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-warm-fg">FREE</span>
                  <span className="text-sm text-warm-muted font-semibold">on orders ৳{DELIVERY_POLICY.freeDeliveryThresholdBdt} and above</span>
                </div>
                <p className="text-sm text-warm-muted leading-relaxed">
                  Ideal for your weekly bazaar, rice sacks, cooking oil cans, and household pantry staples. Enjoy
                  completely free doorstep delivery anywhere within our 1 km delivery radius.
                </p>
              </div>

              <div className="rounded-2xl border border-warm-border bg-warm-surface p-6 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-warm-muted">Small Basket</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-warm-fg">৳{DELIVERY_POLICY.standardDeliveryFeeBdt}</span>
                  <span className="text-sm text-warm-muted font-semibold">for orders under ৳{DELIVERY_POLICY.freeDeliveryThresholdBdt}</span>
                </div>
                <p className="text-sm text-warm-muted leading-relaxed">
                  Need just salt, a bottle of mustard oil, or tea biscuits right now? No minimum basket size is
                  required. A flat ৳{DELIVERY_POLICY.standardDeliveryFeeBdt} local delivery fee covers fulfillment.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Operating Hours & Dispatch Schedule */}
          <section aria-labelledby="timing-heading" className="space-y-4">
            <div className="border-b border-warm-border pb-3">
              <h2 id="timing-heading" className="text-2xl font-black text-warm-fg">
                Delivery Hours &amp; Same-Day Dispatch
              </h2>
              <p className="mt-1 text-sm text-warm-muted">
                Dependable grocery delivery matching local household cooking schedules.
              </p>
            </div>

            <div className="rounded-2xl border border-warm-border bg-warm-surface p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-warm-fg">Active Delivery Window</h3>
                  <p className="text-sm text-warm-muted leading-relaxed">
                    Our local delivery service runs every day from <strong className="text-warm-fg">{DELIVERY_POLICY.deliveryHours.display}</strong> ({DELIVERY_POLICY.deliveryHours.daysDisplay}).
                    Orders received during these delivery hours are fulfilled and dispatched same-day directly from our Chawkbazar store.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-warm-fg">Direct Fulfillment</h3>
                  <p className="text-sm text-warm-muted leading-relaxed">
                    Orders are picked and packed directly from our Chawkbazar shelves by in-store staff, ensuring fresh items and intact packaging without third-party courier handling.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Payment Methods & Doorstep Inspection */}
          <section aria-labelledby="payment-heading" className="space-y-4">
            <div className="border-b border-warm-border pb-3">
              <h2 id="payment-heading" className="text-2xl font-black text-warm-fg">
                Payment Options &amp; Doorstep Inspection Guarantee
              </h2>
              <p className="mt-1 text-sm text-warm-muted">
                Zero prepayment risk. Inspect your groceries at your doorstep before paying.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-warm-border bg-warm-surface p-5 sm:p-6 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">💵</span>
                  <h3 className="text-base font-bold text-warm-fg">Cash on Delivery (COD)</h3>
                </div>
                <p className="text-sm text-warm-muted leading-relaxed">
                  Pay cash directly to our delivery partner once you have received and inspected your order. Exact change is
                  appreciated, though delivery partners carry change for common denominations.
                </p>
              </div>

              <div className="rounded-2xl border border-warm-border bg-warm-surface p-5 sm:p-6 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">📱</span>
                  <h3 className="text-base font-bold text-warm-fg">bKash Mobile Payment</h3>
                </div>
                <p className="text-sm text-warm-muted leading-relaxed">
                  Prefer digital payment? Settle your bill upon delivery via bKash to our verified store number:{' '}
                  <strong className="text-warm-fg">{DELIVERY_POLICY.paymentMethods.bkashNumber}</strong>. You may scan our delivery QR code or send money
                  directly.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-warm-border bg-warm-image-well/40 p-5 sm:p-6 space-y-3">
              <h3 className="text-base font-bold text-warm-fg flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🛡️</span>
                Doorstep Product Inspection Protocol
              </h3>
              <p className="text-sm text-warm-muted leading-relaxed">
                You have the right to inspect every product at your door before completing payment. Check seals on
                edible oils, verify rice varieties (Miniket, Chinigura, Nazirshail), and examine packaging integrity. If
                any item does not meet your complete satisfaction, you may decline that specific item or return the
                entire package with the delivery partner immediately with zero penalty.
              </p>
            </div>
          </section>

          {/* Section 5: How Ordering Works */}
          <section aria-labelledby="steps-heading" className="space-y-4">
            <div className="border-b border-warm-border pb-3">
              <h2 id="steps-heading" className="text-2xl font-black text-warm-fg">
                How to Order Groceries from Lucky Store
              </h2>
              <p className="mt-1 text-sm text-warm-muted">
                Simple 4-step local ordering designed for Chattogram residents.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-warm-border bg-warm-surface p-5 space-y-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-warm-accent text-xs font-black text-warm-accent-text">
                  1
                </span>
                <h3 className="text-sm font-bold text-warm-fg">Select Products</h3>
                <p className="text-xs text-warm-muted leading-relaxed">
                  Browse rice, edible oils, spices, tea, snacks, and daily groceries at displayed bazaar prices.
                </p>
              </div>

              <div className="rounded-2xl border border-warm-border bg-warm-surface p-5 space-y-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-warm-accent text-xs font-black text-warm-accent-text">
                  2
                </span>
                <h3 className="text-sm font-bold text-warm-fg">Enter Address</h3>
                <p className="text-xs text-warm-muted leading-relaxed">
                  Provide your building name, road, and nearest landmark within our 1 km Chawkbazar delivery radius.
                </p>
              </div>

              <div className="rounded-2xl border border-warm-border bg-warm-surface p-5 space-y-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-warm-accent text-xs font-black text-warm-accent-text">
                  3
                </span>
                <h3 className="text-sm font-bold text-warm-fg">Choose Payment</h3>
                <p className="text-xs text-warm-muted leading-relaxed">
                  Select Cash on Delivery or bKash. No advance credit card or digital payment risk required.
                </p>
              </div>

              <div className="rounded-2xl border border-warm-border bg-warm-surface p-5 space-y-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-warm-accent text-xs font-black text-warm-accent-text">
                  4
                </span>
                <h3 className="text-sm font-bold text-warm-fg">Inspect &amp; Pay</h3>
                <p className="text-xs text-warm-muted leading-relaxed">
                  Inspect your goods when our delivery partner arrives, then complete payment with full confidence.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: FAQ Section */}
          <section aria-labelledby="faq-heading" className="space-y-4">
            <div className="border-b border-warm-border pb-3">
              <h2 id="faq-heading" className="text-2xl font-black text-warm-fg">
                Frequently Asked Delivery Questions
              </h2>
              <p className="mt-1 text-sm text-warm-muted">
                Clear answers regarding delivery coverage, pricing, scheduling, and product returns.
              </p>
            </div>

            <DeliveryFaqAccordion />
          </section>

          {/* Section 7: Bottom CTA Banner */}
          <section
            aria-label="Start ordering groceries"
            className="rounded-3xl border border-warm-border bg-warm-surface p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="space-y-1.5 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-black text-warm-fg">
                Ready to order your daily groceries?
              </h2>
              <p className="text-sm text-warm-muted max-w-md">
                Explore our full catalog of daily pantry staples, cooking oils, rice, and snacks.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                href="/category"
                className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center rounded-full bg-warm-accent px-6 py-3 text-sm font-extrabold text-warm-accent-text transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                Browse Grocery Catalog
              </Link>
              <a
                href={DELIVERY_POLICY.supportWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center rounded-full border border-warm-border bg-warm-surface px-6 py-3 text-sm font-extrabold text-warm-fg transition-colors hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                Chat on WhatsApp
              </a>
            </div>
          </section>
        </div>
      </main>

      <Footer />
      <BottomNav />
      <WhatsAppFloat />
    </>
  );
}
