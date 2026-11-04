import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../../components/updated/Header';
import { BottomNav } from '../../../components/BottomNav';
import { DELIVERY_POLICY } from '../../../lib/deliveryData';

const CANONICAL = 'https://www.luckystore1947.com/bn/return-policy';

export const metadata: Metadata = {
  title: 'ফেরত নীতি',
  description: `নষ্ট, ভুল বা বাদ পড়া পণ্য কীভাবে সামলানো হয়। টাকা দেওয়ার আগে দরজায় অর্ডার দেখে নিন। ফোন বা WhatsApp: ${DELIVERY_POLICY.paymentMethods.bkashNumber}।`,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: CANONICAL,
    languages: {
      'en-BD': 'https://www.luckystore1947.com/return-policy',
      'bn-BD': CANONICAL,
      'x-default': 'https://www.luckystore1947.com/return-policy',
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
              টাকা দেওয়ার আগে দরজায় অর্ডার দেখে নিন। নষ্ট পণ্য বদলে দেওয়া হয়।
            </p>
            <p className="text-xs text-warm-muted mt-3">কার্যকর তারিখ: ৪ নভেম্বর ২০২৬</p>
          </div>

          <div className="space-y-4 mb-10">
            <PolicySection icon="🛡️" title="টাকা দেওয়ার আগে অর্ডার দেখুন">
              <p>
                অর্ডার দেখে নেওয়ার পর তবেই টাকা দেন। ডেলিভারি কর্মী অপেক্ষা করেন, যাতে আপনি সিল, ওজন, প্যাকেট ও মেয়াদ দেখতে পারেন।
                দরজায় পণ্য ফেরত দিলে আলাদা কোনো ফি লাগে না।
              </p>
            </PolicySection>

            <PolicySection icon="📦" title="নষ্ট, ভুল বা বাদ পড়া পণ্য">
              <p>
                পণ্য নষ্ট হলে আমরা সেটি বদলে দিই। ভুল পণ্য এলে বা কোনো পণ্য না এলে, টাকা দেওয়ার আগে ডেলিভারি কর্মীকে বলুন বা ফেরত দিন। সেই পণ্যের জন্য চার্জ হবে না।
                একটি পণ্য বা পুরো অর্ডার, দুটোই ফেরত দিতে পারেন।
              </p>
              <p>
                বদলে দেওয়া পণ্য রাখলে তবেই তার দাম দিতে হয়। কর্মীর কাছে বদলের পণ্য না থাকলে দোকানে ফোন বা WhatsApp করুন। আমরা ব্যবস্থা করব।
              </p>
            </PolicySection>

            <PolicySection icon="🥬" title="পচনশীল পণ্য ও মেয়াদ">
              <p>
                ডেলিভারি কর্মী দরজায় থাকতেই খাবারের মেয়াদ ও অবস্থা দেখে নিন। মেয়াদোত্তীর্ণ, নষ্ট, বা আপনি রাখতে চান না এমন পণ্য ফেরত দিতে পারেন।
              </p>
              <p>
                যে পচনশীল খাবার আপনি দেখে টাকা দিয়ে রেখেছেন, ডেলিভারি কর্মী চলে যাওয়ার পর সেটি ফেরত নেওয়া হয় না। ফেরত দেওয়ার সময় হলো টাকা দেওয়ার আগে।
              </p>
            </PolicySection>

            <PolicySection icon="⏱️" title="কখন ফেরত দেবেন">
              <p>
                প্রকাশিত সময় হলো ডেলিভারি কর্মী আপনার দরজায় আসা পর্যন্ত, টাকা দেওয়ার আগে। এই সময়ে নষ্ট, ভুল, বাদ পড়া বা মেয়াদোত্তীর্ণ পণ্য ফেরত দিতে পারবেন, এবং নষ্ট পণ্য বদলে নেওয়া যায়।
              </p>
              <p>
                কর্মী চলে যাওয়ার পর কোনো সমস্যা দেখলে সাথে সাথে ফোন বা WhatsApp করুন এবং অর্ডারের কথা বলুন। আমরা দেখে নেব। দরজায় দেখে নেওয়ার বাইরে আলাদা কোনো দীর্ঘ ফেরতের সময় এই পাতায় নেই।
              </p>
            </PolicySection>

            <PolicySection icon="💬" title="ফেরত বা বদল কীভাবে চাইবেন">
              <p>দরজায় ডেলিভারি কর্মীকে বলুন, অথবা ফোন বা WhatsApp-এ দোকানে যোগাযোগ করুন:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>ফোন: <a href="tel:+8801731944544" className={linkClass}>01731944544</a></li>
                <li>WhatsApp: <a href={DELIVERY_POLICY.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>wa.me/8801731944544</a></li>
              </ul>
              <p>কী নষ্ট, ভুল বা বাদ পড়েছে বলুন। অর্ডার খুঁজে পেতে আপনার নাম, ফোন নম্বর ও অর্ডারের সময় জানান।</p>
            </PolicySection>

            <PolicySection icon="💵" title="ক্যাশ ও bKash-এ টাকা ফেরত">
              <p>
                <strong className="text-warm-fg">ক্যাশ অন ডেলিভারি।</strong> যে পণ্য রাখছেন, শুধু তার জন্য নগদ টাকা দেন। ফেরত দেওয়া পণ্য হিসাবে আসে না। টাকা দেওয়ার আগে পুরো অর্ডার ফেরত দিলে পণ্যের দাম দিতে হয় না।
              </p>
              <p>
                <strong className="text-warm-fg">bKash।</strong> অর্ডার দেখে নেওয়ার পর রাখা পণ্যের মোট টাকা bKash-এ দিতে পারেন, নম্বর {DELIVERY_POLICY.paymentMethods.bkashNumber}। যে পণ্য পরে ফেরত দিচ্ছেন তার জন্য আগেই bKash পাঠিয়ে থাকলে, কর্মী যাওয়ার আগে বলে দিন। সেই টাকা bKash-এ ফেরত দেওয়া হবে। কর্মী চলে গেলে ফোন বা WhatsApp করুন। আমরা bKash-এ টাকা ফেরতের ব্যবস্থা করব।
              </p>
              <p>
                পণ্য ফেরত দিলে আলাদা ফি লাগে না। ৳{DELIVERY_POLICY.freeDeliveryThresholdBdt} বা তার বেশি অর্ডারে ডেলিভারি ফ্রি, তার কম হলে ৳{DELIVERY_POLICY.standardDeliveryFeeBdt}। বিস্তারিত <Link href="/bn/delivery" className={linkClass}>ডেলিভারি পাতায়</Link>।
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
