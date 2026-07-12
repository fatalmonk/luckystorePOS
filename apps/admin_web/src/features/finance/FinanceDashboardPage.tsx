import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DailySalesTab } from '../sales/DailySalesTab';
import { ExpensesTab } from '../expenses/ExpensesTab';
import { ProfitAndLossTab } from './ProfitAndLossTab';
import { Calculator, Receipt, TrendingUp } from 'lucide-react';

type Tab = 'pnl' | 'sales' | 'expenses';

export function FinanceDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pnl');

  return (
    <div className="finance-workspace pb-20 md:pb-8">
      <PageHeader
        title="Financials"
        subtitle="Manage daily sales, expenses, and track your profit & loss."
      />

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
        {activeTab === 'pnl' && <ProfitAndLossTab />}
        {activeTab === 'sales' && <DailySalesTab />}
        {activeTab === 'expenses' && <ExpensesTab />}
      </div>
    </div>
  );
}
