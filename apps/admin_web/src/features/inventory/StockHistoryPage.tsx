import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState } from '../../components/PageState';
import { ArrowLeft, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { InventoryMovementTimeline, InventoryMovement } from './InventoryMovementTimeline';

const MOVEMENT_TYPES = [
  { value: 'all', label: 'All Movements' },
  { value: 'sale', label: 'Sales' },
  { value: 'purchase', label: 'Purchases' },
  { value: 'adjustment', label: 'Adjustments' },
  { value: 'return', label: 'Returns' },
  { value: 'damage', label: 'Damaged' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'manual', label: 'Manual overrides' },
];

export function StockHistoryPage() {
  const { storeId } = useAuth();
  const [movementType, setMovementType] = useState('all');

  const { data: history, isLoading, error } = useQuery<InventoryMovement[]>({
    queryKey: ['inventory-history', storeId, movementType],
    queryFn: () => api.inventory.history(storeId, undefined, movementType === 'all' ? undefined : movementType),
  });

  if (error) {
    return (
      <div className="history-container">
        <PageHeader 
          title="Stock Movement History" 
          subtitle="Audit log of all manual and automated stock changes." 
        />
        <Card className="mt-6">
          <ErrorState message="Error loading stock history." />
        </Card>
      </div>
    );
  }

  return (
    <div className="history-container max-w-5xl mx-auto p-4 sm:p-6">
      <header className="mb-4">
        <Link to="/inventory">
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={18} />} className="mb-4">
            Back to Inventory
          </Button>
        </Link>
      </header>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <PageHeader 
          title="Stock Movement Ledger" 
          subtitle="Immutable audit log of all inventory mutations and their operational context." 
          className="mb-0"
        />

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10 pointer-events-none" />
            <select 
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="pl-9 w-full bg-background-main border-border-default input"
            >
              {MOVEMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Card padding="none" className="overflow-hidden">
        <InventoryMovementTimeline movements={history} isLoading={isLoading} />
      </Card>
    </div>
  );
}
