import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DailySalesTab } from '../sales/DailySalesTab';
import { ExpensesTab } from '../expenses/ExpensesTab';
import { ProfitAndLossTab } from './ProfitAndLossTab';
import { Calculator, Receipt, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';

type Tab = 'pnl' | 'sales' | 'expenses';

export function FinanceDashboardPage() {
  const { storeId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('pnl');

  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const quickSelects = [
    {
      label: 'This Month',
      getRange: () => {
        const today = new Date();
        return {
          start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
          end: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Last Month',
      getRange: () => {
        const today = new Date();
        return {
          start: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0],
          end: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Last 3 Months',
      getRange: () => {
        const today = new Date();
        return {
          start: new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().split('T')[0],
          end: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'All Time',
      getRange: async () => {
        const firstDate = await api.dailySales.getFirstSaleDate(storeId);
        const today = new Date();
        return {
          start: firstDate || '2000-01-01',
          end: today.toISOString().split('T')[0],
        };
      },
    },
  ];

  const handleQuickSelect = async (getRange: () => { start: string; end: string } | Promise<{ start: string; end: string }>) => {
    const range = await getRange();
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const tabs = [
    { id: 'pnl' as Tab, label: 'Profit & Loss', icon: TrendingUp },
    { id: 'sales' as Tab, label: 'Daily Sales', icon: Calculator },
    { id: 'expenses' as Tab, label: 'Expenses', icon: Receipt },
  ];

  return (
    <div className="finance-workspace pb-20 md:pb-8">
      <PageHeader
        title="Financials"
        subtitle="Manage daily sales, expenses, and track your profit & loss."
      />

      {/* Date Filter Bar — floating pill strip, theme-aware */}
      <div className="px-6 mb-8">
        <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center gap-3">
          <div className="flex items-center gap-2 bg-[var(--color-paper)]/80 backdrop-blur-md border border-[var(--color-border)] rounded-full px-4 py-2">
            <Calendar size={14} className="text-[var(--color-accent)] shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-sm text-[var(--color-foreground)] focus:outline-none w-[120px]"
            />
            <span className="text-[var(--color-muted)]">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-sm text-[var(--color-foreground)] focus:outline-none w-[120px]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {quickSelects.map(({ label, getRange }) => (
              <button
                key={label}
                onClick={() => handleQuickSelect(getRange)}
                className="px-3 py-1 rounded-full bg-[var(--color-border-light)] text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-ghost)] transition-all duration-300 shrink-0"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating pill tab navigation, theme-aware */}
      <div className="px-6 mb-8">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-[var(--color-paper)]/60 backdrop-blur-md border border-[var(--color-border)] rounded-full p-1.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    isActive
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] rounded-full px-5 py-2 font-semibold text-sm flex items-center gap-2 transition-all duration-300'
                      : 'bg-transparent text-[var(--color-muted)] rounded-full px-5 py-2 font-medium text-sm flex items-center gap-2 hover:bg-[var(--color-border-light)] hover:text-[var(--color-foreground)] transition-all duration-300'
                  }
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content with entry animation */}
      <div className="px-6 finance-tab-content">
        {activeTab === 'pnl' && <ProfitAndLossTab startDate={startDate} endDate={endDate} />}
        {activeTab === 'sales' && <DailySalesTab startDate={startDate} endDate={endDate} />}
        {activeTab === 'expenses' && <ExpensesTab startDate={startDate} endDate={endDate} />}
      </div>
    </div>
  );
}
