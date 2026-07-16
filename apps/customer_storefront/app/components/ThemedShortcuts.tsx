'use client';

import Link from 'next/link';
import { Sun, CalendarCheck, Fire, Sparkle, Shield, Gift } from '@phosphor-icons/react';

// TODO: Migrate to a `campaigns` table in Supabase when CMS control is needed.
const SHORTCUTS = [
  { label: 'Summer Fruits', theme: 'summer', icon: Sun, isNew: true },
  { label: 'Weekend Deals', theme: 'weekend', icon: CalendarCheck, isNew: false },
  { label: 'Hot Deals', theme: 'deals', icon: Fire, isNew: false },
  { label: 'New Arrivals', theme: 'new', icon: Sparkle, isNew: true },
  { label: 'Health Essentials', theme: 'health', icon: Shield, isNew: false },
  { label: 'Buy 1 Get 1', theme: 'bogo', icon: Gift, isNew: false },
];

export function ThemedShortcuts() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Quick Picks</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-edge-mask py-1">
        {SHORTCUTS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.theme}
              href={`/category?theme=${item.theme}`}
              className="group flex-shrink-0 flex flex-col items-center justify-center w-[100px] h-[88px] rounded-[18px] border border-[#E8E4DC]/60 bg-white hover:bg-[#0B0B0D] hover:text-[#f0c444] hover:border-[#0B0B0D] transition-colors duration-200"
            >
              <div className="relative mb-1.5">
                <Icon weight="fill" size={24} className="text-[#0B0B0D] group-hover:text-[#f0c444] transition-colors duration-200" />
                {item.isNew && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#E34234] ring-2 ring-white" aria-hidden="true" />
                )}
              </div>
              <span className="text-[10px] leading-tight text-center px-1.5 font-medium text-[#44403c] group-hover:text-[#f0c444] transition-colors duration-200">
                {item.label}
              </span>
              {item.isNew && (
                <span className="sr-only">New</span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
