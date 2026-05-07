import React, { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className={clsx('flex flex-col', className)}>
        {label && (
          <label className="mb-1 text-sm font-medium text-text-primary">{label}</label>
        )}
        <input
          ref={ref}
          className={clsx(
            'rounded-sm border border-border-default bg-surface px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-primary shadow-level-1',
            { 'border-danger focus:ring-danger focus:border-danger': error }
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
