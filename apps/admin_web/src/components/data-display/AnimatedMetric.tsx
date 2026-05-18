import React from 'react';
import clsx from 'clsx';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

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
  duration = 800,
  format = false,
}) => {
  const animatedValue = useAnimatedNumber(value, { duration });

  const displayValue = format 
    ? animatedValue.toLocaleString('en-BD', { maximumFractionDigits: 0 })
    : animatedValue.toString();

  return (
    <span className={clsx('tabular-nums', className)}>
      {prefix}{displayValue}{suffix}
    </span>
  );
};
