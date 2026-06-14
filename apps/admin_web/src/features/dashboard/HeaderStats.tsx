import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, BarChart3, Receipt, PackageOpen, Percent } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatCardProps {
  title: string;
  value: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  icon: React.ReactNode;
  accentColor: 'terracotta' | 'success' | 'warning' | 'blue';
}

function StatCard({ title, value, trend, trendValue, icon, accentColor }: StatCardProps) {
  const iconBgColors = {
    terracotta: 'bg-warm-accent text-white',
    success: 'bg-warm-success text-white',
    warning: 'bg-warm-warning text-warm-deep',
    blue: 'bg-[#2563ab] text-white',
  };

  return (
    <div className="bg-warm-surface border border-warm-border-warm rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-warm-muted mb-1">{title}</p>
          <h3 className="text-2xl font-semibold text-warm-fg font-display">{value}</h3>
          
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp size={14} className="text-warm-success" />
              ) : (
                <TrendingDown size={14} className="text-warm-danger" />
              )}
              <span className={`text-xs font-medium ${trend === 'up' ? 'text-warm-success' : 'text-warm-danger'}`}>
                {trendValue}
              </span>
              <span className="text-xs text-warm-dim">vs last week</span>
            </div>
          )}
        </div>
        
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgColors[accentColor]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface HeaderStatsProps {
  todaySales?: string;
  totalRevenue: string;
  netProfit: string;
  atv: string;           // Average Transaction Value
  upt: string;           // Units Per Transaction
  grossMargin: string;   // Gross Margin %
  salesTrend?: 'up' | 'down';
  profitTrend?: 'up' | 'down';
  atvTrend?: 'up' | 'down';
}

export function HeaderStats({
  todaySales = '৳0.00',
  totalRevenue,
  netProfit,
  atv = '৳0.00',
  upt = '0.0',
  grossMargin = '0%',
  salesTrend = 'up',
  profitTrend = 'up',
  atvTrend = 'up'
}: HeaderStatsProps) {
  const { t } = useTranslation();
  void t;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {/* Financials */}
      <StatCard
        title="Today's Sales"
        value={todaySales}
        trend={salesTrend}
        icon={<DollarSign size={24} />}
        accentColor="terracotta"
      />
      <StatCard
        title="Total Revenue (30d)"
        value={`৳${totalRevenue}`}
        trend={salesTrend}
        icon={<ShoppingCart size={24} />}
        accentColor="success"
      />
      <StatCard
        title="Net Profit (30d)"
        value={`৳${netProfit}`}
        trend={profitTrend}
        icon={<BarChart3 size={24} />}
        accentColor="warning"
      />

      {/* Retail Operations */}
      <StatCard
        title="Avg Transaction Value (ATV)"
        value={`৳${atv}`}
        trend={atvTrend}
        icon={<Receipt size={24} />}
        accentColor="blue"
      />
      <StatCard
        title="Units Per Transaction (UPT)"
        value={upt}
        icon={<PackageOpen size={24} />}
        accentColor="terracotta"
      />
      <StatCard
        title="Gross Margin"
        value={grossMargin}
        icon={<Percent size={24} />}
        accentColor="success"
      />
    </div>
  );
}
