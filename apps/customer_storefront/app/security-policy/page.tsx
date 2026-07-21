import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../components/updated/Header';
import { BottomNav } from '../components/BottomNav';

export const metadata: Metadata = {
  title: 'Security Policy',
  description: 'Learn how Lucky Store protects your data, payments, and privacy with bank-grade encryption and zero-trust infrastructure.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://luckystore1947.com/security-policy',
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

export default function SecurityPolicyPage() {
  const lastUpdated = '10 July 2026';

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px] max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl mb-3" aria-hidden="true">🔒</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-warm-fg mb-2">
              Security Policy
            </h1>
            <p className="text-sm text-warm-muted max-w-md mx-auto leading-relaxed">
              Your trust is our most valuable asset. Here&apos;s exactly how we protect your data, payments, and privacy.
            </p>
            <p className="text-xs text-warm-muted mt-3">Last updated: {lastUpdated}</p>
          </div>

          {/* Policy Sections */}
          <div className="space-y-4 mb-10">
            <PolicySection icon="🔐" title="End-to-End Encryption">
              <p>
                All traffic to and from <strong>luckystore1947.com</strong> is protected with <strong>TLS 1.3</strong>,
                the latest encryption standard. Your connection is verified with a valid SSL certificate — look for the padlock 🔒 in your browser.
              </p>
              <p>
                We enforce <strong>HTTPS-only</strong> access. HTTP requests are permanently redirected to their secure counterparts.
              </p>
            </PolicySection>

            <PolicySection icon="💳" title="Payment Security">
              <p>
                We operate on a strict <strong>Cash on Delivery (COD)</strong> model. We do <strong>not</strong> store,
                process, or transmit any card numbers, banking credentials, or digital wallet tokens on our servers.
              </p>
              <p>
                No payment data ever touches our database. You pay the delivery agent only after inspecting your goods — zero digital payment risk.
              </p>
            </PolicySection>

            <PolicySection icon="🛡️" title="Zero-Trust Infrastructure">
              <p>
                Our platform runs on a hardened, multi-layered architecture:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Cloudflare</strong> — DDoS mitigation, Web Application Firewall (WAF), and bot protection at the edge.</li>
                <li><strong>Neon PostgreSQL</strong> — Encrypted-at-rest database with row-level security policies.</li>
                <li><strong>Supabase</strong> — Auth and real-time APIs with JWT token validation.</li>
                <li><strong>Cloudflare R2</strong> — Immutable object storage for product images with signed access.</li>
              </ul>
            </PolicySection>

            <PolicySection icon="👤" title="Authentication & Access Control">
              <p>
                User sessions are secured via <strong>JWT tokens</strong> with short expiry and automatic rotation.
                Passwords (where applicable) are hashed with industry-standard algorithms — we never store plain-text credentials.
              </p>
              <p>
                Internal admin access requires role-based validation against our <code>users</code> table. UI gating alone is never sufficient; every sensitive operation is verified server-side.
              </p>
            </PolicySection>

            <PolicySection icon="📊" title="Data Collection & Tracking">
              <p>
                We collect only what is necessary to fulfill your order: name, phone number, delivery address, and order items.
                We do <strong>not</strong> sell, rent, or share your personal data with third parties for marketing.
              </p>
              <p>
                We use <strong>Google Analytics</strong> (G-K5JLJNSW6D) to understand site traffic patterns. All data is anonymized and aggregated. You can opt out via your browser&apos;s Do Not Track settings.
              </p>
            </PolicySection>

            <PolicySection icon="🍪" title="Cookies & Local Storage">
              <p>
                We use minimal first-party cookies and browser <code>localStorage</code> solely for:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Cart persistence across sessions</li>
                <li>Session authentication tokens</li>
                <li>Analytics and performance monitoring</li>
              </ul>
              <p>No third-party advertising cookies are deployed.</p>
            </PolicySection>

            <PolicySection icon="📦" title="Order & Delivery Safety">
              <p>
                Every order is assigned a unique order number and logged with full audit trails.
                Delivery personnel are verified and operate under strict identity protocols.
                If anything feels off, contact us immediately.
              </p>
            </PolicySection>

            <PolicySection icon="🔍" title="Responsible Disclosure">
              <p>
                Found a vulnerability? We welcome responsible disclosure. Please email us at{' '}
                <a
                  href="mailto:security@luckystore1947.com"
                  className="text-warm-accent-dark font-semibold underline underline-offset-2 hover:no-underline"
                >
                  security@luckystore1947.com
                </a>{' '}
                with details. We commit to:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Acknowledging receipt within 48 hours</li>
                <li>Investigating and fixing verified issues promptly</li>
                <li>Publicly crediting researchers (with permission)</li>
                <li>No legal action against good-faith researchers</li>
              </ul>
            </PolicySection>

            <PolicySection icon="⚖️" title="Compliance & Legal">
              <p>
                Lucky Store operates under the laws of the People&apos;s Republic of Bangladesh.
                We comply with applicable data protection regulations including the{' '}
                <em>Digital Security Act, 2018</em> and <em>Bangladesh Telecommunication Regulation Act, 2001</em>.
              </p>
              <p>
                For privacy-related questions, contact{' '}
                <a
                  href="mailto:hello@luckystore1947.com"
                  className="text-warm-accent-dark font-semibold underline underline-offset-2 hover:no-underline"
                >
                  hello@luckystore1947.com
                </a>.
              </p>
            </PolicySection>
          </div>

          {/* Contact CTA */}
          <div className="bg-warm-fg text-white rounded-[var(--radius-md)] p-6 text-center mb-8">
            <h3 className="text-lg font-extrabold mb-1">Questions about security?</h3>
            <p className="text-sm text-white/80 mb-4">
              We&apos;re here to help. Reach out anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href="mailto:security@luckystore1947.com"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white text-warm-fg text-sm font-bold hover:bg-warm-accent transition-colors"
              >
                📧 security@luckystore1947.com
              </a>
              <a
                href="tel:+880****4544"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-colors"
              >
                📞 +880 1731-944544
              </a>
              <a
                href="https://maps.app.goo.gl/tfiRABoc1WsKEt619"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-colors"
              >
                📍 Find us on Google Maps
              </a>
            </div>
          </div>

          {/* Back link */}
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
