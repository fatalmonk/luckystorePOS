'use client'; // interactive button with variant/size styles and active scale

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-semibold rounded-[14px]
    transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
  `;

  const variantStyles = {
    primary: 'bg-warm-accent text-warm-fg hover:bg-warm-accent-hover',
    secondary: 'bg-warm-bg text-warm-fg border border-warm-border hover:bg-warm-border-light',
    ghost: 'bg-transparent text-warm-fg hover:bg-warm-bg',
  };

  const sizeStyles = {
    sm: 'px-3 text-sm min-h-[44px]',
    md: 'px-4 text-sm min-h-[44px]',
    lg: 'px-6 text-base min-h-[44px]',
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
