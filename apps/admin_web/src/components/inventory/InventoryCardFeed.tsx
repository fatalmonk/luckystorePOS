import type { InventoryItem } from '../../types/inventory';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { InventoryProductCard } from './InventoryProductCard';

interface InventoryCardFeedProps {
  items: InventoryItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onUpdateStock: (item: InventoryItem) => void;
  onViewHistory?: (item: InventoryItem) => void;
  onEditProduct?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
  scrollElement?: HTMLDivElement | null;
  toolbarHeight?: number;
}

export function InventoryCardFeed({
  items,
  selectedIds,
  onToggleSelect,
  onUpdateStock,
  onViewHistory,
  onEditProduct,
  onDelete,
  scrollElement,
  toolbarHeight,
}: InventoryCardFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Dynamic column layout sizing based on container width
  const [cols, setCols] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const calcCols = (width: number) => {
      if (width >= 1480) return 4;
      if (width >= 1060) return 3;
      if (width >= 640) return 2;
      return 1;
    };

    const update = () => {
      const w = el.clientWidth || window.innerWidth;
      setCols(calcCols(w));
    };

    update();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCols(calcCols(entry.contentRect.width));
      }
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const getParent = useCallback(
    () => scrollElement || (document.querySelector('.main-content') as HTMLDivElement) || null,
    [scrollElement]
  );

  useEffect(() => {
    const el = containerRef.current;
    const parent = getParent();
    if (!el || !parent) return;

    const measure = () => {
      const elRect = el.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      setScrollMargin(elRect.top - parentRect.top + parent.scrollTop);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(parent);
    resizeObserver.observe(el);

    parent.addEventListener('scroll', measure, { passive: true });

    return () => {
      resizeObserver.disconnect();
      parent.removeEventListener('scroll', measure);
    };
  }, [scrollElement, items]);

  // Adjust virtualized row count for multi-column grids
  const virtualCount = Math.ceil(items.length / cols);

  const rowVirtualizer = useVirtualizer({
    count: virtualCount,
    getScrollElement: getParent,
    estimateSize: () => 195,
    overscan: 3,
    scrollMargin,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? Math.max(0, virtualRows[0].start - scrollMargin) : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const getGridColsClass = () => {
    if (cols === 4) return 'grid-cols-4';
    if (cols === 3) return 'grid-cols-3';
    if (cols === 2) return 'grid-cols-2';
    return 'grid-cols-1';
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full relative"
      style={{ minHeight: totalSize }}
    >
      <div 
        style={{
          transform: `translateY(${paddingTop}px)`,
          paddingBottom: paddingBottom + 16,
        }}
        className={`grid gap-3 px-3 w-full ${getGridColsClass()}`}
      >
        {virtualRows.map((virtualRow) => {
          // Render item cells dynamically based on active columns count per row
          const cellIndices = Array.from({ length: cols }, (_, i) => virtualRow.index * cols + i);
          
          return (
            <React.Fragment key={virtualRow.key}>
              {cellIndices.map((itemIdx, colIdx) => {
                const item = items[itemIdx];
                if (!item) return null;
                
                return (
                  <div 
                    key={item.id}
                    ref={colIdx === 0 ? rowVirtualizer.measureElement : undefined} 
                    data-index={virtualRow.index}
                  >
                    <InventoryProductCard
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onToggleSelect={onToggleSelect}
                      onClick={onUpdateStock}
                      onUpdateStock={onUpdateStock}
                      onViewHistory={onViewHistory}
                      onEditProduct={onEditProduct}
                      onDelete={onDelete}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
