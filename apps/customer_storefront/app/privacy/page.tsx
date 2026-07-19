import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../components/updated/Header';
import { BottomNav } from '../components/BottomNav';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how Lucky Store collects, uses, stores, and protects your personal and business data.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://luckystore1947.com/privacy',
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

export default function PrivacyPolicyPage() {
  const effectiveDate = 'May 6, 2024';

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px] max-w-3xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl mb-3" aria-hidden="true">🔒</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-warm-fg mb-2">
              Privacy Policy
            </h1>
            <p className="text-sm text-warm-muted max-w-md mx-auto leading-relaxed">
              Lucky Store is committed to protecting your privacy. This policy explains how we handle your data.
            </p>
            <p className="text-xs text-warm-muted mt-3">Effective date: {effectiveDate}</p>
          </div>

          <div className="space-y-4 mb-10">
            <PolicySection icon="📋" title="Information We Collect">
              <p><strong>Personal Information</strong></p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Name and contact information (email, phone number)</li>
                <li>Business/store information</li>
                <li>Payment information (processed securely through third-party providers)</li>
                <li>Login credentials</li>
              </ul>
              <p><strong>Business Data</strong></p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Sales transactions and receipts</li>
                <li>Inventory and product information</li>
                <li>Customer data (as entered by you)</li>
                <li>Business analytics and reports</li>
              </ul>
              <p><strong>Device Information</strong></p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Device type and operating system</li>
                <li>App usage statistics</li>
                <li>Error logs for troubleshooting</li>
              </ul>
            </PolicySection>

            <PolicySection icon="🎯" title="How We Use Your Information">
              <ul className="list-disc pl-4 space-y-1">
                <li>To provide and maintain the App&apos;s functionality</li>
                <li>To process your transactions and generate receipts</li>
                <li>To sync data across your devices</li>
                <li>To send you important updates and notifications</li>
                <li>To improve our services and user experience</li>
                <li>To provide customer support</li>
                <li>To comply with legal obligations</li>
              </ul>
            </PolicySection>

            <PolicySection icon="🛡️" title="Data Storage and Security">
              <p>
                We use Supabase for secure data storage. All data is encrypted in transit and at rest.
                We implement industry-standard security measures to protect your information.
                Your data is stored in secure data centers with restricted access.
              </p>
            </PolicySection>

            <PolicySection icon="🤝" title="Data Sharing">
              <p>We do not sell your personal information. We may share data with:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Service providers (payment processors, cloud hosting)</li>
                <li>Law enforcement when required by law</li>
                <li>Business partners (with your consent)</li>
              </ul>
            </PolicySection>

            <PolicySection icon="✅" title="Your Rights">
              <p>You have the right to:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>
            </PolicySection>

            <PolicySection icon="👶" title="Children&apos;s Privacy">
              <p>
                Our App is not intended for use by children under 13. We do not knowingly collect
                personal information from children under 13.
              </p>
            </PolicySection>

            <PolicySection icon="📝" title="Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes
                by posting the new policy on this page and updating the effective date.
              </p>
            </PolicySection>

            <PolicySection icon="📞" title="Contact Us">
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
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
