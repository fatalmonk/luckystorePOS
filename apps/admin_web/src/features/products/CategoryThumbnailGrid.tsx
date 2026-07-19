import React, { useMemo } from 'react';
import { clsx } from "clsx";

export interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
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
  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedId);
  }, [categories, selectedId]);

  const activeParentId = useMemo(() => {
    if (!selectedCategory) return null;
    return selectedCategory.parent_id || selectedCategory.id;
  }, [selectedCategory]);

  const roots = useMemo(() => {
    const rootCats = categories.filter((c) => !c.parent_id);
    return rootCats.map((r) => {
      const display = getCategoryDisplay(r.name);
      // Accumulate counts from children
      const children = categories.filter((c) => c.parent_id === r.id);
      const totalCount =
        (r.itemCount || 0) + children.reduce((sum, c) => sum + (c.itemCount || 0), 0);

      return {
        ...r,
        itemCount: totalCount,
        color: r.color || display.color,
        icon: r.icon || display.icon,
      };
    });
  }, [categories]);

  const activeChildren = useMemo(() => {
    if (!activeParentId) return [];
    return categories
      .filter((c) => c.parent_id === activeParentId)
      .map((c) => {
        const display = getCategoryDisplay(c.name);
        return {
          ...c,
          color: c.color || display.color,
          icon: c.icon || display.icon,
        };
      });
  }, [categories, activeParentId]);

  return (
    <div className={clsx('w-full flex flex-col gap-2 relative', className)}>
      {/* Primary Categories Row */}
      <div className="w-full relative">
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-warm-bg/80 to-transparent z-10 pointer-events-none rounded-r-md" />
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-0.5 scrollbar-hide [--mask:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] [mask-image:var(--mask)] [-webkit-mask-image:var(--mask)]">
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

          {roots.map((cat) => {
            const isSelected = selectedId === cat.id || activeParentId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={clsx(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors whitespace-nowrap',
                  isSelected
                    ? 'border-primary bg-primary text-primary-on'
                    : 'border-border-default bg-surface hover:bg-background-subtle text-text-secondary'
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                {typeof cat.itemCount === 'number' && (
                  <span className={clsx(
                    'ml-1 text-[10px] px-1.5 py-0.5 rounded-full',
                    isSelected ? 'bg-black/20 text-white' : 'bg-background text-text-muted'
                  )}>
                    {cat.itemCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable Sub-Categories Row */}
      {activeChildren.length > 0 && (
        <div className="w-full relative pl-4 border-l-2 border-warm-accent/40">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-0.5 scrollbar-hide">
            <button
              onClick={() => onSelect(activeParentId)}
              className={clsx(
                'flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors whitespace-nowrap',
                selectedId === activeParentId
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-default bg-surface hover:bg-background-subtle text-text-secondary'
              )}
            >
              <span>📂</span>
              <span>All {roots.find(r => r.id === activeParentId)?.name}</span>
            </button>

            {activeChildren.map((child) => {
              const isSelected = selectedId === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => onSelect(child.id)}
                  className={clsx(
                    'flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors whitespace-nowrap',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border-default bg-surface hover:bg-background-subtle text-text-secondary'
                  )}
                >
                  <span>{child.icon}</span>
                  <span>{child.name}</span>
                  {typeof child.itemCount === 'number' && (
                    <span className={clsx(
                      'ml-1 text-[9px] px-1 py-0.2 rounded-full',
                      isSelected ? 'bg-primary/20 text-primary' : 'bg-background text-text-muted'
                    )}>
                      {child.itemCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
