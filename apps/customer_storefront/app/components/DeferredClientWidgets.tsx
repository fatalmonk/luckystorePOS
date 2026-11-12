'use client';

import dynamic from 'next/dynamic';

const WhatsAppFloat = dynamic(() => import('./WhatsAppFloat').then((mod) => mod.WhatsAppFloat), { ssr: false });
const MetaPixel = dynamic(() => import('./MetaPixel').then((mod) => mod.MetaPixel), { ssr: false });

/** Off-screen widgets. Their scripts and styles load after the first paint. */
export function DeferredClientWidgets() {
  return (
    <>
      <WhatsAppFloat />
      <MetaPixel />
    </>
  );
}
