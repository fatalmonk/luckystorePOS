import React from 'react';
import { ExpenseTemplate } from '../../lib/api/types';
import { formatCurrency } from '../../lib/format';
import { CalendarClock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface RecurringExpensesPanelProps {
  recurringExpenses: ExpenseTemplate[];
  onRecordNow: (template: ExpenseTemplate) => void;
}

export function RecurringExpensesPanel({ recurringExpenses, onRecordNow }: RecurringExpensesPanelProps) {
  if (recurringExpenses.length === 0) return null;

  return (
    <div className="card p-6 mb-6 border border-warning bg-warning-subtle">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock size={20} className="text-warning-dark" />
        <h2 className="text-lg font-semibold text-warning-dark">Upcoming Recurring Expenses</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recurringExpenses.map(template => {
          const daysLeft = template.nextDueAt ? differenceInDays(new Date(template.nextDueAt), new Date()) : 0;
          let dueText = daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)} days` : daysLeft === 0 ? 'Due Today' : `Due in ${daysLeft} days`;
          
          return (
            <div key={template.id} className="bg-surface rounded-lg p-4 border border-border-default shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-text-primary">{template.name}</h3>
                  <span className="font-bold text-primary">{formatCurrency(template.amount)}</span>
                </div>
                <p className="text-sm text-text-muted mb-3">{template.vendorName}</p>
                <p className={`text-sm font-medium ${daysLeft <= 0 ? 'text-danger' : 'text-warning-dark'}`}>
                  {dueText}
                </p>
              </div>
              <button
                className="button-primary w-full mt-4 py-2"
                onClick={() => onRecordNow(template)}
              >
                Record Now
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
