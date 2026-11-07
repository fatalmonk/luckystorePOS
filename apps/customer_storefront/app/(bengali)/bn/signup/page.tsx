import type { Metadata } from 'next';
import SignupPage from '../../../(english)/signup/page';

export const metadata: Metadata = {
  title: { absolute: 'অ্যাকাউন্ট তৈরি করুন | Lucky Store' },
  description: 'লাকি স্টোরে আপনার অ্যাকাউন্ট তৈরি করুন।',
  robots: { index: false, follow: false },
  alternates: {
    canonical: 'https://www.luckystore1947.com/bn/signup',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/signup',
      'bn-BD': 'https://www.luckystore1947.com/bn/signup',
      'x-default': 'https://www.luckystore1947.com/signup',
    },
  },
};

export default SignupPage;
