import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/updated/Header';
import { BottomNav } from '../../components/BottomNav';
import { DELIVERY_POLICY } from '../../lib/deliveryData';

const CANONICAL = 'https://www.luckystore1947.com/about';

export const metadata: Metadata = {
  title: 'About Lucky Store',
  description: `Lucky Store, established ${DELIVERY_POLICY.establishedYear}, is a grocery and daily bazaar shop at ${DELIVERY_POLICY.hubAddress}. Own-staff delivery within ${DELIVERY_POLICY.radiusKm} km.`,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: CANONICAL,
    languages: {
      'en-BD': CANONICAL,
      'bn-BD': 'https://www.luckystore1947.com/bn/about',
      'x-default': CANONICAL,
    },
  },
};

interface PolicySectionProps {
  icon: string;
  title: string;
  children: React.ReactNode;
}

function PolicySection({ icon, title, children }: PolicySectionProps) {
  return (
    <section className="bg-warm-surface border border-warm-border rounded-[var(--radius-md)] p-5 sm:p-6 shadow-warm-sm">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xl leading-none mt-0.5" aria-hidden="true">{icon}</span>
        <h2 className="text-base font-bold tracking-tight text-warm-fg">{title}</h2>
      </div>
      <div className="text-sm text-warm-muted leading-relaxed space-y-2 pl-[calc(1.25rem+0.75rem)]">
        {children}
      </div>
    </section>
  );
}

const linkClass =
  'text-warm-accent-dark font-semibold underline underline-offset-2 hover:no-underline';

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px] max-w-3xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl mb-3" aria-hidden="true">🏪</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-warm-fg mb-2">
              About Lucky Store
            </h1>
            <p className="text-sm text-warm-muted max-w-md mx-auto leading-relaxed">
              A grocery and daily bazaar shop in Emdad Park, Chawkbazar, serving the neighbourhood since {DELIVERY_POLICY.establishedYear}.
            </p>
            <p className="text-xs text-warm-muted mt-3">Chawkbazar, Chattogram · Est. {DELIVERY_POLICY.establishedYear}</p>
          </div>

          <div className="space-y-4 mb-10">
            <PolicySection icon="📍" title="Where we are">
              <p>
                Lucky Store is at {DELIVERY_POLICY.hubAddress}. The shop sits in Emdad Park, in the Chawkbazar neighbourhood of Chattogram.
              </p>
            </PolicySection>

            <PolicySection icon="📜" title="Since 1947">
              <p>
                The shop has been here since {DELIVERY_POLICY.establishedYear}. Families in Chawkbazar have bought their daily groceries from this counter for decades, and the same shop now takes orders on this website.
              </p>
            </PolicySection>

            <PolicySection icon="🛒" title="What we sell">
              <p>
                We sell groceries and daily bazaar staples: rice, cooking oil, tea, spices, snacks, and household essentials for the kitchen and the home.
              </p>
            </PolicySection>

            <PolicySection icon="🚚" title="Delivery">
              <p>
                Our own staff deliver within {DELIVERY_POLICY.radiusKm} km of the shop. Delivery is free on orders of ৳{DELIVERY_POLICY.freeDeliveryThresholdBdt} or more, and ৳{DELIVERY_POLICY.standardDeliveryFeeBdt} below that.
              </p>
              <p>
                The shop is open {DELIVERY_POLICY.deliveryHours.display}. Orders placed during those hours are dispatched the same day.
                You can pay cash on delivery, or by bKash at the door, after you check the order.
              </p>
              <p>
                Coverage, fees, and hours are on the <Link href="/delivery" className={linkClass}>delivery page</Link>.
              </p>
            </PolicySection>

            <PolicySection icon="📞" title="Contact">
              <ul className="list-disc pl-4 space-y-1">
                <li>Phone: <a href="tel:+8801731944544" className={linkClass}>01731944544</a></li>
                <li>WhatsApp: <a href={DELIVERY_POLICY.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>wa.me/8801731944544</a></li>
                <li>Email: <a href="mailto:hello@luckystore1947.com" className={linkClass}>hello@luckystore1947.com</a></li>
              </ul>
            </PolicySection>
          </div>

          <div className="text-center pb-8">
            <Link
              href="/"
              className="text-sm text-warm-muted hover:text-warm-fg font-medium underline underline-offset-2"
            >
              ← Back to Lucky Store
            </Link>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
