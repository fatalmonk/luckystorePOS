'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '../components/Header';
import { CategoryGrid } from '../components/CategoryGrid';
import { HeroBanner } from '../components/HeroBanner';
import { PromoGrid } from '../components/PromoGrid';

export default function ComponentTestPage() {
  // Mock data for testing
  const mockCategories = [
    { id: '1', slug: 'dairy', name: 'Dairy', emoji: '🥛' },
    { id: '2', slug: 'beverages', name: 'Beverages', emoji: '🥤' },
    { id: '3', slug: 'snacks', name: 'Snacks', emoji: '🍿' },
    { id: '4', slug: 'bakery', name: 'Bakery', emoji: '🍞' },
    { id: '5', slug: 'produce', name: 'Produce', emoji: '🥬' },
    { id: '6', slug: 'frozen', name: 'Frozen', emoji: '❄️' },
    { id: '7', slug: 'personal-care', name: 'Personal Care', emoji: '🧴' },
    { id: '8', slug: 'household', name: 'Household', emoji: '🏠' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="p-4 space-y-8">
        <h1 className="text-2xl font-bold mb-6">Component Test Page</h1>
        
        <section>
          <h2 className="text-xl font-bold mb-4">Category Grid</h2>
          <CategoryGrid categories={mockCategories} />
        </section>
        
        <section>
          <h2 className="text-xl font-bold mb-4">Hero Banner</h2>
          <HeroBanner
            title="Free Delivery on orders ৳500+"
            subtitle="Cash on delivery. No app download needed."
            badge="LIMITED TIME"
          />
        </section>
        
        <section>
          <h2 className="text-xl font-bold mb-4">Promo Grid</h2>
          <PromoGrid />
        </section>
        
        <Link href="/" className="inline-block mt-4 text-blue-500 hover:underline">
          Back to Home
        </Link>
      </main>
    </div>
  );
}