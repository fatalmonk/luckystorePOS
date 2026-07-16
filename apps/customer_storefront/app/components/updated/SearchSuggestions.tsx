'use client';

import { useEffect, useRef } from 'react';
import { Fire } from '@phosphor-icons/react';

interface SearchSuggestionsProps {
  query: string;
  recentSearches: string[];
  popularSearches: string[];
  onSelect: (term: string) => void;
  onClose: () => void;
}

export function SearchSuggestions({
  query,
  recentSearches,
  popularSearches,
  onSelect,
  onClose
}: SearchSuggestionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on query
  const filteredRecent = query 
    ? recentSearches.filter(term => 
        term.toLowerCase().includes(query.toLowerCase())
      )
    : recentSearches;
    
  const filteredPopular = query 
    ? popularSearches.filter(term => 
        term.toLowerCase().includes(query.toLowerCase())
      )
    : popularSearches;

  // Close when pressing Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div 
      ref={containerRef}
      className="absolute top-full left-0 right-0 mt-1 bg-white border border-warm-border rounded-xl shadow-lg z-50 overflow-hidden"
    >
      {query && (
        <div className="p-3 border-b border-warm-border-light">
          <div className="text-xs font-semibold text-warm-muted mb-2">Search for &ldquo;{query}&rdquo;</div>
          <button
            onClick={() => onSelect(query)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-warm-border-light text-sm font-medium"
          >
            Search for &ldquo;{query}&rdquo;
          </button>
        </div>
      )}
      
      {filteredRecent.length > 0 && (
        <div className="p-3 border-b border-warm-border-light">
          <div className="text-xs font-semibold text-warm-muted mb-2">Recent Searches</div>
          <div className="space-y-1">
            {filteredRecent.map((term, index) => (
              <button
                key={index}
                onClick={() => onSelect(term)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-warm-border-light text-sm flex items-center gap-2"
              >
                <span aria-hidden="true">🕒</span>
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="p-3">
        <div className="text-xs font-semibold text-warm-muted mb-2">
          {query ? 'Popular Matching' : 'Popular Searches'}
        </div>
        <div className="space-y-1">
          {filteredPopular.map((term, index) => (
            <button
              key={index}
              onClick={() => onSelect(term)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-warm-border-light text-sm flex items-center gap-2"
            >
              <Fire weight="fill" size={14} aria-hidden="true" />
              {term}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
