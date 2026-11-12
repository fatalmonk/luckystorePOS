import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import React from 'react';
import RootLayoutDocument, { metadata as rootMetadata, viewport } from '../RootLayoutDocument';
import './bengali-font.css';

export const metadata: Metadata = {
  ...rootMetadata,
  openGraph: {
    ...rootMetadata.openGraph,
    locale: 'bn_BD',
    alternateLocale: ['en_BD'],
  },
};

export { viewport };

export default function BengaliRootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <RootLayoutDocument lang="bn" extraClassName="font-bengali">{children}</RootLayoutDocument>;
}
