import type { Metadata } from 'next';
import { FortuneCookiesLanding } from '../../components/seo/FortuneCookiesLanding';

const pageUrl = 'https://www.luckystore1947.com/fortune-cookies-near-me';
const bengaliPageUrl = 'https://www.luckystore1947.com/bn/fortune-cookies-near-me';

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: { absolute: 'Fortune Cookies unavailable | Lucky Store' },
  description: 'Lucky Store does not stock Fortune Cookies and has no plans to stock them. Browse biscuits and cookies for alternatives.',
  alternates: {
    canonical: pageUrl,
    languages: { 'en-BD': pageUrl, 'bn-BD': bengaliPageUrl, 'x-default': pageUrl },
  },
  openGraph: {
    type: 'website', locale: 'en_BD', url: pageUrl, siteName: 'Lucky Store',
    title: 'Fortune Cookies unavailable | Lucky Store',
    description: 'Lucky Store does not stock Fortune Cookies and has no plans to stock them. Browse biscuits and cookies for alternatives.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fortune Cookies unavailable | Lucky Store',
    description: 'Lucky Store does not stock Fortune Cookies and has no plans to stock them. Browse biscuits and cookies for alternatives.',
  },
};

export default function FortuneCookiesNearMePage() {
  return <FortuneCookiesLanding locale="en" />;
}
