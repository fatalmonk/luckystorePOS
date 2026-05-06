import { Store } from 'lucide-react';
import { LedgerPage } from './LedgerPage';

export const SupplierLedgerPage: React.FC = () => (
  <LedgerPage
    partyType="supplier"
    title="Supplier Payable Ledger"
    subtitle="View supplier statements and transaction history."
    icon={Store}
    emptyTitle="No suppliers yet"
    emptyDescription="Suppliers will appear here once they have a balance."
    balanceLabel="Current Payable"
    balanceColorPositive="var(--color-danger)"
    statementSubtitle="Transaction History"
    debitLabel="Debit (Paid)"
    creditLabel="Credit (Purch)"
    debitColor="var(--color-success)"
    creditColor="var(--color-danger)"
    balanceSign={-1}
    emptyLedgerText="No transactions found for this supplier"
  />
);