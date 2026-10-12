import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      type,
      label,
      error,
      id,
      disabled,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || (label ? `input-${generatedId}` : undefined);
    const errorId = error ? `error-${inputId || generatedId}` : undefined;

    const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined;

    // Route grid layout classes to wrapper div when specified in className
    const layoutMatch = className?.match(/(col-span-\S+|row-span-\S+)/g);
    const layoutClasses = layoutMatch ? layoutMatch.join(' ') : undefined;
    const inputClasses = layoutMatch
      ? className?.replace(/(col-span-\S+|row-span-\S+)/g, '').trim()
      : className;

    return (
      <div className={cn('flex flex-col gap-1.5 w-full', layoutClasses, wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium leading-none text-foreground',
              disabled && 'cursor-not-allowed opacity-70'
            )}
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error && 'border-destructive focus-visible:ring-destructive',
            inputClasses
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-destructive font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
