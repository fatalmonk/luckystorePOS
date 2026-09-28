import type { ReactNode } from 'react';
import React from 'react';
import RootLayoutDocument, { metadata, viewport } from '../RootLayoutDocument';

export { metadata, viewport };

export default function BengaliRootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <RootLayoutDocument lang="bn">{children}</RootLayoutDocument>;
}
