'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { X, Sparkle, Tag, ArrowRight } from '@phosphor-icons/react';
import { CATEGORY_GROUPS } from '../lib/types';

interface CategorySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategorySheet({ isOpen, onClose }: CategorySheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 md:hidden">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Sheet Container */}
      <div
        ref={sheetRef}
        className="relative z-10 w-full max-h-[85vh] overflow-y-auto custom-scrollbar rounded-t-[32px] bg-warm-bg border-t border-warm-border p-5 shadow-2xl animate-in slide-in-from-bottom duration-250"
      >
        {/* Drag handle / Header bar */}
        <div className="flex items-center justify-between pb-4 border-b border-warm-border/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-warm-accent/20 text-warm-accent flex items-center justify-center font-bold text-sm">
              🏷️
            </div>
            <h2 className="text-base font-black text-warm-fg">Browse Categories</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-warm-surface border border-warm-border text-warm-fg hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            aria-label="Close categories sheet"
          >
            <X weight="bold" size={16} />
          </button>
        </div>

        {/* Quick Filter Badges */}
        <div className="py-4 space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-warm-muted">Featured Collections</span>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <Link
              href="/category"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-2xl bg-warm-fg text-warm-accent text-xs font-black shadow-warm-sm shrink-0"
            >
              <span>📦</span>
              <span>All Products</span>
            </Link>
            <Link
              href="/category?theme=deals"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-2xl bg-warm-surface border border-warm-border text-warm-fg text-xs font-extrabold hover:bg-warm-bg shrink-0"
            >
              <span>🔥</span>
              <span>Hot Deals</span>
            </Link>
            <Link
              href="/category?theme=bestsellers"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-2xl bg-warm-surface border border-warm-border text-warm-fg text-xs font-extrabold hover:bg-warm-bg shrink-0"
            >
              <span>⭐</span>
              <span>Best Sellers</span>
            </Link>
          </div>
        </div>

        {/* Category Grid */}
        <div className="space-y-2 pb-6">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-warm-muted">Shop by Category</span>
          <div className="grid grid-cols-2 gap-3 pt-1">
            {CATEGORY_GROUPS.map((g) => (
              <Link
                key={g.slug}
                href={`/category/${g.slug}`}
                onClick={onClose}
                className="group flex flex-col justify-between p-3.5 rounded-2xl bg-warm-surface border border-warm-border/60 hover:border-warm-accent transition-all active:scale-95 shadow-warm-sm min-h-[88px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{g.emoji}</span>
                  <ArrowRight weight="bold" size={14} className="text-warm-muted group-hover:text-warm-accent group-hover:translate-x-0.5 transition-all" />
                </div>
                <span className="text-xs font-extrabold text-warm-fg mt-2 line-clamp-1">{g.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
