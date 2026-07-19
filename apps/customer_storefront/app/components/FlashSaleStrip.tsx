'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lightning } from '@phosphor-icons/react';

interface FlashSaleStripProps {
  endTime?: Date | string | number;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function FlashSaleStrip({ endTime }: FlashSaleStripProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!endTime) return null;

  const target = new Date(endTime);
  const current = now ?? new Date();
  const diff = target.getTime() - current.getTime();

  // Hide if expired. Server render also hides until hydrated to avoid mismatch.
  if (diff <= 0 || now === null) return null;

  const hours = Math.floor(diff / 36e5);
  const minutes = Math.floor((diff % 36e5) / 6e4);
  const seconds = Math.floor((diff % 6e4) / 1000);

  return (
    <section className="w-full rounded-[20px] bg-gradient-to-r from-[#f0c444] via-[#e8b840] to-[#f0c444] px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 shadow-warm-sm border border-warm-accent/30 relative overflow-hidden">
      {/* Decorative radial glow */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-warm-surface/15 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -bottom-4 left-1/3 w-16 h-16 bg-warm-fg/5 rounded-full blur-lg pointer-events-none" />

      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 relative z-10">
        <div className="w-9 h-9 rounded-full bg-warm-fg flex items-center justify-center shrink-0">
          <Lightning weight="fill" size={16} className="text-warm-accent" />
        </div>
        <div>
          <span className="font-black text-sm text-warm-fg whitespace-nowrap block leading-none">Flash Sale</span>
          <span className="text-[10px] font-semibold text-warm-fg/60">Ends in</span>
        </div>
        <div className="flex items-center gap-1 font-mono font-bold text-sm text-warm-fg tabular-nums bg-warm-fg/10 rounded-lg px-2.5 py-1">
          <span>{pad(hours)}</span>
          <span className="text-warm-fg/40">:</span>
          <span>{pad(minutes)}</span>
          <span className="text-warm-fg/40">:</span>
          <span>{pad(seconds)}</span>
        </div>
      </div>
      <Link
        href="/category?theme=deals"
        className="text-xs font-bold text-warm-fg bg-warm-fg/10 hover:bg-warm-fg/20 rounded-full px-3.5 py-2 transition-colors whitespace-nowrap shrink-0 relative z-10"
      >
        Shop Deals →
      </Link>
    </section>
  );
}
