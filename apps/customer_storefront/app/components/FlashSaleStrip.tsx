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
    <section className="w-full rounded-[20px] bg-gradient-to-r from-[#f0c444] to-[#e8b840] px-4 sm:px-5 py-3 flex items-center justify-between gap-3 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Lightning weight="fill" size={20} className="text-[#0B0B0D] shrink-0" />
        <span className="font-black text-sm text-[#0B0B0D] whitespace-nowrap">Flash Sale</span>
        <div className="flex items-center gap-0.5 font-mono font-bold text-sm text-[#0B0B0D] tabular-nums">
          <span>{pad(hours)}</span>
          <span className="animate-pulse">:</span>
          <span>{pad(minutes)}</span>
          <span className="animate-pulse">:</span>
          <span>{pad(seconds)}</span>
        </div>
      </div>
      <Link
        href="/category?theme=deals"
        className="text-xs font-bold text-[#0B0B0D] underline underline-offset-2 hover:no-underline whitespace-nowrap shrink-0"
      >
        Shop Deals →
      </Link>
    </section>
  );
}
