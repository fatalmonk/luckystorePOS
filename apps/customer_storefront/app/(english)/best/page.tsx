import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getPublishedGuides } from '../../lib/buying-guides/service';
import { GUIDE_BASE_URL } from '../../lib/buying-guides/model';

export function generateMetadata(): Metadata {
  return { title: 'Buying guides | Lucky Store', description: 'Compare selected Lucky Store products, pack sizes and current prices.',
    alternates: { canonical: `${GUIDE_BASE_URL}/best` }, robots: { index: getPublishedGuides().length > 0, follow: true } };
}

export default function BuyingGuidesIndex() {
  const guides = getPublishedGuides();
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-12"><h1 className="text-4xl font-bold">Lucky Store buying guides</h1>
    <p>Compare pack sizes and current prices using our published research.</p>
    {guides.length ? <ul className="space-y-4">{guides.map(g => <li key={g.slug}><Link className="font-bold underline" href={`/best/${g.slug}`}>{g.title}</Link><p>{g.description}</p></li>)}</ul>
      : <p>Our first buying guides are being researched. <Link href="/category" className="underline">Browse current products</Link>.</p>}
    <Link href="/best/editorial" className="underline">Editorial policy</Link></main>;
}
