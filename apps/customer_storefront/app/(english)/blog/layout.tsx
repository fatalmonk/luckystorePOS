import type { ReactNode } from 'react';
import React from 'react';
import { Header } from '../../components/updated/Header';
import { Footer } from '../../components/updated/Footer';
import { BottomNav } from '../../components/BottomNav';

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">{children}</div>
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
