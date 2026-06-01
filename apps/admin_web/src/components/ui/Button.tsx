import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from "clsx";

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

const variantClasses = {
  primary: 'bg-warm-accent text-white hover:bg-warm-accent-light border border-transparent rounded-md focus:ring-warm-accent/30',
  secondary: 'bg-warm-surface text-warm-fg border border-warm-border-warm hover:bg-warm-bg/50 rounded-md focus:ring-warm-accent/20',
  tertiary: 'bg-warm-sand text-warm-fg hover:bg-warm-border-warm border border-transparent rounded-md focus:ring-warm-accent/20',
  danger: 'bg-warm-danger text-white hover:bg-red-700 border border-transparent rounded-md focus:ring-red-500/30',
  outline: 'bg-transparent text-warm-accent border border-warm-accent hover:bg-warm-accent/5 rounded-md focus:ring-warm-accent/30',
  ghost: 'bg-transparent text-warm-fg hover:bg-warm-bg/50 border border-transparent rounded-md focus:ring-warm-accent/20',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    loading,
    className,
    disabled,
    ...props
  }, ref) => {
    return (
      <button
          ref={ref}
          className={clsx(
            'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2',
            variantClasses[variant],
            sizeClasses[size],
            // Press animation: scale down on active
            'active:scale-[0.98] active:transition-transform duration-100',
            {
              'opacity-50 cursor-not-allowed': disabled || loading,
              'pointer-events-none': loading,
            },
            className
          )}
          disabled={disabled || loading}
          {...props}
        >
        {loading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </span>
        ) : (
          <>
            {icon && <span className="mr-2">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
