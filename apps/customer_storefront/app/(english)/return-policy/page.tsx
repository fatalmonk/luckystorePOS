import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/updated/Header';
import { BottomNav } from '../../components/BottomNav';
import { DELIVERY_POLICY, RETURN_RULES } from '../../lib/deliveryData';

const CANONICAL = 'https://www.luckystore1947.com/return-policy';

export const metadata: Metadata = {
  title: 'Return Policy',
  description: `${RETURN_RULES.en.doorstep} ${RETURN_RULES.en.defective}`,
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
              {RETURN_RULES.en.doorstep} {RETURN_RULES.en.defective}
            </p>
            <p className="text-xs text-warm-muted mt-3">Effective date: {effectiveDate}</p>
          </div>

          <div className="space-y-4 mb-10">
            <PolicySection icon="🚪" title="Checked at the door, before payment">
              <p>{RETURN_RULES.en.doorstep}</p>
              <p>
                Our delivery partner waits while you check seals, weights, packaging, and expiry dates. You can refuse a damaged, wrong, or missing item before you pay, and you are not charged for it. There is no fee for handing an item back at the door.
              </p>
            </PolicySection>

            <PolicySection icon="🚫" title="No return for a change of mind">
              <p>
                Once paid, a product cannot be returned for a change of mind. That includes food you have already checked and accepted.
              </p>
            </PolicySection>

            <PolicySection icon="⏱️" title="Defective items within 24 hours">
              <p>{RETURN_RULES.en.defective}</p>
              <p>
                The 24 hours start from purchase or delivery. Keep the receipt. A defective item can be food that is spoiled or damaged, as well as any other product that is faulty.
              </p>
            </PolicySection>

            <PolicySection icon="💬" title="How to ask">
              <p>At the door, tell the delivery partner before you pay. For a defective item after payment, call or WhatsApp within 24 hours and have the receipt ready:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Phone: <a href="tel:+8801731944544" className={linkClass}>01731944544</a></li>
                <li>WhatsApp: <a href={DELIVERY_POLICY.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>wa.me/8801731944544</a></li>
              </ul>
            </PolicySection>

            <PolicySection icon="💵" title="Refunds for cash and bKash">
              <p>
                <strong className="text-warm-fg">Before payment.</strong> You pay only for the items you keep. Cash is paid to the delivery partner. bKash is sent to {DELIVERY_POLICY.paymentMethods.bkashNumber} for the accepted total. If you already sent bKash for an item you then hand back, tell the partner before they leave and we refund that amount by bKash.
              </p>
              <p>
                <strong className="text-warm-fg">After payment.</strong> A change of mind is not refunded. A defective item returned within 24 hours with the receipt is refunded in the same way you paid: cash if you paid cash, or bKash if you paid by bKash. There is no return fee.
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
