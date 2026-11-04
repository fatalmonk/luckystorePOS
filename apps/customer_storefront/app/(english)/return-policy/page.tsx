import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/updated/Header';
import { BottomNav } from '../../components/BottomNav';
import { DELIVERY_POLICY } from '../../lib/deliveryData';

const CANONICAL = 'https://www.luckystore1947.com/return-policy';

export const metadata: Metadata = {
  title: 'Return Policy',
  description: `How Lucky Store handles damaged, wrong, or missing groceries. Check the order at the door before you pay by cash or bKash. Call or WhatsApp ${DELIVERY_POLICY.paymentMethods.bkashNumber}.`,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: CANONICAL,
    languages: {
      'en-BD': CANONICAL,
      'bn-BD': 'https://www.luckystore1947.com/bn/return-policy',
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

export default function ReturnPolicyPage() {
  const effectiveDate = '4 November 2026';

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px] max-w-3xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl mb-3" aria-hidden="true">🔄</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-warm-fg mb-2">
              Return Policy
            </h1>
            <p className="text-sm text-warm-muted max-w-md mx-auto leading-relaxed">
              Check the order at your door before you pay. Damaged items are replaced.
            </p>
            <p className="text-xs text-warm-muted mt-3">Effective date: {effectiveDate}</p>
          </div>

          <div className="space-y-4 mb-10">
            <PolicySection icon="🛡️" title="Check the order before you pay">
              <p>
                You pay only after you have looked at the order. Our delivery partner waits while you check seals, weights, packaging, and expiry dates.
                There is no fee for handing an item back at the door.
              </p>
            </PolicySection>

            <PolicySection icon="📦" title="Damaged, wrong, or missing items">
              <p>
                If an item is damaged, we replace it. If an item is wrong or missing, hand it back or tell the delivery partner before you pay, and you are not charged for it.
                You can refuse one item or the whole order.
              </p>
              <p>
                A replacement is paid for only if you keep it. If the partner does not have a replacement with them, call or WhatsApp the shop and we will arrange one.
              </p>
            </PolicySection>

            <PolicySection icon="🥬" title="Perishables and expiry">
              <p>
                Check the expiry date and the condition of the food while the delivery partner is at your door. You can refuse an item that is expired, damaged, or that you do not want to accept.
              </p>
              <p>
                Perishable food that you have checked and paid for is not taken back after the delivery partner leaves. Groceries are packed for that day&apos;s use, so the time to refuse them is before payment.
              </p>
            </PolicySection>

            <PolicySection icon="⏱️" title="When you can refuse an item">
              <p>
                The published window is while our delivery partner is at your door, before you pay. That is when you can refuse a damaged, wrong, missing, or expired item and have a damaged item replaced.
              </p>
              <p>
                If you notice a problem after the partner has left, call or WhatsApp us straight away and tell us the order details. We will look at what happened. This page does not add a longer return period than the doorstep check.
              </p>
            </PolicySection>

            <PolicySection icon="💬" title="How to ask for a return or replacement">
              <p>Tell our delivery partner at the door, or contact the shop by phone or WhatsApp:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Phone: <a href="tel:+8801731944544" className={linkClass}>01731944544</a></li>
                <li>WhatsApp: <a href={DELIVERY_POLICY.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>wa.me/8801731944544</a></li>
              </ul>
              <p>Say what was damaged, wrong, or missing, and share your name, phone number, and order time so we can find the order.</p>
            </PolicySection>

            <PolicySection icon="💵" title="Refunds for cash and bKash">
              <p>
                <strong className="text-warm-fg">Cash on delivery.</strong> You pay cash only for the items you keep. Items you hand back are not included in the amount you pay. If you refuse the whole order before paying, you do not pay for the goods.
              </p>
              <p>
                <strong className="text-warm-fg">bKash.</strong> After you check the order, you can pay the accepted total by bKash to {DELIVERY_POLICY.paymentMethods.bkashNumber}. If you already sent bKash for an item you then hand back, tell the delivery partner before they leave. We refund that amount by bKash. If they have already left, call or WhatsApp us and we will arrange the bKash refund.
              </p>
              <p>
                Handing an item back does not add a return fee. Delivery remains free on orders of ৳{DELIVERY_POLICY.freeDeliveryThresholdBdt} or more, and ৳{DELIVERY_POLICY.standardDeliveryFeeBdt} below that, as described on the <Link href="/delivery" className={linkClass}>delivery page</Link>.
              </p>
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
