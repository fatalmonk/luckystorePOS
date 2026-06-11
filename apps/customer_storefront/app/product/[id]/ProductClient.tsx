'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { ToastProvider, useToast } from '../../components/Toast';
import { CartProvider, useCartContext } from '../../components/CartProvider';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { Product } from '../../lib/types';

interface ProductClientProps {
  product: Product;
}

function ProductContent({ product }: ProductClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { cart, addToCart, updateQty, totalItems } = useCartContext();
  const [localQty, setLocalQty] = useState(1);

  const qtyInCart = cart.find((c) => c.id === product.id)?.qty || 0;

  const stockStatus =
    product.stock <= 0
      ? { variant: 'danger' as const, text: 'Out of Stock' }
      : product.stock <= 5
      ? { variant: 'warning' as const, text: `Only ${product.stock} left` }
      : { variant: 'success' as const, text: 'In Stock' };

  const handleAdd = () => {
    if (product.stock <= 0) {
      showToast('Sorry, out of stock');
      return;
    }
    addToCart(product);
    showToast(`Added ${product.name}`);
    setLocalQty(1);
  };

  const handleUpdateQty = (delta: number) => {
    if (qtyInCart + delta <= 0) {
      updateQty(product.id, -1);
    } else {
      updateQty(product.id, delta);
    }
  };

  return (
    <>
      <Header cartCount={totalItems} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
        {/* Hero Section */}
        <div className="bg-white px-6 py-8 text-center">
          <div className="w-[180px] h-[180px] mx-auto mb-5 text-[90px] grid place-items-center">
            {product.emoji}
          </div>
          <p className="text-[32px] font-extrabold tracking-tight mb-1">
            ৳{product.price}
          </p>
          <p className="text-sm text-[#78716c] mb-3">{product.unit}</p>
          <Badge variant={stockStatus.variant}>{stockStatus.text}</Badge>
        </div>

        {/* Details */}
        <div className="bg-white border-t border-[#f5f5f4] p-[18px]">
          <h3 className="text-[15px] font-bold mb-2.5">Description</h3>
          <p className="text-sm text-[#78716c] leading-relaxed">
            {product.description}
          </p>
        </div>

        {product.nutrition && (
          <div className="bg-white border-t border-[#f5f5f4] p-[18px]">
            <h3 className="text-[15px] font-bold mb-2.5">Nutrition per 100ml</h3>
            <p className="text-sm text-[#78716c] leading-relaxed">
              {product.nutrition}
            </p>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e7e5e4] p-4 flex items-center gap-3.5 z-40">
        <div className="flex-1">
          <p className="text-[11px] text-[#a8a29e] uppercase tracking-widest font-semibold mb-0.5">
            Total
          </p>
          <p className="text-xl font-extrabold">
            ৳{product.price * (qtyInCart > 0 ? qtyInCart : localQty)}
          </p>
        </div>

        {qtyInCart > 0 ? (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleUpdateQty(-1)}
              className="w-7 h-7 rounded-lg border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center text-sm font-semibold hover:border-[#FFF34D] hover:text-[#5c5200] transition-colors"
            >
              −
            </button>
            <span className="font-bold text-sm min-w-[24px] text-center">
              {qtyInCart}
            </span>
            <button
              onClick={() => handleUpdateQty(1)}
              disabled={qtyInCart >= product.stock}
              className="w-7 h-7 rounded-lg border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center text-sm font-semibold hover:border-[#FFF34D] hover:text-[#5c5200] transition-colors disabled:opacity-50"
            >
              +
            </button>
          </div>
        ) : (
          <Button
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="flex-0 w-[120px]"
          >
            Add
          </Button>
        )}
      </div>

      <BottomNav cartCount={totalItems} />
    </>
  );
}

export default function ProductClient({ product }: ProductClientProps) {
  return (
    <ToastProvider>
      <CartProvider>
        <ProductContent product={product} />
      </CartProvider>
    </ToastProvider>
  );
}
