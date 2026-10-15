import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedGuide, getPublishedGuides } from '../../../lib/buying-guides/service';
import { guideUrl } from '../../../lib/buying-guides/model';
import { getGuideProducts } from '../../../lib/buying-guides/catalogue';
import { BuyingGuideArticle } from '../../../components/buying-guides/BuyingGuideArticle';

// Editorial data is versioned; offers must not be frozen in a build/ISR cache.
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getPublishedGuide((await params).slug);
  if (!guide) notFound();
  return {
    title: `${guide.title} | Lucky Store`, description: guide.description,
    alternates: { canonical: guideUrl(guide.slug) },
    openGraph: { type: 'article', title: guide.title, description: guide.description,
      url: guideUrl(guide.slug), publishedTime: guide.publishedAt, modifiedTime: guide.updatedAt },
  };
}

export default async function BuyingGuidePage({ params }: Props) {
  const guide = getPublishedGuide((await params).slug);
  if (!guide) notFound();
  const products = await getGuideProducts(guide);
  return <BuyingGuideArticle guide={guide} products={products}
    related={getPublishedGuides().filter(g => guide.relatedSlugs.includes(g.slug) && g.slug !== guide.slug)} />;
}
