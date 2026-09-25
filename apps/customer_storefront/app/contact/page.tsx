import type { Metadata } from 'next';
import { Header } from '../components/updated/Header';
import { Footer } from '../components/updated/Footer';
import { BottomNav } from '../components/BottomNav';
import { WhatsAppFloat } from '../components/WhatsAppFloat';
import { ContactForm } from './ContactForm';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Lucky Store in Chattogram. Contact customer support for grocery orders, delivery assistance, or product inquiries.',
  alternates: {
    canonical: 'https://www.luckystore1947.com/contact',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/contact',
      'bn-BD': 'https://www.luckystore1947.com/bn/contact',
      'x-default': 'https://www.luckystore1947.com/contact',
    },
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

          <Breadcrumbs items={[{ label: 'Contact Us', href: '/contact' }]} />

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
