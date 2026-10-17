'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { rememberBuyingGuide, sendAnalyticsEvent, trackBuyingGuideView } from '../../lib/analytics';
import type { Product } from '../../lib/types';
import { useCartContext } from '../CartProvider';

export function GuideView({ slug, revision }: { slug: string; revision: number }) {
  const sent = useRef('');
  useEffect(() => {
    const key = `${slug}:${revision}`;
    if (sent.current !== key && trackBuyingGuideView(slug, revision)) sent.current = key;
  }, [slug, revision]);
  return null;
}

export function GuideProductLink({ href, slug, revision, productId, children }: {
  href: string; slug: string; revision: number; productId: string; children: React.ReactNode;
}) {
  return <Link className="font-bold text-warm-accent underline underline-offset-4" href={href} onClick={() => {
    // Refresh context for visitors who granted consent after the initial guide render.
    rememberBuyingGuide(slug, revision);
    sendAnalyticsEvent('buying_guide_product_click', {
      buying_guide_slug: slug, buying_guide_revision: revision, item_id: productId,
    });
  }}>{children}</Link>;
}

export function GuideAddToCartButton({ product, slug, revision, className }: {
  product: Product; slug: string; revision: number; className?: string;
}) {
  const { addToCart } = useCartContext();
  const [message, setMessage] = useState('');

  return <div>
    <button type="button" className={className} aria-label={`Add ${product.name} to cart`} onClick={() => {
      // The existing cart analytics path reads this context when consent is present.
      rememberBuyingGuide(slug, revision);
      setMessage(addToCart(product) ? 'Added to cart' : 'Already at the available stock limit');
    }}>Add to cart</button>
    <span role="status" aria-live="polite" className="sr-only">{message}</span>
  </div>;
}
