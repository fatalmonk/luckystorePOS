import React, { ReactNode } from 'react';
import clsx from 'clsx';

export interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ children, className, padding = 'md' }) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];
  return (
    <div
      className={clsx(
        'bg-card rounded-xl shadow-card border border-border-light',
        paddingClasses,
        className
      )}
    >
      {children}
    </div>
  );
};
