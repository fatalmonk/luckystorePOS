import { Suspense } from 'react';
import OrderContent from './OrderContent';

function OrderSkeleton() {
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 bg-[#faf8f5]">
      <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse mb-4" />
      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderContent />
    </Suspense>
  );
}
