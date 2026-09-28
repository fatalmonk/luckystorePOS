import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const mockPathname = vi.hoisted(() => ({ value: '/' }));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-lucky-pathname': mockPathname.value })),
}));

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
vi.mock('../delivery/deliveryData', () => ({ getDeliveryShippingServiceSchema: () => ({}) }));

import RootLayout from '../layout';

async function renderLayout(pathname: string) {
  mockPathname.value = pathname;
  return renderToStaticMarkup(await RootLayout({ children: React.createElement('main') }));
}

describe('RootLayout document language', () => {
  it.each(['/bn', '/bn/', '/bn/category/dairy-and-eggs', '/bn/product/example--12345678'])(
    'server-renders Bengali for %s',
    async (pathname) => {
      expect(await renderLayout(pathname)).toContain('<html lang="bn"');
    }
  );

  it.each(['/', '/category/dairy-and-eggs', '/product/example--12345678', '/bnews'])(
    'server-renders English for %s',
    async (pathname) => {
      expect(await renderLayout(pathname)).toContain('<html lang="en"');
    }
  );
});
