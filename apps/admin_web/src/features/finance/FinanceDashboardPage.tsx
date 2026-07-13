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

  return (
    <div className="finance-workspace pb-20 md:pb-8">
      <PageHeader
        title="Financials"
        subtitle="Manage daily sales, expenses, and track your profit & loss."
      />

      {/* Date Filter Bar shared across all tabs */}
      <div className="px-6 mb-6">
        <div className="card p-4 expenses-filters">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-text-main">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-md border border-border-light bg-input px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-text-main">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border border-border-light bg-input px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const today = new Date();
                  const start = new Date(today.getFullYear(), today.getMonth(), 1);
                  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  setStartDate(start.toISOString().split('T')[0]);
                  setEndDate(end.toISOString().split('T')[0]);
                }}
                className="text-xs px-3 py-1 rounded-md bg-surface-tertiary text-text-primary border border-border-default hover:bg-surface-secondary transition-colors"
              >
                This Month
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const end = new Date(today.getFullYear(), today.getMonth(), 0);
                  setStartDate(start.toISOString().split('T')[0]);
                  setEndDate(end.toISOString().split('T')[0]);
                }}
                className="text-xs px-3 py-1 rounded-md bg-surface-tertiary text-text-primary border border-border-default hover:bg-surface-secondary transition-colors"
              >
                Last Month
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  setStartDate(start.toISOString().split('T')[0]);
                  setEndDate(end.toISOString().split('T')[0]);
                }}
                className="text-xs px-3 py-1 rounded-md bg-surface-tertiary text-text-primary border border-border-default hover:bg-surface-secondary transition-colors"
              >
                Last 3 Months
              </button>
              <button
                onClick={async () => {
                  const firstDate = await api.dailySales.getFirstSaleDate(storeId);
                  const today = new Date();
                  setStartDate(firstDate || '2000-01-01');
                  setEndDate(today.toISOString().split('T')[0]);
                }}
                className="text-xs px-3 py-1 rounded-md bg-surface-tertiary text-text-primary border border-border-default hover:bg-surface-secondary transition-colors"
              >
                All Time
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border-b border-border-default px-6 flex items-center gap-6 mb-6">
        <button
          onClick={() => setActiveTab('pnl')}
          className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'pnl' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <TrendingUp size={16} /> Profit & Loss
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'sales' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Calculator size={16} /> Daily Sales
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'expenses' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Receipt size={16} /> Expenses
        </button>
      </div>

      <div className="px-6">
        {activeTab === 'pnl' && <ProfitAndLossTab startDate={startDate} endDate={endDate} />}
        {activeTab === 'sales' && <DailySalesTab startDate={startDate} endDate={endDate} />}
        {activeTab === 'expenses' && <ExpensesTab startDate={startDate} endDate={endDate} />}
      </div>
    </div>
  );
}
