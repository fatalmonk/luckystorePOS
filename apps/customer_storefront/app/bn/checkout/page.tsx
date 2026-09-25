import type { Metadata } from 'next';
import CheckoutPage from '../../checkout/page';

export const metadata: Metadata = {
  title: 'চেকআউট | Lucky Store',
  description: 'লাকি স্টোর অনলাইন চেকআউট — ডেলিভারি ঠিকানা দিন এবং অর্ডার সম্পন্ন করুন।',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.luckystore1947.com/bn/checkout',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/checkout',
      'bn-BD': 'https://www.luckystore1947.com/bn/checkout',
      'x-default': 'https://www.luckystore1947.com/checkout',
    },
  },
};

export default CheckoutPage;
