import type { Metadata } from 'next';
import { FortuneCookiesLanding } from '../../../components/seo/FortuneCookiesLanding';

const pageUrl = 'https://www.luckystore1947.com/bn/fortune-cookies-near-me';
const englishPageUrl = 'https://www.luckystore1947.com/fortune-cookies-near-me';

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: { absolute: 'ফরচুন কুকিজ পাওয়া যায় না | লাকি স্টোর' },
  description: 'লাকি স্টোর ফরচুন কুকিজ স্টকে রাখে না এবং রাখার কোনো পরিকল্পনা নেই। বিকল্প পণ্যের জন্য বিস্কুট ও কুকিজ দেখুন।',
  alternates: {
    canonical: pageUrl,
    languages: { 'en-BD': englishPageUrl, 'bn-BD': pageUrl, 'x-default': englishPageUrl },
  },
  openGraph: {
    type: 'website', locale: 'bn_BD', url: pageUrl, siteName: 'Lucky Store',
    title: 'ফরচুন কুকিজ পাওয়া যায় না | লাকি স্টোর',
    description: 'লাকি স্টোর ফরচুন কুকিজ স্টকে রাখে না এবং রাখার কোনো পরিকল্পনা নেই। বিকল্প পণ্যের জন্য বিস্কুট ও কুকিজ দেখুন।',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ফরচুন কুকিজ পাওয়া যায় না | লাকি স্টোর',
    description: 'লাকি স্টোর ফরচুন কুকিজ স্টকে রাখে না এবং রাখার কোনো পরিকল্পনা নেই। বিকল্প পণ্যের জন্য বিস্কুট ও কুকিজ দেখুন।',
  },
};

export default function FortuneCookiesNearMePage() {
  return <FortuneCookiesLanding locale="bn" />;
}
