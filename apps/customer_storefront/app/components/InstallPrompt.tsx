'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { type Locale } from '../lib/i18n/config';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt({ locale = 'en' }: { locale?: Locale }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    if (sessionStorage.getItem('pwa-storefront-install-dismissed') === 'true') {
      return;
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    setDismissed(false);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setPrompt(null);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-storefront-install-dismissed', 'true');
    setDismissed(true);
  };

  if (!prompt || dismissed) return null;

  const isBn = locale === 'bn';

  return (
    <div
      role="region"
      aria-label={isBn ? 'অ্যাপ ইনস্টল প্রম্পট' : 'App install prompt'}
      className="fixed bottom-[calc(var(--bottom-nav-height,60px)+16px)] md:bottom-6 right-4 md:right-6 z-40 max-w-[340px] flex items-center gap-3 p-4 bg-warm-surface text-warm-fg border border-warm-border rounded-2xl shadow-xl transition-all duration-200"
      style={{
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-accent, #f0c444)',
          color: '#0B0B0D',
        }}
      >
        <Download size={20} color="#0B0B0D" />
      </div>
      <div className="flex-1 min-w-0 pr-4">
        <div className="font-bold text-sm text-warm-fg leading-snug">
          {isBn ? 'লাকি স্টোর অ্যাপ ইনস্টল করুন' : 'Install Lucky Store App'}
        </div>
        <div className="text-xs text-warm-dim mt-0.5 leading-snug">
          {isBn ? 'সহজ ও দ্রুত বাজার করার জন্য ইনস্টল করুন' : 'Fast grocery shopping & instant checkout'}
        </div>
      </div>
      <button
        onClick={handleInstall}
        className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-transform active:scale-95"
        style={{
          backgroundColor: '#0B0B0D',
          color: '#f0c444',
          border: '1px solid #f0c444',
        }}
      >
        {isBn ? 'ইনস্টল' : 'Install'}
      </button>
      <button
        onClick={handleDismiss}
        aria-label={isBn ? 'বন্ধ করুন' : 'Dismiss install prompt'}
        className="absolute top-2 right-2 p-1 text-warm-dim hover:text-warm-fg cursor-pointer rounded-full"
      >
        <X size={14} />
      </button>
    </div>
  );
}
