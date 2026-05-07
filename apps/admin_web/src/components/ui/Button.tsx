import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

const variantClasses = {
  primary: 'bg-primary text-primary-on hover:bg-primary-hover border border-transparent rounded-md',
  secondary: 'bg-surface text-text-primary border border-border-default hover:bg-background-subtle rounded-sm',
  tertiary: 'bg-secondary text-secondary-on hover:bg-secondary-hover border border-transparent rounded-md',
  danger: 'bg-danger text-danger-on hover:bg-danger-dark border border-transparent rounded-md',
  outline: 'bg-transparent text-primary border border-primary hover:bg-primary-subtle rounded-md',
  ghost: 'bg-transparent text-text-primary hover:bg-background-subtle border border-transparent rounded-md',
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
            'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
            variantClasses[variant],
            sizeClasses[size],
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
