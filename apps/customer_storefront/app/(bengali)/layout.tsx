import type { ReactNode } from 'react';
import React from 'react';
import RootLayoutDocument, { metadata, viewport } from '../RootLayoutDocument';
import './bengali-font.css';

export { metadata, viewport };

export default function BengaliRootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <RootLayoutDocument lang="bn" extraClassName="font-bengali">{children}</RootLayoutDocument>;
}
