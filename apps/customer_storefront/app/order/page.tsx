import { Suspense } from 'react';
import OrderContent from './OrderContent';

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="p-[18px]">Loading...</div>}>
      <OrderContent />
    </Suspense>
  );
}
