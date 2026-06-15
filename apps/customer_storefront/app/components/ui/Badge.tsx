import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'accent';
  className?: string;
}

export function Badge({ children, variant = 'success', className = '' }: BadgeProps) {
  const variantStyles = {
    success: 'bg-[rgba(45,106,79,0.08)] text-[#2d6a4f]',
    warning: 'bg-[rgba(180,83,9,0.08)] text-[#b45309]',
    danger: 'bg-[rgba(195,49,47,0.07)] text-[#c3312f]',
    accent: 'bg-[#ffe302] text-[#1c1917]',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2 py-1 rounded-md
        text-[10px] font-bold uppercase tracking-wide
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {variant === 'success' && <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />}
      {children}
    </span>
  );
}
