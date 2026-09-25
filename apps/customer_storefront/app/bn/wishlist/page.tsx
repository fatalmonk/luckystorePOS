import type { Metadata } from 'next';
import WishlistPage from '../../wishlist/page';

export const metadata: Metadata = {
  title: 'পছন্দের তালিকা | Lucky Store',
  description: 'আপনার সংরক্ষিত ও পছন্দের পণ্যের তালিকা।',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.luckystore1947.com/bn/wishlist',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/wishlist',
      'bn-BD': 'https://www.luckystore1947.com/bn/wishlist',
      'x-default': 'https://www.luckystore1947.com/wishlist',
    },
  },
};

export default WishlistPage;
