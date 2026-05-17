import React from 'react';
import { PageContainer } from '../../layouts/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Activity, Database, AlertTriangle, Cpu, Server, Clock, TrendingUp } from 'lucide-react';

// Simplified visual mock builders as requested by constraints
export function SyncHealthDashboard() {
  return (
    <PageContainer>
      <PageHeader 
        title="System Status Overview" 
        subtitle="Health snapshot of active registers and pending data transfers."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <SyncHealthScoreCard />
        <DLQOverviewCard />
        <ConflictWarningCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <QueueDepthTimeline />
        <ReplayLatencyChart />
      </div>

      <div className="grid grid-cols-1 mt-6">
        <OfflineDeviceTable />
      </div>
    </PageContainer>
  );
}

function SyncHealthScoreCard() {
  return (
    <Card className="p-6 flex items-start justify-between">
      <div>
        <div className="flex items-center space-x-2 text-emerald-600 font-medium mb-1">
          <Activity className="w-4 h-4" />
          <span className="text-sm">Overall System Health</span>
        </div>
        <h3 className="text-3xl font-bold text-slate-900 mt-2">98.4%</h3>
        <p className="text-slate-500 text-xs mt-1">Calculated reliability across 12 active store registers.</p>
      </div>
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Operational</Badge>
    </Card>
  );
}

export function DLQOverviewCard() {
  return (
    <Card className="p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-slate-700">
          <Database className="w-5 h-5 text-rose-500" />
          <span className="font-semibold">Orders Needing Review</span>
        </div>
        <span className="text-xs font-bold text-rose-600 px-2 py-1 bg-rose-50 rounded">+12% today</span>
      </div>
      <div className="text-4xl font-extrabold text-slate-900 mb-2">14</div>
      <p className="text-sm text-slate-500">Sales that failed to sync properly. Tap to investigate.</p>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-200" />
    </Card>
  );
}

function ConflictWarningCard() {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 text-amber-600 mb-4">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-semibold">Counting Errors</span>
      </div>
      <div className="text-4xl font-extrabold text-slate-900 mb-2">3</div>
      <p className="text-sm text-slate-500">Discrepancies found between computer and shelf stock counts.</p>
    </Card>
  );
}

export function ReplayLatencyChart() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" /> Data Send Speed
        </h4>
        <span className="text-xs text-slate-500">Last 6 hours</span>
      </div>
      <div className="flex items-end justify-between h-40 gap-2 mt-4">
        {[120, 45, 30, 200, 80, 60, 110, 90, 40, 35, 50, 22].map((val, idx) => (
          <div 
            key={idx} 
            className="flex-1 bg-blue-100 hover:bg-blue-500 rounded-t transition-colors group relative"
            style={{ height: `${(val / 200) * 100}%` }}
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
              {val} ms
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function QueueDepthTimeline() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" /> Unsent Sales Backlog
        </h4>
        <div className="text-xs font-medium text-indigo-700">Avg: 42 events/sec</div>
      </div>
      <div className="relative h-40 w-full">
        {/* Native SVG rendering for timeline visualization per constraints */}
        <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="h-full w-full stroke-indigo-500 fill-indigo-500/10">
          <path 
            d="M0 90 Q 50 20, 100 80 T 200 40 T 300 60 T 400 10 L 400 100 L 0 100 Z" 
            strokeWidth="2" 
          />
        </svg>
      </div>
    </Card>
  );
}

export function OfflineDeviceTable() {
  const mockDevices = [
    { id: 'POS-001', lastSeen: '2 mins ago', pending: 0, status: 'online' },
    { id: 'POS-003', lastSeen: '45 mins ago', pending: 12, status: 'offline' },
    { id: 'POS-MOBILE-A', lastSeen: 'Just now', pending: 3, status: 'online' }
  ];

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h4 className="font-bold text-slate-800 flex items-center gap-2"><Cpu className="w-4 h-4 text-slate-500" /> Active Registers</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3">Register</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Last Active</th>
              <th className="px-6 py-3 text-right">Unsaved Items</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockDevices.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{d.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${d.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="capitalize text-xs font-medium">{d.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500">{d.lastSeen}</td>
                <td className="px-6 py-4 text-right font-mono font-semibold">{d.pending}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
