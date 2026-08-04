'use client';

import React from 'react';
import type { Category } from '../lib/types';

const baseClasses = 'w-12 h-12 text-warm-muted';

export function CategoryPlaceholder({ category }: { category: Category }) {
  switch (category) {
    case 'Beverages':
    case 'Tea & Coffee':
      return (
        <svg
          className={baseClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
      );
    case 'Snacks':
    case 'Biscuits & Cookies':
    case 'Chocolates & Candies':
    case 'Ice Cream':
      return (
        <svg
          className={baseClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 10h.01M16 10h.01M12 14h.01M9 16h.01M15 16h.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'Dairy':
    case 'Dairy & Eggs':
      return (
        <svg
          className={baseClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <rect x="6" y="7" width="12" height="15" rx="2" fill="currentColor" opacity="0.1" />
          <path d="M6 7L12 3L18 7" fill="currentColor" opacity="0.2" />
          <circle cx="12" cy="14" r="3" fill="var(--warm-saffron)" opacity="0.3" />
          <path d="M9 13.5C9.5 13 11 13 12 14.5C13 16 14.5 14 15 13.5" stroke="var(--warm-saffron)" strokeWidth="1.5" />
        </svg>
      );
    case 'Personal Care':
    case 'Cleaning Supply':
    case 'Air Freshner':
    case 'Baby Care':
    case 'Pest Control':
      return (
        <svg
          className={baseClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 22h6M9 6h6M12 2v4M7 10h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" />
        </svg>
      );
    case 'Oil':
    case 'Rice & Grain':
    case 'Condiments':
    case 'Spices':
    case 'Cereals':
    case 'Baking Needs':
    case 'Cooking Needs':
    case 'Packaged Food':
      return (
        <svg
          className={baseClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5Z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case 'Electronics':
      return (
        <svg
          className={baseClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    default:
      return (
        <svg
          className={baseClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
  }
}
