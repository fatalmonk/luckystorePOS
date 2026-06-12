import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { SkeletonBlock } from '../../components/PageState';
import type { CashflowData } from '../../lib/api/domains/dashboard';

export const CashflowChart = () => {
  const { storeId } = useAuth();
  const [range, setRange] = useState(7);

  const { data, isLoading } = useQuery<CashflowData[]>({
    queryKey: ['dashboard-cashflow', storeId, range],
    queryFn: () => api.dashboard.getCashflowData(storeId!, range),
    enabled: !!storeId,
  });

  return (
    <div className="bg-warm-surface p-6 rounded-xl shadow-sm border border-warm-border-warm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-warm-fg font-display">Cashflow</h3>
          <span className="text-sm text-warm-muted">Money In vs. Money Out</span>
        </div>
        
        <select 
          className="border border-warm-border-warm bg-warm-surface text-warm-fg rounded-md p-2 text-sm focus:ring-warm-success focus:border-warm-success"
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 3 Months</option>
          <option value={180}>Last 6 Months</option>
        </select>
      </div>

      {isLoading ? (
        <div className="h-[300px]">
          <SkeletonBlock className="h-full w-full" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 12, fill: '#737373' }} 
              tickMargin={10} 
              minTickGap={range > 30 ? 30 : 5} 
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#737373' }} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
            <Line 
              name="Total Money In" 
              type="monotone" 
              dataKey="income" 
              stroke="#10B981" 
              strokeWidth={3}
              dot={range <= 30} 
              activeDot={{ r: 6 }} 
            />
            <Line 
              name="Total Money Out" 
              type="monotone" 
              dataKey="outcome" 
              stroke="#EF4444" 
              strokeWidth={3}
              dot={range <= 30} 
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
