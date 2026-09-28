import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ variable: 'font-bricolage' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
  Manrope: () => ({ variable: 'font-manrope' }),
  Noto_Sans_Bengali: () => ({ variable: 'font-bengali' }),
}));

vi.mock('next/script', () => ({ default: () => null }));
vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }));
vi.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => null }));
vi.mock('../components/Toast', () => ({ ToastProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../components/CartProvider', () => ({ CartProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../components/providers/CartSheetProvider', () => ({ CartSheetProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../components/WebMCPInit', () => ({ WebMCPInit: () => null }));
vi.mock('../components/providers/AuthProvider', () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../components/providers/ThemeProvider', () => ({ ThemeProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../lib/deliveryData', () => ({ getDeliveryShippingServiceSchema: () => ({}) }));

import EnglishRootLayout from '../(english)/layout';
import BengaliRootLayout from '../(bengali)/layout';

describe('RootLayout document language', () => {
  it('server-renders the English root layout with lang=en', () => {
    const markup = renderToStaticMarkup(EnglishRootLayout({ children: React.createElement('main') }));
    expect(markup).toContain('<html lang="en"');
  });

  it('server-renders the Bengali root layout with lang=bn', () => {
    const markup = renderToStaticMarkup(BengaliRootLayout({ children: React.createElement('main') }));
    expect(markup).toContain('<html lang="bn"');
  });
});
