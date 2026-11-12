import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'অর্ডারের অবস্থা',
  robots: {
    index: false,
    follow: true,
  },
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
