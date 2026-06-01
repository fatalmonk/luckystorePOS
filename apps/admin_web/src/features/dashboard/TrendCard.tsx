import React from 'react';
import { formatCurrency } from '../../lib/format';

interface TrendCardProps {
  title: string;
  amount: number;
  trend?: number;
  inverseTrend?: boolean;
}

export const TrendCard = ({ title, amount, trend, inverseTrend = false }: TrendCardProps) => {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;
  
  let trendColor = "bg-warm-silver text-warm-dim"; // neutral default
  
  if (isPositive) {
    trendColor = inverseTrend ? "bg-warm-danger/10 text-warm-danger" : "bg-warm-success/10 text-warm-success";
  } else if (isNegative) {
    trendColor = inverseTrend ? "bg-warm-success/10 text-warm-success" : "bg-warm-danger/10 text-warm-danger";
  }

  return (
    <div className="p-6 bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm flex flex-col justify-between">
      <span className="text-sm font-semibold text-warm-muted uppercase tracking-wider">{title}</span>
      <h2 className="text-2xl font-bold mt-2 mb-1 text-warm-fg font-mono">{formatCurrency(amount)}</h2>
      
      {trend !== undefined && (
        <div className="flex items-center text-xs mt-2">
          <span className={`px-2 py-1 rounded-full font-semibold ${trendColor}`}>
            {isPositive ? '↑' : isNegative ? '↓' : '-'} {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-warm-dim ml-2">vs last month</span>
        </div>
      )}
    </div>
  );
};
