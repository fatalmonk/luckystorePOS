'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '../../components/updated/Header';
import { BottomNav } from '../../components/BottomNav';
import { getLocalWishlist } from '../../lib/wishlistHelpers';
import { createProductRepository, createProductId } from '../../lib/products/index';
import { createClient as createBrowserSupabaseClient } from '../../lib/supabase/client';
import { toProductSlug } from '../../lib/products/slugify';
import { formatBdt } from '../../lib/formatPrice';
import type { Product } from '../../lib/types';
import { Heart } from '@phosphor-icons/react/dist/csr/Heart';
import { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { ProductImage } from '../../components/product/ProductImage';
import { getLocaleFromPathname, withLocale } from '../../lib/i18n/config';

export default function WishlistPage() {
  const locale = getLocaleFromPathname(usePathname());
  const copy = locale === 'bn'
    ? {
        title: 'আপনার পছন্দের তালিকা',
        emptyTitle: 'আপনার পছন্দের তালিকা খালি',
        emptyDescription: 'আপনার পছন্দের পণ্যগুলো এখানে রাখুন, পরবর্তী অর্ডারের জন্য সহজে পাবেন।',
        startShopping: 'কেনাকাটা শুরু করুন',
        remove: 'তালিকা থেকে সরান',
        savings: 'সাশ্রয়',
      }
    : {
        title: 'Your Wishlist',
        emptyTitle: 'Your wishlist is empty',
        emptyDescription: "Save items you love and we'll keep them here for your next order.",
        startShopping: 'Start Shopping',
        remove: 'Remove',
        savings: 'Save',
      };
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const ids = getLocalWishlist();
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    const client = createBrowserSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    const { repo } = createProductRepository(client);

    Promise.all(ids.map((id) => repo.getById(createProductId(id))))
      .then((products) => {
        if (cancelled) return;
        setItems(products.filter(Boolean) as any[]);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load wishlist products', err);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = (id: string) => {
    setRemovedIds((prev) => [...prev, id]);
    const ids = getLocalWishlist().filter((x) => x !== id);
    localStorage.setItem('lucky_wishlist_ids', JSON.stringify(ids));
    window.dispatchEvent(new StorageEvent('storage'));
    setTimeout(() => {
      setItems((prev) => prev.filter((p) => p.id !== id));
      setRemovedIds((prev) => prev.filter((x) => x !== id));
    }, 300);
  };

  return (
    <div className="min-h-screen bg-warm-bg">
      <Header locale={locale} />
      <main className="max-w-5xl mx-auto px-3 sm:px-4 pt-24 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <Heart weight="fill" size={24} className="text-red-500" />
          <h1 className="text-2xl sm:text-3xl font-black text-warm-fg font-display tracking-tight">
            {copy.title}
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-warm-surface border border-warm-border rounded-[20px] h-64 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-warm-surface border border-warm-border rounded-[24px] p-8 sm:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warm-bg flex items-center justify-center text-warm-muted">
              <Heart weight="bold" size={28} />
            </div>
            <h2 className="text-lg font-bold text-warm-fg mb-2">{copy.emptyTitle}</h2>
            <p className="text-sm text-warm-muted mb-6 max-w-md mx-auto">
              {copy.emptyDescription}
            </p>
            <Link
              href={withLocale('/', locale)}
              className="inline-flex items-center gap-2 bg-warm-accent hover:bg-warm-accent-hover text-warm-fg font-bold text-sm px-5 py-3 rounded-full transition-colors"
            >
              {copy.startShopping} <ArrowRight weight="bold" size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {items.map((product) => (
              <div
                key={product.id}
                className={`group bg-warm-surface border border-warm-border rounded-[20px] overflow-hidden transition-all duration-300 card-hover ${removedIds.includes(product.id) ? 'opacity-0 scale-95' : ''}`}
              >
                <Link href={withLocale(`/product/${toProductSlug(product.name, product.id)}`, locale)} className="block">
                  <div className="relative w-full aspect-[4/3] bg-warm-bg flex items-center justify-center overflow-hidden">
                    <ProductImage
                      src={product.image_url}
                      alt={product.name}
                      category={product.category}
                      sizes="(max-width: 640px) 50vw, 25vw"
                      imageClassName="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-warm-surface/60 to-transparent pointer-events-none" />
                  </div>
                  <div className="p-3.5">
                    <p className="text-lg font-black text-warm-fg font-display tracking-tight">{formatBdt(product.price)}</p>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <p className="text-[10px] font-bold text-red-600 leading-none mt-0.5">
                        {copy.savings} {formatBdt(product.originalPrice - product.price)}
                      </p>
                    )}
                    <h3 className="text-[13px] font-semibold text-warm-fg line-clamp-2 mt-1.5 leading-snug">{product.name}</h3>
                    <p className="text-[10px] text-warm-muted mt-0.5">{product.unit}</p>
                  </div>
                </Link>
                <div className="px-3.5 pb-3.5">
                  <button
                    type="button"
                    onClick={() => handleRemove(product.id)}
                    className="w-full h-9 rounded-full border border-warm-border text-warm-muted text-xs font-bold hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    {copy.remove}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav locale={locale} />
    </div>
  );
}
