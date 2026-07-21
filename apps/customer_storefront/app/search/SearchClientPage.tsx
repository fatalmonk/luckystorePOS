'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../components/updated/Header';
import { BottomNav } from '../components/BottomNav';
import { MagnifyingGlass, Clock, Fire, X } from '@phosphor-icons/react';

const POPULAR_SEARCHES = ['Eggs', 'Noodles', 'Milk', 'Rice', 'Cooking Oil', 'Bread', 'Ice Cream', 'Snacks', 'Tea & Coffee'];

export function SearchClientPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('lucky_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  const handleSearch = (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    if (!recentSearches.includes(trimmed)) {
      const updated = [trimmed, ...recentSearches.slice(0, 4)];
      setRecentSearches(updated);
      localStorage.setItem('lucky_recent_searches', JSON.stringify(updated));
    }
    router.push(`/category?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <div className="min-h-screen bg-warm-bg flex flex-col">
      <Header />
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-6 pb-20">
        <form onSubmit={handleSubmit} className="relative w-full">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groceries, brands, essentials..."
            className="w-full h-12 pl-4 pr-24 rounded-full bg-warm-surface border border-warm-border focus:border-warm-accent shadow-warm-sm outline-none text-base font-medium transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-12 top-3.5 text-warm-muted hover:text-warm-fg"
              aria-label="Clear input"
            >
              <X weight="bold" size={18} />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 h-9 px-4 bg-warm-accent text-warm-fg font-bold text-sm rounded-full flex items-center gap-1 hover:bg-warm-accent-hover active:scale-95 transition-all shadow-warm-sm"
          >
            <MagnifyingGlass weight="bold" size={16} />
            <span>Search</span>
          </button>
        </form>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-warm-muted uppercase tracking-wider">
              <span>Recent Searches</span>
              <button
                onClick={() => {
                  setRecentSearches([]);
                  localStorage.removeItem('lucky_recent_searches');
                }}
                className="text-[10px] text-warm-muted hover:text-red-500 font-semibold"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(term)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm-surface border border-warm-border text-xs font-semibold text-warm-fg hover:bg-warm-accent hover:border-warm-accent transition-all"
                >
                  <Clock weight="bold" size={12} className="text-warm-muted" />
                  {term}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Popular Searches */}
        <section className="space-y-3">
          <div className="text-xs font-bold text-warm-muted uppercase tracking-wider flex items-center gap-1">
            <Fire weight="fill" size={14} className="text-warm-accent" />
            <span>Popular Searches</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term, i) => (
              <button
                key={i}
                onClick={() => handleSearch(term)}
                className="px-3.5 py-1.5 rounded-full bg-warm-surface border border-warm-border/60 text-xs font-bold text-warm-fg hover:bg-warm-accent hover:border-warm-accent active:scale-95 transition-all shadow-warm-sm"
              >
                {term}
              </button>
            ))}
          </div>
        </section>

        {/* Quick Category Shortcuts */}
        <section className="space-y-3 pt-2">
          <div className="text-xs font-bold text-warm-muted uppercase tracking-wider">
            <span>Browse Categories</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <Link
              href="/category/cooking-essentials"
              className="p-3 rounded-2xl bg-warm-surface border border-warm-border/60 hover:border-warm-accent transition-all flex items-center gap-2"
            >
              <span className="text-2xl">🌾</span>
              <span className="text-xs font-bold text-warm-fg">Cooking Essentials</span>
            </Link>
            <Link
              href="/category/snacks"
              className="p-3 rounded-2xl bg-warm-surface border border-warm-border/60 hover:border-warm-accent transition-all flex items-center gap-2"
            >
              <span className="text-2xl">🍪</span>
              <span className="text-xs font-bold text-warm-fg">Snacks & Biscuits</span>
            </Link>
            <Link
              href="/category/dairy-&-eggs"
              className="p-3 rounded-2xl bg-warm-surface border border-warm-border/60 hover:border-warm-accent transition-all flex items-center gap-2"
            >
              <span className="text-2xl">🥛</span>
              <span className="text-xs font-bold text-warm-fg">Dairy & Eggs</span>
            </Link>
            <Link
              href="/category/ice-cream"
              className="p-3 rounded-2xl bg-warm-surface border border-warm-border/60 hover:border-warm-accent transition-all flex items-center gap-2"
            >
              <span className="text-2xl">🍦</span>
              <span className="text-xs font-bold text-warm-fg">Ice Cream</span>
            </Link>
            <Link
              href="/category/beverages"
              className="p-3 rounded-2xl bg-warm-surface border border-warm-border/60 hover:border-warm-accent transition-all flex items-center gap-2"
            >
              <span className="text-2xl">🧃</span>
              <span className="text-xs font-bold text-warm-fg">Beverages</span>
            </Link>
            <Link
              href="/category/personal-care"
              className="p-3 rounded-2xl bg-warm-surface border border-warm-border/60 hover:border-warm-accent transition-all flex items-center gap-2"
            >
              <span className="text-2xl">🧼</span>
              <span className="text-xs font-bold text-warm-fg">Personal Care</span>
            </Link>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
