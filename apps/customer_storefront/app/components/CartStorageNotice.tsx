'use client';

import { useCartContext } from './CartProvider';

export function CartStorageNotice() {
  const { storageError } = useCartContext();

  if (!storageError) return null;

  return (
    <div
      role="status"
      className="border-t border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-semibold leading-4 text-amber-950"
    >
      Cart saving is unavailable. Items will stay in this tab; keep it open until checkout.
    </div>
  );
}
