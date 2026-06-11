import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from './components/Toast';
import { CartProvider } from './components/CartProvider';

export const metadata: Metadata = {
  title: 'Lucky Store',
  description: 'Your neighborhood grocery store. Fresh products, same-day delivery.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased" suppressHydrationWarning>
        <ToastProvider>
          <CartProvider>
            <div className="app-container">
              {children}
            </div>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
