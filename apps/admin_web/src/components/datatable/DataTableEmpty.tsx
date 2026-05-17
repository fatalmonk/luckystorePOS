import React from 'react';
import { Table } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';

interface DataTableEmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function DataTableEmpty({
  title = "No data found",
  description = "There are no records to display matching your criteria.",
  icon = <Table size={32} className="opacity-50" />,
  action
}: DataTableEmptyProps) {
  return (
    <div className="py-12 px-6">
      <EmptyState
        title={title}
        description={description}
        icon={icon}
        action={action}
      />
    </div>
  );
}
