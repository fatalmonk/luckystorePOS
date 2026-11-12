import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../../components/updated/Header';
import { BottomNav } from '../../../components/BottomNav';
import { DELIVERY_POLICY, RETURN_RULES } from '../../../lib/deliveryData';
import { buildLocaleAlternates } from '../../../lib/i18n/metadata';

export const metadata: Metadata = {
  title: 'ফেরত নীতি',
  description: `${RETURN_RULES.bn.doorstep} ${RETURN_RULES.bn.defective}`,
  robots: {
    index: true,
    follow: true,
  },
  alternates: buildLocaleAlternates('/return-policy', 'bn'),
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

export default function BengaliReturnPolicyPage() {
  return (
    <>
      <Header locale="bn" />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px] max-w-3xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl mb-3" aria-hidden="true">🔄</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-warm-fg mb-2">
              ফেরত নীতি
            </h1>
            <p className="text-sm text-warm-muted max-w-md mx-auto leading-relaxed">
              {RETURN_RULES.bn.doorstep} {RETURN_RULES.bn.defective}
            </p>
            <p className="text-xs text-warm-muted mt-3">কার্যকর তারিখ: ৪ নভেম্বর ২০২৬</p>
          </div>

          <div className="space-y-4 mb-10">
            <PolicySection icon="🚪" title="দরজায় দেখে, তারপর টাকা">
              <p>{RETURN_RULES.bn.doorstep}</p>
              <p>
                ডেলিভারি কর্মী অপেক্ষা করেন, যাতে আপনি সিল, ওজন, প্যাকেট ও মেয়াদ দেখতে পারেন। নষ্ট, ভুল বা বাদ পড়া পণ্য টাকা দেওয়ার আগে ফেরত দিতে পারেন। সেই পণ্যের জন্য চার্জ হবে না। দরজায় ফেরত দিলে আলাদা ফি লাগে না।
              </p>
            </PolicySection>

            <PolicySection icon="🚫" title="মন বদলালে ফেরত নয়">
              <p>
                টাকা দেওয়ার পর মন বদলানোর জন্য পণ্য ফেরত নেওয়া হয় না। যে খাবার আপনি দেখে রেখেছেন, সেটিও এর মধ্যে পড়ে।
              </p>
            </PolicySection>

            <PolicySection icon="⏱️" title="ত্রুটিপূর্ণ পণ্য, ২৪ ঘণ্টা">
              <p>{RETURN_RULES.bn.defective}</p>
              <p>
                এই ২৪ ঘণ্টা কেনা বা ডেলিভারির সময় থেকে গণনা হয়। রসিদ রাখুন। ত্রুটিপূর্ণ পণ্যের মধ্যে নষ্ট বা ক্ষতিগ্রস্ত খাবারও পড়ে, এবং অন্য যেকোনো ত্রুটিপূর্ণ জিনিসও।
              </p>
            </PolicySection>

            <PolicySection icon="💬" title="কীভাবে জানাবেন">
              <p>দরজায় থাকতে টাকা দেওয়ার আগে ডেলিভারি কর্মীকে বলুন। টাকা দেওয়ার পর ত্রুটিপূর্ণ পণ্য হলে ২৪ ঘণ্টার মধ্যে ফোন বা WhatsApp করুন এবং রসিদ রাখুন:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>ফোন: <a href="tel:+8801731944544" className={linkClass}>01731944544</a></li>
                <li>WhatsApp: <a href={DELIVERY_POLICY.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>wa.me/8801731944544</a></li>
              </ul>
            </PolicySection>

            <PolicySection icon="💵" title="ক্যাশ ও bKash-এ টাকা ফেরত">
              <p>
                <strong className="text-warm-fg">টাকা দেওয়ার আগে।</strong> যে পণ্য রাখছেন, শুধু তার জন্য টাকা দেন। নগদ টাকা ডেলিভারি কর্মীকে দেন। bKash-এ রাখা পণ্যের মোট টাকা পাঠান, নম্বর {DELIVERY_POLICY.paymentMethods.bkashNumber}। যে পণ্য ফেরত দিচ্ছেন তার জন্য আগেই bKash পাঠিয়ে থাকলে, কর্মী যাওয়ার আগে বলে দিন। সেই টাকা bKash-এ ফেরত দেওয়া হবে।
              </p>
              <p>
                <strong className="text-warm-fg">টাকা দেওয়ার পর।</strong> মন বদলালে টাকা ফেরত হয় না। ত্রুটিপূর্ণ পণ্য ২৪ ঘণ্টার মধ্যে রসিদসহ ফেরত দিলে, যেভাবে টাকা দিয়েছিলেন সেভাবেই ফেরত পাবেন: নগদ দিলে নগদ, bKash দিলে bKash। ফেরতের আলাদা ফি নেই।
              </p>
            </PolicySection>
          </div>

          <div className="text-center pb-8">
            <Link
              href="/bn"
              className="text-sm text-warm-muted hover:text-warm-fg font-medium underline underline-offset-2"
            >
              ← লাকি স্টোরে ফিরে যান
            </Link>
          </div>
        </div>
      </main>
      <BottomNav locale="bn" />
    </>
  );
}
