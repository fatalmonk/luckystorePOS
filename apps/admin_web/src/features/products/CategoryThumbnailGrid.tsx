import React, { useMemo } from 'react';
import { clsx } from "clsx";

export interface Category {
  id: string;
  name: string;
  itemCount?: number;
  imageUrl?: string;
  color?: string;
  icon?: string;
}

interface CategoryThumbnailGridProps {
  categories: Category[];
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}

/** Deterministic icon mapping from category name to a display label */
function getCategoryDisplay(name: string): { icon: string; color: string } {
  const hash = name.toLowerCase().trim();
  const palette = [
    '#4F46E5', '#0D9488', '#E8B84B', '#EF4444',
    '#3B82F6', '#8B5CF6', '#F97316', '#10B981',
    '#EC4899', '#6366F1', '#14B8A6', '#F59E0B',
  ];
  let h = 0;
  for (let i = 0; i < hash.length; i++) h = ((h << 5) - h) + hash.charCodeAt(i);
  const color = palette[Math.abs(h) % palette.length];

  const iconMap: Record<string, string> = {
    fruit: '🍎', apple: '🍎', veg: '🥦', vegetable: '🥦',
    bakery: '🥐', bread: '🥐', cake: '🎂',
    dairy: '🥛', milk: '🥛', cheese: '🧀', egg: '🥚',
    drink: '🥤', beverage: '🥤', juice: '🧃', water: '💧',
    clean: '🧹', cleaning: '🧼', household: '🏠',
    pharma: '💊', medicine: '💊', health: '❤️',
    pet: '🐶', animal: '🐱',
    toy: '🧸', game: '🎮', baby: '👶',
    snack: '🍿', chip: '🍪', biscuit: '🍪',
    rice: '🍚', grain: '🌾', flour: '🌾',
    oil: '🛢️', spice: '🌶️', masala: '🌶️',
    meat: '🍗', chicken: '🐔', fish: '🐟', beef: '🥩',
    frozen: '🧊', ice: '🍦',
    default: '📦',
  };

  let icon = iconMap.default;
  for (const key of Object.keys(iconMap)) {
    if (hash.includes(key)) { icon = iconMap[key]; break; }
  }
  return { icon, color };
}

export const CategoryThumbnailGrid = React.memo(function CategoryThumbnailGrid({
  categories,
  selectedId,
  onSelect,
  className,
}: CategoryThumbnailGridProps) {
  const enriched = useMemo(() => {
    return categories.map((c) => {
      const display = getCategoryDisplay(c.name);
      return {
        ...c,
        color: c.color || display.color,
        icon: c.icon || display.icon,
      };
    });
  }, [categories]);

  return (
    <div className={clsx('w-full', className)}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* All button */}
        <button
          onClick={() => onSelect(null)}
          className={clsx(
            'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors whitespace-nowrap',
            selectedId === null || selectedId === undefined
              ? 'border-primary bg-primary text-primary-on'
              : 'border-border-default bg-surface hover:bg-background-subtle text-text-secondary'
          )}
        >
          <span>📦</span>
          <span>All Items</span>
        </button>

        {enriched.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={clsx(
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors whitespace-nowrap',
              selectedId === cat.id
                ? 'border-primary bg-primary text-primary-on'
                : 'border-border-default bg-surface hover:bg-background-subtle text-text-secondary'
            )}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
            {typeof cat.itemCount === 'number' && (
              <span className={clsx(
                'ml-1 text-[10px] px-1.5 py-0.5 rounded-full',
                selectedId === cat.id ? 'bg-black/20 text-white' : 'bg-background text-text-muted'
              )}>
                {cat.itemCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
});
