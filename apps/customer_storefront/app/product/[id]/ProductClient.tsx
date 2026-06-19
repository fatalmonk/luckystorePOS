'use client'; // product detail page with cart interactions and toast

import Image from 'next/image';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { useToast } from '../../components/Toast';
import { useCartContext } from '../../components/CartProvider';
import { WishlistButton } from '../../components/WishlistButton';
import { QtyNumber } from '../../components/ui/QtyNumber';
import { formatBdt } from '../../lib/formatPrice';
import type { Product } from '../../lib/types';

interface ProductClientProps {
  product: Product;
}

function ProductContent({ product }: ProductClientProps) {
  const { showToast } = useToast();
  const { cart, addToCart, updateQty } = useCartContext();

  const qtyInCart = cart.find((c) => c.id === product.id)?.qty || 0;

  const stockStatus =
    product.stock <= 0
      ? { text: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-50' }
      : product.stock <= 5
      ? { text: `Only ${product.stock} left`, color: 'text-amber-700', bg: 'bg-amber-50' }
      : { text: 'In Stock', color: 'text-green-700', bg: 'bg-green-50' };

  const handleAdd = () => {
    if (product.stock <= 0) {
      showToast('Sorry, out of stock');
      return;
    }
    addToCart(product);
    showToast(`Added ${product.name}`);
  };

  const handleUpdateQty = (delta: number) => {
    if (qtyInCart + delta <= 0) {
      updateQty(product.id, -1);
    } else {
      updateQty(product.id, delta);
    }
  };

  const taka = Math.floor(product.price);
  const paisa = ((product.price % 1) * 100).toFixed(0).padStart(2, '0');

  return (
    <>
      <Header />

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
        <div className="max-w-3xl mx-auto bg-white min-h-full">
          {/* Hero Section */}
          <div className="px-4 pt-6 pb-5 sm:px-6 lg:px-8">
            <div className="relative w-full aspect-square max-w-[360px] mx-auto rounded-2xl bg-[#f5f3f0] overflow-hidden mb-5">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-contain p-4 sm:p-6"
                  sizes="(max-width: 768px) 100vw, 360px"
                  priority
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-[100px]">{product.emoji}</div>
              )}
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1c1917] mb-1">
                  {product.name}
                </h1>
                <p className="text-sm text-[#78716c]">{product.unit}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${stockStatus.bg} ${stockStatus.color}`}>
                {stockStatus.text}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight text-[#1c1917]">৳{taka}</span>
              <span className="text-lg font-extrabold text-[#1c1917]">{paisa}</span>
            </div>

            {/* Action Area — inline below price, no fixed bar collision */}
            <div className="mt-5">
              {qtyInCart > 0 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQty(-1)}
                    className="w-11 h-11 rounded-full border-2 border-warm-accent bg-white text-warm-accent flex items-center justify-center text-base font-bold hover:bg-warm-accent hover:text-white active:scale-95 transition-all press-feedback"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <QtyNumber qty={qtyInCart} className="font-bold text-sm min-w-[28px] text-center" />
                  <button
                    onClick={() => handleUpdateQty(1)}
                    disabled={qtyInCart >= product.stock}
                    className="w-11 h-11 rounded-full border-2 border-warm-accent bg-white text-warm-accent flex items-center justify-center text-base font-bold hover:bg-warm-accent hover:text-white active:scale-95 transition-all press-feedback disabled:opacity-50"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                  <span className="ml-2 text-sm font-semibold text-[#78716c]">
                    {formatBdt(product.price * qtyInCart)} total
                  </span>
                </div>
              ) : product.stock <= 0 ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <WishlistButton productId={product.id} productName={product.name} />
                  </div>
                  <Link
                    href={`/category/${product.category}`}
                    className="h-12 px-5 rounded-full bg-[#f5f5f4] text-[#1c1917] text-sm font-bold hover:bg-[#e7e5e4] active:scale-[0.98] transition-all flex items-center justify-center"
                  >
                    Browse Similar →
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  className="h-12 px-8 rounded-full bg-warm-accent text-warm-accent-text text-sm font-bold hover:bg-warm-accent-hover active:scale-[0.98] transition-all press-feedback"
                >
                  Add to Cart
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-[#f5f5f4] px-4 py-5 sm:px-6 lg:px-8">
            <h2 className="text-[15px] font-bold mb-2">Description</h2>
            <p className="text-sm text-[#78716c] leading-relaxed">
              {product.description || `Fresh ${product.name} delivered to your door.`}
            </p>
          </div>

          {product.nutrition && (
            <div className="border-t border-[#f5f5f4] px-4 py-5 sm:px-6 lg:px-8">
              <h2 className="text-[15px] font-bold mb-2">Nutrition per 100ml</h2>
              <p className="text-sm text-[#78716c] leading-relaxed">{product.nutrition}</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </>
  );
}

export default function ProductClient({ product }: ProductClientProps) {
  return <ProductContent product={product} />;
}
