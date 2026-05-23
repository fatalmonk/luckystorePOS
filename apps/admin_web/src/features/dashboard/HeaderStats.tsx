import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, BarChart3 } from 'lucide-react';
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
  const accentColors = {
    terracotta: 'bg-warm-accent/10 text-warm-accent border-warm-accent/20',
    success: 'bg-warm-success/10 text-warm-success border-warm-success/20',
    warning: 'bg-warm-warning/10 text-warm-warning border-warm-warning/20',
    blue: 'bg-[#2563ab]/10 text-[#2563ab] border-[#2563ab]/20',
  };

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
  totalCustomers?: string;
  netProfit: string;
  salesTrend?: 'up' | 'down';
  profitTrend?: 'up' | 'down';
}

export function HeaderStats({
  todaySales = '৳0.00',
  totalRevenue,
  totalCustomers = '0',
  netProfit,
  salesTrend = 'up',
  profitTrend = 'up',
}: HeaderStatsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title={t('dashboard.todaySales', 'Today\'s Sales')}
        value={todaySales}
        trend={salesTrend}
        trendValue="12.5%"
        icon={<DollarSign size={24} />}
        accentColor="terracotta"
      />
      
      <StatCard
        title={t('dashboard.totalRevenue', 'Total Revenue')}
        value={`৳${totalRevenue}`}
        trend={profitTrend}
        trendValue="8.2%"
        icon={<ShoppingCart size={24} />}
        accentColor="success"
      />
      
      <StatCard
        title={t('dashboard.customers', 'Customers')}
        value={totalCustomers}
        icon={<Users size={24} />}
        accentColor="blue"
      />
      
      <StatCard
        title={t('dashboard.netProfit', 'Net Profit')}
        value={`৳${netProfit}`}
        trend={profitTrend}
        trendValue="15.3%"
        icon={<BarChart3 size={24} />}
        accentColor="warning"
      />
    </div>
  );
}
