import React, { ReactNode } from 'react';
import clsx from 'clsx';

export interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ children, className, padding = 'md' }) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  }[padding];
  return (
    <div
      className={clsx(
        'bg-surface rounded-md shadow-level-1 border border-border-default',
        paddingClasses,
        className
      )}
    >
      {children}
    </div>
  );
};
