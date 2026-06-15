'use client'; // dropdown open/close state with click-outside detection

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';


interface CategoryDropdownProps {
  categories: { id: string; slug: string; name: string; emoji: string }[];
}

export function CategoryDropdown({ categories }: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 press-feedback min-h-[44px] ${
          open ? 'bg-[#1c1917] text-[#ffe721] font-bold shadow-sm' : 'bg-[#f5f5f4] text-[#44403c] hover:bg-[#e7e5e4]'
        }`}
        aria-expanded={open}
      >
        <span aria-hidden="true" className="text-base leading-none">📂</span>
        <span>Departments</span>
        <span className="text-xs" aria-hidden="true">▼</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#e7e5e4] py-2 z-50 animate-fade-up">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              onClick={() => setOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm text-[#44403c] hover:bg-[#f5f5f4] transition-colors"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{cat.emoji}</span>
                <span>{cat.name}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
