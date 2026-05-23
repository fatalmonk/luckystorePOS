import React, { ReactNode, useState, useEffect } from 'react';
import clsx from 'clsx';

export interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  id?: string; // for animation highlighting (stock update)
  highlight?: boolean; // trigger highlight animation
  highlightColor?: 'emerald' | 'amber' | 'blue';
}

export const Card: React.FC<CardProps> = 
  ({ 
    children, 
    className, 
    padding = 'md', 
    hoverable = true,
    highlight = false,
    highlightColor = 'emerald'
}) => {
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    if (highlight) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [highlight]);

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  }[padding];

  const highlightClasses = {
    emerald: 'bg-emerald-50 ring-2 ring-emerald-300',
    amber: 'bg-amber-50 ring-2 ring-amber-300',
    blue: 'bg-primary-subtle ring-2 ring-primary-subtle',
  };

  return (
    <div
      className={clsx(
        'bg-warm-surface rounded-xl shadow-level-1 border border-warm-border-warm',
        'transition-all duration-200 ease-out',
        hoverable && !isHighlighted && [
          'hover:-translate-y-0.5',
          'hover:shadow-level-2',
          'hover:border-warm-ring'
        ],
        isHighlighted && highlightClasses[highlightColor],
        paddingClasses,
        className
      )}
    >
      {children}
    </div>
  );
};
