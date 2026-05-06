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
          <label className="mb-1 text-sm font-medium text-text-main">{label}</label>
        )}
        <input
          ref={ref}
          className={clsx(
            'rounded-md border border-border-light bg-input px-3 py-2 text-base text-text-main focus:outline-none focus:ring-2 focus:ring-primary',
            { 'border-danger': error }
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
