import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../components/updated/Header';
import { BottomNav } from '../components/BottomNav';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions',
  description: 'Request deletion of your personal and business data from Lucky Store.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://luckystore1947.com/data-deletion',
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

export default function DataDeletionPage() {
  const effectiveDate = 'July 10, 2026';

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px] max-w-3xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl mb-3" aria-hidden="true">🗑️</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-warm-fg mb-2">
              Data Deletion Instructions
            </h1>
            <p className="text-sm text-warm-muted max-w-md mx-auto leading-relaxed">
              At Lucky Store, we respect your right to control your personal and business data.
            </p>
            <p className="text-xs text-warm-muted mt-3">Effective date: {effectiveDate}</p>
          </div>

          <div className="space-y-4 mb-10">
            <PolicySection icon="📂" title="What You Can Delete">
              <ul className="list-disc pl-4 space-y-1">
                <li>Your user account and profile information</li>
                <li>Your store/business information</li>
                <li>Sales transactions and receipts you have created</li>
                <li>Inventory and product data</li>
                <li>Customer records you have entered</li>
                <li>Reports and analytics data associated with your account</li>
              </ul>
            </PolicySection>

            <PolicySection icon="✉️" title="How to Request Data Deletion">
              <p><strong>Option A: Contact Us Directly (Recommended)</strong></p>
              <p>
                Send us a deletion request from the email address associated with your Lucky Store account.
                Include the phone number or store name registered with your account so we can verify ownership.
              </p>
              <div className="bg-warm-bg border border-warm-border rounded-[var(--radius-md)] p-4 my-2">
                <p><strong>Email:</strong> <a href="mailto:luckystore.1947@gmail.com" className="text-warm-accent-dark font-semibold underline underline-offset-2 hover:no-underline">luckystore.1947@gmail.com</a></p>
                <p><strong>Phone / WhatsApp:</strong> <a href="tel:+8801731944544" className="text-warm-accent-dark font-semibold underline underline-offset-2 hover:no-underline">01731944544</a></p>
                <p><strong>Subject line:</strong> “Data Deletion Request – [Your Store Name / Registered Phone]”</p>
              </div>
              <p><strong>Option B: In-App Account Closure</strong></p>
              <p>
                If your account has an active owner/admin role, you may remove business records directly inside
                the Lucky Store POS app. To permanently delete the account and all remaining cloud data,
                contact us using Option A.
              </p>
            </PolicySection>

            <PolicySection icon="⏳" title="What Happens After You Request Deletion">
              <ol className="list-decimal pl-4 space-y-1">
                <li>We will verify that the request comes from the registered account owner.</li>
                <li>We will delete your personal information and business data from our active systems.</li>
                <li>We will remove any remaining backups containing your data within 30 days, unless a longer retention period is required by law.</li>
                <li>We will send you a confirmation once the deletion is complete.</li>
              </ol>
            </PolicySection>

            <PolicySection icon="📁" title="Data We May Retain">
              <p>
                We may keep a minimal record of the deletion request itself and any information we are legally
                required to retain (for example, for tax, fraud prevention, or regulatory compliance purposes).
                This retained information will not be used for any other purpose.
              </p>
            </PolicySection>

            <PolicySection icon="🌐" title="Third-Party Services">
              <p>
                Lucky Store uses trusted service providers such as Supabase for cloud storage and Cloudflare
                for hosting. When you request deletion, we also remove or instruct these providers to remove
                your data in accordance with their own data-processing terms.
              </p>
            </PolicySection>

            <PolicySection icon="⏱️" title="Timeframe">
              <p>
                We aim to process deletion requests within 7 business days. If we need additional information
                to verify your identity, we will contact you within 2 business days.
              </p>
            </PolicySection>

            <PolicySection icon="📞" title="Contact Us">
              <p>If you have any questions about deleting your data, please contact us:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Email: <a href="mailto:luckystore.1947@gmail.com" className="text-warm-accent-dark font-semibold underline underline-offset-2 hover:no-underline">luckystore.1947@gmail.com</a></li>
                <li>Phone / WhatsApp: <a href="tel:+8801731944544" className="text-warm-accent-dark font-semibold underline underline-offset-2 hover:no-underline">01731944544</a></li>
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
