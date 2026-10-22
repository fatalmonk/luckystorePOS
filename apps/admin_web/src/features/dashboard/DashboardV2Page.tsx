import React from 'react';
import { SectionCards } from '@/components/section-cards';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { DataTable } from '@/components/data-table';
import dashboardData from '@/app/dashboard/data.json';
import { PageHeader } from '@/components';
import { Badge } from '@/components/ui/badge';

export function DashboardV2Page() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Dashboard v2"
          subtitle="Design preview only. Metrics and records below are static sample data, not live store activity."
        />
        <Badge variant="outline" className="w-fit border-[#f0c444] text-[#0B0B0D] dark:text-[#f0c444] font-semibold">
          Sample data preview
        </Badge>
      </div>

      <SectionCards />

      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>

      <div className="px-4 lg:px-6">
        <DataTable data={dashboardData} />
      </div>
    </div>
  );
}
