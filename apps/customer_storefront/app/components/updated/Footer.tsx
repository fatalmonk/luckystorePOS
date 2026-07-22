'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-[#0B0B0D] text-white pt-12 pb-6 px-4 sm:px-6 lg:px-8 overflow-hidden font-body">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Top Section: Email Headline + Get Started Saffron Card */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8 pb-8 border-b border-white/10">
          {/* Left Email & Intro */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-warm-muted tracking-wide">
              <span className="w-3 h-1 bg-warm-accent rounded-full inline-block" aria-hidden="true" />
              <span>Uncover authentic groceries at Lucky Store</span>
            </div>
            <a
              href="mailto:hello@luckystore1947.com"
              className="block text-2xl sm:text-4xl md:text-5xl font-black font-display tracking-tight text-white hover:text-warm-accent transition-colors duration-300 underline underline-offset-8 decoration-white/20 hover:decoration-warm-accent break-all"
            >
              hello@luckystore1947.com
            </a>
          </div>

          {/* Right Saffron CTA Card */}
          <div className="w-full lg:w-72 bg-warm-accent rounded-[24px] p-6 text-[#0B0B0D] shadow-warm-md flex flex-col justify-between min-h-[160px] shrink-0">
            <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-[#0B0B0D]">
              Start Shopping
            </h3>
            <Link
              href="/category"
              className="w-full bg-[#0B0B0D] text-white hover:bg-[#1f1f24] active:scale-[0.98] px-5 py-3 rounded-full font-bold text-xs transition-all duration-200 flex items-center justify-between group shadow-sm mt-4"
            >
              <span>Browse Catalog</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </Link>
          </div>
        </div>

        {/* Middle Section: Big Link Items + Hub Office Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* Left Big Links */}
          <div className="space-y-3">
            <Link
              href="/category?theme=deals"
              className="block text-2xl sm:text-3xl font-extrabold font-display text-white hover:text-warm-accent transition-colors"
            >
              Hot Deals
            </Link>
            <Link
              href="/category"
              className="block text-2xl sm:text-3xl font-extrabold font-display text-white hover:text-warm-accent transition-colors"
            >
              Categories
            </Link>
            <Link
              href="/privacy"
              className="block text-2xl sm:text-3xl font-extrabold font-display text-white hover:text-warm-accent transition-colors"
            >
              Privacy &amp; Terms
            </Link>
          </div>

          {/* Right Store Address */}
          <div className="space-y-3 md:text-right flex flex-col md:items-end justify-center">
            <h4 className="text-xl font-bold font-display text-white">Chittagong Hub</h4>
            <address className="not-italic text-xs text-warm-muted leading-relaxed space-y-0.5">
              <p>665 Percival Hill Road</p>
              <p>Emdad Park, Chittagong 4203</p>
              <p>Bangladesh</p>
              <p className="pt-2 font-mono text-warm-accent font-semibold">+880 1731-944544</p>
            </address>
          </div>
        </div>

        {/* Giant Display Brand Wordmark */}
        <div className="py-2 text-center overflow-hidden select-none">
          <h2 className="text-[3.5rem] sm:text-[6.5rem] md:text-[9rem] lg:text-[11rem] font-black font-display tracking-tighter leading-none text-white opacity-95 hover:opacity-100 transition-opacity">
            LuckyStore
          </h2>
        </div>

        {/* Bottom Saffron Accent Bar */}
        <div className="bg-warm-accent text-[#0B0B0D] rounded-[16px] sm:rounded-[20px] px-5 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-extrabold shadow-warm-sm">
          <span>Copyright © Lucky Store 1947</span>
          <div className="flex items-center gap-1.5 text-[#0B0B0D]/80">
            <span aria-hidden="true">🌐</span>
            <span>Chittagong, BD</span>
          </div>
          <div className="flex items-center gap-4 text-[#0B0B0D]/90">
            <a
              href="https://wa.me/8801731944544"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              WhatsApp
            </a>
            <span>•</span>
            <a
              href="https://facebook.com/luckystore1947"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Facebook
            </a>
            <span>•</span>
            <a
              href="https://instagram.com/luckystore1947"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
