import type { Metadata } from 'next';
import CartPage from '../../cart/page';

export const metadata: Metadata = {
  title: 'আপনার ব্যাগ | Lucky Store',
  description: 'লাকি স্টোর অনলাইন ব্যাগ — নির্বাচিত মুদি ও নিত্যপ্রয়োজনীয় পণ্যের তালিকা।',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.luckystore1947.com/bn/cart',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/cart',
      'bn-BD': 'https://www.luckystore1947.com/bn/cart',
      'x-default': 'https://www.luckystore1947.com/cart',
    },
  },
};

export default CartPage;
