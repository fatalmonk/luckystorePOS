import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';

interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
}

interface CategoryPickerProps {
  value: string | null | undefined;
  categories: Category[];
  onChange: (categoryId: string | null) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function CategoryPicker({
  value,
  categories,
  onChange,
  loading = false,
  disabled = false,
  className,
  size = 'sm',
}: CategoryPickerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const selectedCategory = categories.find((c) => c.id === value);

  // Group categories for hierarchical optgroup select
  const { rootOnlyLeaves, grouped } = useMemo(() => {
    const parentIds = new Set(categories.map((c) => c.parent_id).filter(Boolean));
    const roots = categories.filter((c) => !c.parent_id);
    
    const childrenMap: Record<string, Category[]> = {};
    categories.forEach((c) => {
      if (c.parent_id) {
        if (!childrenMap[c.parent_id]) {
          childrenMap[c.parent_id] = [];
        }
        childrenMap[c.parent_id].push(c);
      }
    });

    const rootsWithChildren = roots.filter((r) => parentIds.has(r.id));
    const rootOnlyLeaves = roots.filter((r) => !parentIds.has(r.id));

    const grouped = rootsWithChildren.map((r) => ({
      root: r,
      children: childrenMap[r.id] || [],
    }));

    return { rootOnlyLeaves, grouped };
  }, [categories]);

  const handleStartEdit = useCallback(() => {
    if (disabled || loading) return;
    setIsEditing(true);
  }, [disabled, loading]);

  const handleSave = useCallback(
    (categoryId: string) => {
      const nextId = categoryId === '' ? null : categoryId;
      if (nextId !== value) {
        // Enforce leaf-selection validation: do not allow selecting a category that has children
        const hasChildren = categories.some((c) => c.parent_id === nextId);
        if (nextId && hasChildren) {
          alert('Please select a sub-category.');
          return;
        }
        onChange(nextId);
      }
      setIsEditing(false);
    },
    [onChange, value, categories]
  );

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, handleCancel]);

  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <select
        ref={selectRef}
        value={value ?? ''}
        onChange={(e) => handleSave(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
          }
        }}
        disabled={disabled || loading}
        className={clsx(
          'w-full rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg',
          'focus:ring-2 focus:ring-warm-accent focus:border-transparent',
          size === 'sm' ? 'text-[11px] px-2 py-1' : 'text-sm px-3 py-2',
          className
        )}
      >
        <option value="">— No Category —</option>
        
        {/* Render roots that are leaves */}
        {rootOnlyLeaves.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}

        {/* Render root categories that have children as optgroups */}
        {grouped.map(({ root, children }) => (
          <optgroup key={root.id} label={root.name}>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartEdit}
      disabled={disabled || loading}
      title="Click to change category"
      className={clsx(
        'inline-flex items-center rounded-md border transition-colors',
        'hover:bg-warm-surface-hover focus:outline-none focus:ring-2 focus:ring-warm-accent',
        disabled && 'cursor-not-allowed opacity-50',
        selectedCategory
          ? 'bg-warm-accent/10 border-warm-accent/30 text-warm-fg'
          : 'bg-warm-surface border-warm-border-warm text-warm-dim',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-sm px-3 py-1',
        className
      )}
    >
      {loading ? (
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 border-2 border-warm-accent border-t-transparent rounded-full animate-spin" />
          Loading...
        </span>
      ) : (
        selectedCategory?.name ?? '—'
      )}
    </button>
  );
}
