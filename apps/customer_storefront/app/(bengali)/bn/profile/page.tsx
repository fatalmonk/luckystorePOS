import type { Metadata } from 'next';
import ProfilePage from '../../../(english)/profile/page';

export const metadata: Metadata = {
  title: { absolute: 'আমার অ্যাকাউন্ট | Lucky Store' },
  description: 'আপনার লাকি স্টোর অ্যাকাউন্ট ও অর্ডারের তথ্য দেখুন।',
  robots: { index: false, follow: false },
  alternates: {
    canonical: 'https://www.luckystore1947.com/bn/profile',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/profile',
      'bn-BD': 'https://www.luckystore1947.com/bn/profile',
      'x-default': 'https://www.luckystore1947.com/profile',
    },
  },
};

export default ProfilePage;
