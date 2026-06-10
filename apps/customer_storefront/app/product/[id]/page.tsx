'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { ToastProvider, useToast } from '../../components/Toast';
import { CartProvider, useCartContext } from '../../components/CartProvider';
import { ProductGrid } from '../../components/ProductGrid';
import { WishlistButton } from '../../components/WishlistButton';
import { Button } from '../../components/ui/Button';
import { fetchProducts } from '../../lib/products';
import type { Product } from '../../lib/types';

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ToastProvider>
      <CartProvider>
        <ProductContent params={params} />
      </CartProvider>
    </ToastProvider>
  );
}

function ProductContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { cart, addToCart, updateQty, totalItems } = useCartContext();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setId(id);
      setLoading(true);
      fetchProducts().then((products) => {
        const found = products.find((p) => p.id === id);
        if (found) {
          setProduct(found);
          setRelated(products.filter((p) => p.category === found.category && p.id !== id).slice(0, 4));
        }
        setLoading(false);
      });
    });
  }, [params]);

  const getQtyInCart = (pid: string) => {
    const item = cart.find((c) => c.id === pid);
    return item?.qty || 0;
  };

  if (loading) {
    return (
      <>
        <Header cartCount={totalItems} />
        <div className="p-4 animate-pulse">
          <div className="bg-[#e7e5e4] rounded-[14px] h-64 mb-4" />
          <div className="bg-[#e7e5e4] rounded h-6 w-3/4 mb-2" />
          <div className="bg-[#e7e5e4] rounded h-4 w-1/2 mb-4" />
          <div className="bg-[#e7e5e4] rounded h-10 w-full" />
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header cartCount={totalItems} />
        <div className="p-4 text-center py-16">
          <p className="text-[#78716c]">Product not found</p>
          <Button onClick={() => router.push('/')} className="mt-4">Go Home</Button>
        </div>
      </>
    );
  }

  const qtyInCart = getQtyInCart(product.id);
  const outOfStock = product.stock <= 0;

  return (
    <>
      <Header cartCount={totalItems} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* Image */}
          <div className="aspect-square sm:aspect-[4/3] bg-[#f5f3f0] rounded-[14px] grid place-items-center text-[80px] sm:text-[96px] mb-4 overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              product.emoji
            )}
          </div>

          {/* Info */}
          <h1 className="text-xl font-bold mb-1">{product.name}</h1>
          <p className="text-[#a8a29e] text-sm mb-3">{product.unit}</p>
          <p className="text-2xl font-extrabold mb-4">৳{product.price}</p>

          {product.stock > 0 && product.stock <= 5 && (
            <p className="text-[#b45309] text-sm font-semibold mb-3">Only {product.stock} left in stock!</p>
          )}

          {/* Add to cart */}
          {outOfStock ? (
            <WishlistButton productId={product.id} productName={product.name} />
          ) : qtyInCart > 0 ? (
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => updateQty(product.id, -1)}
                className="w-10 h-10 rounded-lg border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center font-semibold hover:border-[#dc5f3b]"
              >
                −
              </button>
              <span className="font-bold text-lg min-w-[32px] text-center">{qtyInCart}</span>
              <button
                onClick={() => updateQty(product.id, 1)}
                className="w-10 h-10 rounded-lg border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center font-semibold hover:border-[#dc5f3b]"
              >
                +
              </button>
            </div>
          ) : (
            <Button
              fullWidth
              onClick={() => {
                addToCart(product);
                showToast(`Added ${product.name}`);
              }}
              className="mb-4"
            >
              Add to Cart — ৳{product.price}
            </Button>
          )}

          {/* Description */}
          {product.description && (
            <div className="mt-4">
              <h2 className="font-bold mb-2">Description</h2>
              <p className="text-sm text-[#78716c] leading-relaxed">{product.description}</p>
            </div>
          )}

          {product.nutrition && (
            <div className="mt-4">
              <h2 className="font-bold mb-2">Nutrition</h2>
              <p className="text-sm text-[#78716c]">{product.nutrition}</p>
            </div>
          )}

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-6">
              <h2 className="font-bold mb-3">Related Products</h2>
              <ProductGrid
                products={related}
                cart={cart}
                onAdd={(p) => {
                  addToCart(p);
                  showToast(`Added ${p.name}`);
                }}
                onUpdateQty={(pid, delta) => updateQty(pid, delta)}
                onClick={(pid) => router.push(`/product/${pid}`)}
              />
            </div>
          )}
        </div>
      </main>
      <BottomNav cartCount={totalItems} />
    </>
  );
}
