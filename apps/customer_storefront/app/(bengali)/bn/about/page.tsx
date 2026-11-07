import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../../components/updated/Header';
import { BottomNav } from '../../../components/BottomNav';
import { DELIVERY_POLICY } from '../../../lib/deliveryData';

const CANONICAL = 'https://www.luckystore1947.com/bn/about';

export const metadata: Metadata = {
  title: 'লাকি স্টোর সম্পর্কে',
  description: `লাকি স্টোর ${DELIVERY_POLICY.establishedYear} সাল থেকে চকবাজার, এমদাদ পার্কের মুদি ও দৈনন্দিন বাজারের দোকান। নিজস্ব কর্মী দিয়ে ${DELIVERY_POLICY.radiusKm} কিমির মধ্যে ডেলিভারি।`,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: CANONICAL,
    languages: {
      'en-BD': 'https://www.luckystore1947.com/about',
      'bn-BD': CANONICAL,
      'x-default': 'https://www.luckystore1947.com/about',
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

export default function BengaliAboutPage() {
  return (
    <>
      <Header locale="bn" />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px] max-w-3xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl mb-3" aria-hidden="true">🏪</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-warm-fg mb-2">
              লাকি স্টোর সম্পর্কে
            </h1>
            <p className="text-sm text-warm-muted max-w-md mx-auto leading-relaxed">
              এমদাদ পার্ক, চকবাজারের মুদি ও দৈনন্দিন বাজারের দোকান। {DELIVERY_POLICY.establishedYear} সাল থেকে এই পাড়ায়।
            </p>
            <p className="text-xs text-warm-muted mt-3">চকবাজার, চট্টগ্রাম · {DELIVERY_POLICY.establishedYear} থেকে</p>
          </div>

          <div className="space-y-4 mb-10">
            <PolicySection icon="📍" title="কোথায় দোকান">
              <p>
                লাকি স্টোরের ঠিকানা {DELIVERY_POLICY.hubAddress}। দোকানটি চট্টগ্রামের চকবাজার এলাকায়, এমদাদ পার্কে।
              </p>
            </PolicySection>

            <PolicySection icon="📜" title="১৯৪৭ সাল থেকে">
              <p>
                দোকানটি {DELIVERY_POLICY.establishedYear} সাল থেকে এই জায়গায় আছে। চকবাজারের পরিবারেরা বহু বছর ধরে এই কাউন্টার থেকে দৈনন্দিন বাজার কিনে আসছেন। এখন একই দোকানে এই ওয়েবসাইট থেকেও অর্ডার করা যায়।
              </p>
            </PolicySection>

            <PolicySection icon="🛒" title="কী বিক্রি হয়">
              <p>
                আমরা মুদি ও দৈনন্দিন বাজারের পণ্য বিক্রি করি: চাল, রান্নার তেল, চা, মসলা, নাস্তা, এবং রান্নাঘর ও ঘরের নিত্যপ্রয়োজনীয় জিনিস।
              </p>
            </PolicySection>

            <PolicySection icon="🚚" title="ডেলিভারি">
              <p>
                আমাদের নিজস্ব কর্মীরা দোকান থেকে {DELIVERY_POLICY.radiusKm} কিমির মধ্যে ডেলিভারি দেন। ৳{DELIVERY_POLICY.freeDeliveryThresholdBdt} বা তার বেশি অর্ডারে ডেলিভারি ফ্রি, তার কম হলে ৳{DELIVERY_POLICY.standardDeliveryFeeBdt}।
              </p>
              <p>
                দোকান খোলা থাকে প্রতিদিন সকাল ৯টা থেকে রাত ১২টা ৩০ মিনিট পর্যন্ত। এই সময়ে দেওয়া অর্ডার সেই দিনেই পাঠানো হয়।
                পণ্য দেখে নেওয়ার পর ক্যাশ অন ডেলিভারি বা দরজায় bKash-এ টাকা দিতে পারেন।
              </p>
              <p>
                এলাকা, চার্জ ও সময়ের বিস্তারিত <Link href="/bn/delivery" className={linkClass}>ডেলিভারি পাতায়</Link> আছে।
              </p>
            </PolicySection>

            <PolicySection icon="📞" title="যোগাযোগ">
              <ul className="list-disc pl-4 space-y-1">
                <li>ফোন: <a href="tel:+8801731944544" className={linkClass}>01731944544</a></li>
                <li>WhatsApp: <a href={DELIVERY_POLICY.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>wa.me/8801731944544</a></li>
                <li>ইমেইল: <a href="mailto:hello@luckystore1947.com" className={linkClass}>hello@luckystore1947.com</a></li>
              </ul>
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
