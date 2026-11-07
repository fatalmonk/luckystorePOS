import type { Metadata } from 'next';
import LoginPage from '../../../(english)/login/page';

export const metadata: Metadata = {
  title: { absolute: 'লগইন | Lucky Store' },
  description: 'আপনার লাকি স্টোর অ্যাকাউন্টে লগইন করুন।',
  robots: { index: false, follow: false },
  alternates: {
    canonical: 'https://www.luckystore1947.com/bn/login',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/login',
      'bn-BD': 'https://www.luckystore1947.com/bn/login',
      'x-default': 'https://www.luckystore1947.com/login',
    },
  },
};

export default LoginPage;
