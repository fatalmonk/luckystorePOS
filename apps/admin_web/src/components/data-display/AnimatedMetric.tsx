import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

interface AnimatedMetricProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  format?: boolean; // format with toLocaleString
}

export const AnimatedMetric: React.FC<AnimatedMetricProps> = ({
  value,
  prefix = '',
  suffix = '',
  className,
  format = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Only animate on data changes, skip initial mount flash
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [value]);

  const displayValue = format 
    ? value.toLocaleString('en-BD', { maximumFractionDigits: 0 })
    : value.toString();

  return (
    <span 
      className={clsx(
        'tabular-nums transition-all duration-300', 
        isAnimating ? 'text-primary scale-105 inline-block' : '',
        className
      )}
    >
      {prefix}{displayValue}{suffix}
    </span>
  );
};