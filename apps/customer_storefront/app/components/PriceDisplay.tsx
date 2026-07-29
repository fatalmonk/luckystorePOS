import { formatBdt } from '../lib/formatPrice';

interface PriceDisplayProps {
  value: number | null | undefined;
  className?: string;
  original?: number | null | undefined;
  savings?: number | null | undefined;
  unit?: string;
}

export function PriceDisplay({ value, className = '', original, savings, unit }: PriceDisplayProps) {
  const hasOriginal = original != null && original > (value ?? 0);
  const hasSavings = savings != null && savings > 0;

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <span className="font-bold text-warm-fg">{formatBdt(value)}</span>
      {hasOriginal && (
        <span className="line-through text-sm text-warm-muted">{formatBdt(original)}</span>
      )}
      {hasSavings && (
        <span className="bg-warm-success-bg text-warm-success text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          −{formatBdt(savings)}
        </span>
      )}
      {unit && (
        <span className="text-xs text-warm-muted">/ {unit}</span>
      )}
    </span>
  );
}
