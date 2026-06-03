import React from 'react';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: 'OK' | 'LOW' | 'OUT';
  previousStatus?: 'OK' | 'LOW' | 'OUT' | null;
  className?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  OK: { bg: 'bg-warm-success/10', text: 'text-warm-success', border: 'border-warm-success/20' },
  LOW: { bg: 'bg-warm-warning/10', text: 'text-warm-warning', border: 'border-warm-warning/20' },
  OUT: { bg: 'bg-warm-danger/10', text: 'text-warm-danger', border: 'border-warm-danger/20' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  previousStatus,
  className 
}) => {
  const shouldAnimate = previousStatus && previousStatus !== status && status === 'LOW';
  
  return (
    <span
      className={clsx(
        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
        STATUS_STYLES[status]?.bg,
        STATUS_STYLES[status]?.text,
        STATUS_STYLES[status]?.border,
        shouldAnimate && 'animate-status-pop',
        className
      )}
    >
      {status}
    </span>
  );
};

// Add CSS animation styles to your global CSS or a style tag
export const StatusBadgeStyles = () => (
  <style>{`
    @keyframes status-pop {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.2);
      }
      100% {
        transform: scale(1);
      }
    }
    
    .animate-status-pop {
      animation: status-pop 0.3s ease-out;
    }
  `}</style>
);
