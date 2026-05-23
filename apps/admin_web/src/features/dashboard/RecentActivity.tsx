import { Clock, ShoppingCart, UserPlus, AlertCircle, TrendingUp, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'sale' | 'customer' | 'stock' | 'alert' | 'expense';
  title: string;
  description?: string;
  timestamp: Date;
  amount?: string;
}

interface RecentActivityProps {
  activities?: ActivityItem[];
}

const iconMap = {
  sale: { icon: ShoppingCart, color: 'text-warm-success bg-warm-success/10' },
  customer: { icon: UserPlus, color: 'text-warm-accent bg-warm-accent/10' },
  stock: { icon: Package, color: 'text-primary-default bg-primary-subtle' },
  alert: { icon: AlertCircle, color: 'text-warm-danger bg-warm-danger/10' },
  expense: { icon: TrendingUp, color: 'text-warm-warning bg-warm-warning/10' },
};

const defaultActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'sale',
    title: 'New sale recorded',
    description: 'Cash sale completed',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
    amount: '৳1,250',
  },
  {
    id: '2',
    type: 'customer',
    title: 'New customer added',
    description: 'John Doe registered',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
  },
  {
    id: '3',
    type: 'stock',
    title: 'Stock updated',
    description: '15 items received',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hr ago
  },
  {
    id: '4',
    type: 'alert',
    title: 'Low stock alert',
    description: 'Product SKU-123 below threshold',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hr ago
  },
  {
    id: '5',
    type: 'sale',
    title: 'Credit sale recorded',
    description: 'Customer: ABC Store',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hr ago
    amount: '৳3,500',
  },
];

export function RecentActivity({ activities = defaultActivities }: RecentActivityProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm">
      <div className="px-6 py-4 border-b border-warm-border">
        <h3 className="text-lg font-semibold text-warm-fg font-display">
          {t('dashboard.recentActivity', 'Recent Activity')}
        </h3>
      </div>

      <div className="divide-y divide-warm-border">
        {activities.length === 0 ? (
          <div className="px-6 py-8 text-center text-warm-muted">
            {t('dashboard.noActivity', 'No recent activity')}
          </div>
        ) : (
          activities.map((activity) => {
            const { icon: Icon, color } = iconMap[activity.type];
            return (
              <div key={activity.id} className="px-6 py-4 flex items-start gap-3 hover:bg-warm-bg/50 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon size={18} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-warm-fg truncate">{activity.title}</p>
                    {activity.amount && (
                      <span className="text-sm font-semibold text-warm-success flex-shrink-0">{activity.amount}</span>
                    )}
                  </div>
                  
                  {activity.description && (
                    <p className="text-xs text-warm-muted mt-0.5 truncate">{activity.description}</p>
                  )}
                  
                  <div className="flex items-center gap-1 mt-1 text-xs text-warm-dim">
                    <Clock size={12} />
                    <span>{formatDistanceToNow(activity.timestamp, { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-6 py-3 border-t border-warm-border">
        <button className="text-sm text-warm-accent hover:text-warm-accent-light font-medium transition-colors">
          {t('common.viewAll', 'View all activity')}
        </button>
      </div>
    </div>
  );
}
