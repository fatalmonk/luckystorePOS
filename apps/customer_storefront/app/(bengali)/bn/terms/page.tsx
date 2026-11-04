import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../../components/updated/Header';
import { BottomNav } from '../../../components/BottomNav';
import { DELIVERY_POLICY, RETURN_RULES } from '../../../lib/deliveryData';

const CANONICAL = 'https://www.luckystore1947.com/bn/terms';

export const metadata: Metadata = {
  title: 'কেনাকাটার শর্তাবলী',
  description: `চকবাজারের লাকি স্টোর থেকে অর্ডার, দাম, ক্যাশ অন ডেলিভারি বা bKash, এবং দোকান থেকে ${DELIVERY_POLICY.radiusKm} কিমির মধ্যে ডেলিভারির শর্ত।`,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: CANONICAL,
    languages: {
      'en-BD': 'https://www.luckystore1947.com/terms',
      'bn-BD': CANONICAL,
      'x-default': 'https://www.luckystore1947.com/terms',
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

export default function BengaliTermsPage() {
  return (
    <>
      <Header locale="bn" />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px] max-w-3xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl mb-3" aria-hidden="true">📜</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-warm-fg mb-2">
              কেনাকাটার শর্তাবলী
            </h1>
            <p className="text-sm text-warm-muted max-w-md mx-auto leading-relaxed">
              এই শর্ত চকবাজারের মুদি ও দৈনন্দিন বাজার, লাকি স্টোর থেকে কেনাকাটার জন্য।
            </p>
            <p className="text-xs text-warm-muted mt-3">কার্যকর তারিখ: ৪ নভেম্বর ২০২৬</p>
          </div>

          <div className="space-y-4 mb-10">
            <PolicySection icon="🏪" title="দোকান">
              <p>
                লাকি স্টোর {DELIVERY_POLICY.establishedYear} সাল থেকে চকবাজারের একটি মুদি ও দৈনন্দিন বাজারের দোকান। ঠিকানা: {DELIVERY_POLICY.hubAddress}।
                অর্ডার দিলে আপনি এই শর্ত এবং আমাদের <Link href="/bn/return-policy" className={linkClass}>ফেরত নীতি</Link> মেনে নিচ্ছেন।
              </p>
            </PolicySection>

            <PolicySection icon="🛒" title="অর্ডার">
              <p>
                এই ওয়েবসাইটে মুদি ও দৈনন্দিন বাজারের পণ্য অর্ডার করা যায়। অর্ডার মানে দোকান থেকে সেই পণ্য গুছিয়ে পাঠানোর অনুরোধ।
                ডেলিভারি দেন আমাদের নিজস্ব কর্মীরা। বাইরের কুরিয়ার ব্যবহার করা হয় না।
              </p>
              <p>
                কাছের একটি পরিচিত স্থানসহ পুরো ঠিকানা দিন। নিচের এলাকার বাইরে ডেলিভারি হয় না।
              </p>
            </PolicySection>

            <PolicySection icon="🏷️" title="দাম ও স্টক">
              <p>দাম টাকায় (৳) দেখানো হয়। পণ্যের পাতায় যে দাম আছে, সেটিই সেই পণ্যের দাম।</p>
              <p>
                দোকানে স্টক থাকলে তবেই পণ্য প্যাক করা হয়। কোনো পণ্য দিতে না পারলে সেটি অর্ডার থেকে বাদ যায়।
                আপনি যা পাননি, তার জন্য চার্জ হয় না। যা পেয়েছেন এবং রেখেছেন, শুধু তার জন্যই টাকা দেন।
              </p>
            </PolicySection>

            <PolicySection icon="💵" title="পেমেন্ট">
              <p>পণ্য দেখে নেওয়ার পর দরজায় পেমেন্ট করেন। আমরা নিই:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>ক্যাশ অন ডেলিভারি</li>
                <li>দরজায় bKash, নম্বর {DELIVERY_POLICY.paymentMethods.bkashNumber}</li>
              </ul>
              <p>অর্ডার পৌঁছানোর আগে টাকা চাওয়া হয় না।</p>
            </PolicySection>

            <PolicySection icon="🚚" title="ডেলিভারি">
              <p>
                আমাদের নিজস্ব কর্মীরা শুধু এমদাদ পার্ক, চকবাজারের দোকান থেকে {DELIVERY_POLICY.radiusKm} কিমির মধ্যে ডেলিভারি দেন।
                এই সীমার বাইরের ঠিকানায় ডেলিভারি হয় না। কোন কোন রাস্তায় যায়, তা <Link href="/bn/delivery" className={linkClass}>ডেলিভারি পাতায়</Link> লেখা আছে।
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>৳{DELIVERY_POLICY.freeDeliveryThresholdBdt} বা তার বেশি অর্ডারে ফ্রি</li>
                <li>৳{DELIVERY_POLICY.freeDeliveryThresholdBdt}-এর কম অর্ডারে ৳{DELIVERY_POLICY.standardDeliveryFeeBdt}</li>
                <li>খোলা থাকে {DELIVERY_POLICY.deliveryHours.display}</li>
                <li>এই সময়ে দেওয়া অর্ডার সেই দিনেই পাঠানো হয়</li>
              </ul>
            </PolicySection>

            <PolicySection icon="🔄" title="পণ্য দেখে নেওয়া ও ফেরত">
              <p>{RETURN_RULES.bn.doorstep}</p>
              <p>{RETURN_RULES.bn.defective}</p>
              <p>
                ক্যাশ ও bKash-এ টাকা ফেরতের নিয়ম <Link href="/bn/return-policy" className={linkClass}>ফেরত নীতিতে</Link> লেখা আছে।
              </p>
            </PolicySection>

            <PolicySection icon="⚖️" title="প্রযোজ্য আইন">
              <p>এই শর্ত বাংলাদেশের আইন অনুসারে চলবে।</p>
            </PolicySection>

            <PolicySection icon="📞" title="যোগাযোগ">
              <p>অর্ডার বা এই শর্ত নিয়ে প্রশ্ন থাকলে:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>ফোন: <a href="tel:+8801731944544" className={linkClass}>01731944544</a></li>
                <li>WhatsApp: <a href={DELIVERY_POLICY.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>wa.me/8801731944544</a></li>
                <li>ইমেইল: <a href="mailto:hello@luckystore1947.com" className={linkClass}>hello@luckystore1947.com</a></li>
                <li>ঠিকানা: {DELIVERY_POLICY.hubAddress}</li>
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
