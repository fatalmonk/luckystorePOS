import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || (label ? `input-${generatedId}` : undefined);

    const inputElement = (
      <input
        type={type}
        id={inputId}
        aria-invalid={!!error}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        ref={ref}
        {...props}
      />
    );

    if (label || error) {
      return (
        <div className="flex flex-col gap-1.5 w-full">
          {label && (
            <label
              htmlFor={inputId}
              className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
          {inputElement}
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        </div>
      );
    }

    return inputElement;
  }
);
Input.displayName = 'Input';

export { Input };
