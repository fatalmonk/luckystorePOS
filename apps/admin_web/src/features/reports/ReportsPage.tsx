import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { BarChart3, TrendingUp, Package, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { EmptyState } from '../../components/PageState';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'profit'>('sales');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Business Reports" 
        subtitle="View performance metrics, sales trends, and inventory stats." 
        actions={
          <button className="button-outline gap-2">
            <Calendar size={18} />
            <span>Last 30 Days</span>
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-border-color">
        <button
          onClick={() => setActiveTab('sales')}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
            activeTab === 'sales'
              ? 'border-color-primary text-text-main'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
          )}
        >
          <BarChart3 size={18} />
          Sales Report
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
            activeTab === 'inventory'
              ? 'border-color-primary text-text-main'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
          )}
        >
          <Package size={18} />
          Inventory Value
        </button>
        <button
          onClick={() => setActiveTab('profit')}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
            activeTab === 'profit'
              ? 'border-color-primary text-text-main'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
          )}
        >
          <TrendingUp size={18} />
          Profit & Loss
        </button>
      </div>

      {/* Tab Content */}
      <div className="card min-h-[400px] flex items-center justify-center">
        {activeTab === 'sales' && (
          <EmptyState
            icon={<BarChart3 size={48} />}
            title="Sales Report"
            description="Sales trend visualizations and metrics will be displayed here."
          />
        )}
        {activeTab === 'inventory' && (
          <EmptyState
            icon={<Package size={48} />}
            title="Inventory Report"
            description="Total inventory valuation and stock levels will be displayed here."
          />
        )}
        {activeTab === 'profit' && (
          <EmptyState
            icon={<TrendingUp size={48} />}
            title="Profit & Loss"
            description="Income, expenses, and net profit margins will be displayed here."
          />
        )}
      </div>
    </div>
  );
};
