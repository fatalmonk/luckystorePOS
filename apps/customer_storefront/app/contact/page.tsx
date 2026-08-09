import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../components/updated/Header';
import { Footer } from '../components/updated/Footer';
import { BottomNav } from '../components/BottomNav';
import { WhatsAppFloat } from '../components/WhatsAppFloat';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Lucky Store in Chattogram. Contact customer support for grocery orders, delivery assistance, or product inquiries.',
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
          <header className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-warm-fg">
              Contact Lucky Store
            </h1>
            <p className="max-w-2xl text-sm sm:text-base font-semibold text-warm-muted">
              Reach our Chattogram support team for grocery orders, delivery help, and product questions.
            </p>
          </header>

          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-warm-muted">
            <Link href="/" className="hover:text-warm-fg transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-warm-fg font-bold">Contact Us</span>
          </nav>

          {/* Main Contact Form & Info Grid */}
          <ContactForm />
        </div>
        <Footer />
      </main>
      <BottomNav />
      <WhatsAppFloat />
    </>
  );
}
