import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout | Lucky Store',
  robots: {
    index: false,
    follow: true,
  },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
