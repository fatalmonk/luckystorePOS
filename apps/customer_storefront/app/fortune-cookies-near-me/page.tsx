import type { Metadata } from 'next';
import { FortuneCookiesLanding } from '../components/seo/FortuneCookiesLanding';

const pageUrl = 'https://www.luckystore1947.com/fortune-cookies-near-me';
const bengaliPageUrl = 'https://www.luckystore1947.com/bn/fortune-cookies-near-me';

export const metadata: Metadata = {
  title: { absolute: 'Fortune Cookies Near Me in Chattogram | Lucky Store' },
  description: 'Looking for Fortune Cookies near Chawkbazar, Chattogram? Check Lucky Store availability, browse biscuits and cookies, or ask the store team on WhatsApp.',
  alternates: {
    canonical: pageUrl,
    languages: { 'en-BD': pageUrl, 'bn-BD': bengaliPageUrl, 'x-default': pageUrl },
  },
  openGraph: {
    type: 'website', locale: 'en_BD', url: pageUrl, siteName: 'Lucky Store',
    title: 'Fortune Cookies Near Me in Chattogram | Lucky Store',
    description: 'Check Fortune Cookies availability near Chawkbazar, browse biscuits and cookies, or ask Lucky Store on WhatsApp.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fortune Cookies Near Me in Chattogram | Lucky Store',
    description: 'Check Fortune Cookies availability near Chawkbazar, browse biscuits and cookies, or ask Lucky Store on WhatsApp.',
  },
};

export default function FortuneCookiesNearMePage() {
  return <FortuneCookiesLanding locale="en" />;
}
