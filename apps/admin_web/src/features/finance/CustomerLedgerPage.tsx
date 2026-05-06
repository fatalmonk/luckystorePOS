import { Users } from 'lucide-react';
import { LedgerPage } from './LedgerPage';

export const CustomerLedgerPage: React.FC = () => (
  <LedgerPage
    partyType="customer"
    title="Customer Receivable Ledger"
    subtitle="View customer statements and transaction history."
    icon={Users}
    emptyTitle="No customers yet"
    emptyDescription="Customers will appear here once they have a balance."
    balanceLabel="Current Balance (Due)"
    balanceColorPositive="var(--color-warning)"
    statementSubtitle="Statement of Account"
    debitLabel="Debit (Sale)"
    creditLabel="Credit (Paid)"
    debitColor="var(--color-warning)"
    creditColor="var(--color-success)"
    balanceSign={1}
    emptyLedgerText="No transactions yet"
  />
);