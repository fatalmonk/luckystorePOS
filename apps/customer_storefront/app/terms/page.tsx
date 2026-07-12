import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the Terms of Service for using Lucky Store POS and online storefront.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://luckystore1947.com/terms',
  },
};

interface PolicySectionProps {
  icon: string;
  title: string;
  children: React.ReactNode;
}

function PolicySection({ icon, title, children }: PolicySectionProps) {
  return (
    <section className="bg-white border border-warm-border rounded-[var(--radius-md)] p-5 sm:p-6 shadow-sm">
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

export default function TermsOfServicePage() {
  const effectiveDate = 'May 6, 2024';

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
              Welcome to Lucky Store. By using our application, you agree to these Terms of Service.
            </p>
            <p className="text-xs text-warm-muted mt-3">Effective date: {effectiveDate}</p>
          </div>

          <div className="space-y-4 mb-10">
            <PolicySection icon="✍️" title="Acceptance of Terms">
              <p>
                By accessing or using Lucky Store POS, you agree to be bound by these Terms and all applicable
                laws and regulations. If you do not agree with any part of these terms, you may not use our service.
              </p>
            </PolicySection>

            <PolicySection icon="🛒" title="Description of Service">
              <p>
                Lucky Store POS provides point-of-sale and inventory management tools for retail businesses,
                plus an online storefront for customers to place orders. Features include sales processing,
                inventory tracking, customer management, and reporting.
              </p>
            </PolicySection>

            <PolicySection icon="👤" title="User Accounts">
              <ul className="list-disc pl-4 space-y-1">
                <li>You must provide accurate and complete information when creating an account</li>
                <li>You are responsible for maintaining the security of your account credentials</li>
                <li>You are responsible for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
            </PolicySection>

            <PolicySection icon="💳" title="Payment Terms">
              <p>
                Some features may require payment. You agree to pay all fees associated with your subscription
                plan. All payments are non-refundable unless otherwise stated. Online orders use Cash on Delivery (COD) by default.
              </p>
            </PolicySection>

            <PolicySection icon="📊" title="Data and Content">
              <p>
                You retain ownership of your business data. By using our service, you grant us a license to
                store and process your data for the purpose of providing our services.
              </p>
            </PolicySection>

            <PolicySection icon="⚠️" title="Limitation of Liability">
              <p>
                Lucky Store shall not be liable for any indirect, incidental, special, consequential, or
                punitive damages resulting from your use of the service.
              </p>
            </PolicySection>

            <PolicySection icon="🚪" title="Termination">
              <p>
                We may terminate or suspend your account at any time for violations of these terms.
                You may also terminate your account at any time by contacting us.
              </p>
            </PolicySection>

            <PolicySection icon="⚖️" title="Governing Law">
              <p>These Terms shall be governed by the laws of Bangladesh.</p>
            </PolicySection>

            <PolicySection icon="📞" title="Contact Information">
              <p>For questions about these Terms, please contact us at:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Email: <a href="mailto:luckystore.1947@gmail.com" className="text-warm-accent-dark font-semibold underline underline-offset-2 hover:no-underline">luckystore.1947@gmail.com</a></li>
                <li>Phone: <a href="tel:+8801731944544" className="text-warm-accent-dark font-semibold underline underline-offset-2 hover:no-underline">01731944544</a></li>
                <li>Address: 665 Percival Hill Road, Emdad Park, Chawkbazar, Chittagong, Bangladesh</li>
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
