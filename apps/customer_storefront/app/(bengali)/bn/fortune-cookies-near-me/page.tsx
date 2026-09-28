import type { Metadata } from 'next';
import { FortuneCookiesLanding } from '../../../components/seo/FortuneCookiesLanding';

const pageUrl = 'https://www.luckystore1947.com/bn/fortune-cookies-near-me';
const englishPageUrl = 'https://www.luckystore1947.com/fortune-cookies-near-me';

export const metadata: Metadata = {
  title: { absolute: 'কাছাকাছি ফরচুন কুকিজ | লাকি স্টোর' },
  description: 'চট্টগ্রামের চকবাজারে ফরচুন কুকিজ খুঁজছেন? লাকি স্টোরের প্রাপ্যতা জানুন, বিস্কুট ও কুকিজ দেখুন অথবা হোয়াটসঅ্যাপে যোগাযোগ করুন।',
  alternates: {
    canonical: pageUrl,
    languages: { 'en-BD': englishPageUrl, 'bn-BD': pageUrl, 'x-default': englishPageUrl },
  },
  openGraph: {
    type: 'website', locale: 'bn_BD', url: pageUrl, siteName: 'Lucky Store',
    title: 'কাছাকাছি ফরচুন কুকিজ | লাকি স্টোর',
    description: 'চকবাজারে ফরচুন কুকিজের প্রাপ্যতা জানুন, বিস্কুট ও কুকিজ দেখুন অথবা হোয়াটসঅ্যাপে যোগাযোগ করুন।',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'কাছাকাছি ফরচুন কুকিজ | লাকি স্টোর',
    description: 'চকবাজারে ফরচুন কুকিজের প্রাপ্যতা জানুন, বিস্কুট ও কুকিজ দেখুন অথবা হোয়াটসঅ্যাপে যোগাযোগ করুন।',
  },
};

export default function FortuneCookiesNearMePage() {
  return <FortuneCookiesLanding locale="bn" />;
}
