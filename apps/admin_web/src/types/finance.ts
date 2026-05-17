export interface Party {
  id: string;
  tenant_id: string;
  type: 'customer' | 'supplier' | 'employee';
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  current_balance?: number;
}

export interface LedgerEntry {
  id: string;
  created_at: string;
  effective_date: string;
  account_id: string;
  party_id?: string;
  debit_amount: number;
  credit_amount: number;
  reference_type: string;
  reference_id: string;
  notes?: string;
}
