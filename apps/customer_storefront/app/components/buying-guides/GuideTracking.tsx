'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { rememberBuyingGuide, sendAnalyticsEvent, trackBuyingGuideView } from '../../lib/analytics';

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
