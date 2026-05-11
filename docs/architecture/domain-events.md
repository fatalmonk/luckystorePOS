# Domain Event Contracts

This document strictly defines the schema and rules for all domain events processed by the Offline Sync Engine.

## Core Rules
1. **Frontend Isolation**: The frontend NEVER directly mutates inventory or database state. It only emits "intent events".
2. **Causal Ordering**: Events MUST be replayed in the exact order they were generated to avoid temporal anomalies in stock logic.
3. **Idempotency Rules**: Every event MUST include a globally unique `operation_id` (`UUIDv4`).
4. **Conflict Rules**: If an RPC returns `{"conflict": true, "expected_quantity": X, "actual_quantity": Y}`, the Sync Engine MUST halt processing for that event, alert the operator, and preserve the event. It MUST NOT silently discard conflicting events.

---

## Event Schemas

All offline events share a generic envelope stored in `offline_events`:
```typescript
interface OfflineEventEnvelope {
  operationId: string;       // Primary Key, UUIDv4
  eventType: DomainEventType;
  payload: string;           // JSON stringified payload
  retryCount: number;
  syncStatus: 'pending' | 'processing' | 'synced' | 'failed';
  deviceId: string;
  appVersion: string;
  createdAt: string;         // ISO-8601
  updatedAt: string;         // ISO-8601
}
```

### 1. `sale_created`
**Trigger**: A cashier completes a checkout offline.
**RPC Target**: `deduct_stock` (or `process_sale`)
**Payload**:
```typescript
{
  store_id: string;
  product_id: string;
  quantity: number;
  expected_quantity: number; // For conflict detection
  metadata?: {
    sale_id?: string;
    notes?: string;
  };
}
```

### 2. `purchase_recorded`
**Trigger**: Operator receives a supplier delivery offline.
**RPC Target**: `record_purchase_v2`
**Payload**:
```typescript
{
  tenant_id: string;
  store_id: string;
  supplier_id: string;
  invoice_number?: string;
  invoice_total?: number;
  amount_paid: number;
  payment_account_id?: string;
  payable_account_id?: string;
  status: 'draft' | 'posted';
  notes?: string;
  items: Array<{
    item_id: string;
    quantity: number;
    unit_cost: number;
  }>;
}
```

### 3. `stock_adjusted`
**Trigger**: Operator manually corrects inventory levels.
**RPC Target**: `adjust_inventory_stock`
**Payload**:
```typescript
{
  tenant_id: string;
  store_id: string;
  product_id: string;
  quantity_delta: number;
  expected_quantity: number; // For conflict detection
  movement_type: 'adjustment' | 'damage';
  reference_type: 'adjustment';
  notes?: string;
}
```

### 4. `reconciliation_approved`
**Trigger**: Manager approves an offline stock count.
**RPC Target**: `approve_inventory_reconciliation`
**Payload**:
```typescript
{
  reconciliation_id: string;
  notes?: string;
}
```

---

## Dead Letter Queue (DLQ)
Events that exhaust the `maxRetries` (3) or hit terminal errors (e.g., Schema Mismatch, Corrupt Payload, Deleted Product) are moved to the `dead_letter_events` table.
These events are **never deleted**. They remain on the device until a manager reviews and either manually resolves them or clears them.

```typescript
interface DeadLetterEvent {
  operationId: string;
  eventType: string;
  payload: string;
  failureReason: string;
  failedAt: string;
}
```
