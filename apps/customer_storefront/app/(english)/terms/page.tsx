import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/updated/Header';
import { BottomNav } from '../../components/BottomNav';
import { DELIVERY_POLICY } from '../../lib/deliveryData';

const CANONICAL = 'https://www.luckystore1947.com/terms';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Shopping terms for Lucky Store, a grocery and daily bazaar shop at Emdad Park, Chawkbazar. Covers orders, prices, cash or bKash at the door, and delivery within ${DELIVERY_POLICY.radiusKm} km.`,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: CANONICAL,
    languages: {
      'en-BD': CANONICAL,
      'bn-BD': 'https://www.luckystore1947.com/bn/terms',
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

export default function TermsOfServicePage() {
  const effectiveDate = '4 November 2026';

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px] max-w-3xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl mb-3" aria-hidden="true">📜</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-warm-fg mb-2">
              Terms of Service
            </h1>
            <p className="text-sm text-warm-muted max-w-md mx-auto leading-relaxed">
              These terms cover shopping with Lucky Store, our grocery and daily bazaar shop in Chawkbazar.
            </p>
            <p className="text-xs text-warm-muted mt-3">Effective date: {effectiveDate}</p>
          </div>

          <div className="space-y-4 mb-10">
            <PolicySection icon="🏪" title="The shop">
              <p>
                Lucky Store, established in {DELIVERY_POLICY.establishedYear}, is a grocery and daily bazaar shop at {DELIVERY_POLICY.hubAddress}.
                Placing an order means you agree to these terms and to our <Link href="/return-policy" className={linkClass}>return policy</Link>.
              </p>
            </PolicySection>

            <PolicySection icon="🛒" title="Orders">
              <p>
                You can order groceries and daily bazaar items on this website. An order asks our shop to pack those items.
                Our own staff deliver orders. We do not use an outside courier.
              </p>
              <p>
                Please give a complete address with a nearby landmark. We deliver only inside the area described below.
              </p>
            </PolicySection>

            <PolicySection icon="🏷️" title="Pricing and availability">
              <p>
                Prices are shown in taka (৳). The price on the product is the price for that item.
              </p>
              <p>
                We pack an item only when it is in stock at the shop. If something cannot be supplied, we leave it out of the order.
                You are not charged for an item you do not receive. You pay only for the items you receive and accept.
              </p>
            </PolicySection>

            <PolicySection icon="💵" title="Payment">
              <p>
                You pay at the door, after you have checked the order. We accept:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>{DELIVERY_POLICY.paymentMethods.cod}</li>
                <li>bKash at the door to {DELIVERY_POLICY.paymentMethods.bkashNumber}</li>
              </ul>
              <p>We do not ask you to pay before the order arrives.</p>
            </PolicySection>

            <PolicySection icon="🚚" title="Delivery">
              <p>
                Our own staff deliver only within {DELIVERY_POLICY.radiusKm} km of the shop at Emdad Park, Chawkbazar.
                Addresses outside that radius are not covered. The streets we serve are listed on the <Link href="/delivery" className={linkClass}>delivery page</Link>.
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Free on orders of ৳{DELIVERY_POLICY.freeDeliveryThresholdBdt} or more</li>
                <li>৳{DELIVERY_POLICY.standardDeliveryFeeBdt} on orders below ৳{DELIVERY_POLICY.freeDeliveryThresholdBdt}</li>
                <li>Open {DELIVERY_POLICY.deliveryHours.display}</li>
                <li>Orders placed during those hours are dispatched the same day</li>
              </ul>
            </PolicySection>

            <PolicySection icon="🔄" title="Checking your order and returns">
              <p>
                You can check the order before you pay. Damaged items are replaced. You may hand a damaged, wrong, or missing item back to our delivery partner before you pay.
              </p>
              <p>
                The time to do that, and how cash and bKash refunds work, is set out in the <Link href="/return-policy" className={linkClass}>return policy</Link>.
              </p>
            </PolicySection>

            <PolicySection icon="⚖️" title="Governing law">
              <p>These terms are governed by the laws of Bangladesh.</p>
            </PolicySection>

            <PolicySection icon="📞" title="Contact">
              <p>Questions about an order or these terms:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Phone: <a href="tel:+8801731944544" className={linkClass}>01731944544</a></li>
                <li>WhatsApp: <a href={DELIVERY_POLICY.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>wa.me/8801731944544</a></li>
                <li>Email: <a href="mailto:hello@luckystore1947.com" className={linkClass}>hello@luckystore1947.com</a></li>
                <li>Address: {DELIVERY_POLICY.hubAddress}</li>
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
