'use client';

import React, { type SelectHTMLAttributes, forwardRef, useId } from 'react';
import { CaretDown } from '@phosphor-icons/react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, children, className = '', containerClassName = '', id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? `select-${generatedId}`;

    return (
      <div className={`relative ${containerClassName}`.trim()}>
        {label && (
          <label htmlFor={selectId} className="block text-[13px] font-bold mb-1.5 text-warm-fg">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full appearance-none pr-9 pl-3.5 h-11
              rounded-[14px] border border-warm-border
              bg-warm-surface text-warm-fg text-sm font-semibold
              outline-none cursor-pointer
              transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]
              focus-visible:border-warm-accent focus-visible:ring-2 focus-visible:ring-warm-accent/25
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `.trim()}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <CaretDown
            size={16}
            weight="bold"
            className="pointer-events-none absolute right-3 text-warm-muted"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
