import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Buying-guide editorial policy | Lucky Store',
  alternates: { canonical: 'https://www.luckystore1947.com/best/editorial' } };

export default function EditorialPolicy() {
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-12"><h1 className="text-4xl font-bold">Our buying-guide editorial policy</h1>
    <p>Lucky Store sells the products featured in these guides. Our comparisons cover selected catalogue products; they do not represent a complete survey of the Bangladesh market.</p>
    <h2 className="text-2xl font-bold">Evidence before recommendations</h2><p>Each published guide identifies its author, sources, comparison method and research dates. Editorial content requires factual verification and approval. We do not invent customer reviews, testimonials, ratings or nutritional benefits.</p>
    <h2 className="text-2xl font-bold">Prices, availability and revisions</h2><p>Prices and stock are read from our public catalogue when a guide is requested. They can change before checkout. Editorial rankings, where used, remain tied to the stated research revision. Unavailable products are marked explicitly; missing or changed product details require re-verification.</p>
    <h2 className="text-2xl font-bold">Choosing fairly</h2><p>Where comparable evidence is insufficient, we publish an unranked comparison. Pack-price calculations are explained and do not establish nutritional quality or medical suitability. Read product labels before buying.</p>
    <p><Link href="/contact" className="underline">Contact Lucky Store</Link> about a correction. <Link href="/best" className="underline">Browse buying guides</Link>.</p></main>;
}
