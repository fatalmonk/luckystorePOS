# RPC Contracts

This document strictly defines the contracts for all database RPCs. The frontend relies heavily on these shapes, and they must not be changed without coordinating updates across both the database migrations and the frontend API layer.

## Inventory Ledger Mutations

### `adjust_inventory_stock`
**Purpose**: The primary method for adjusting stock quantities via the immutable ledger.
**Transaction Guarantees**: Uses `FOR UPDATE` row-level locks on `stock_levels` to prevent concurrent write anomalies.
**Idempotency**: Supported via `p_operation_id`. If an `operation_id` is provided and already exists in `inventory_movements`, returns the existing result without applying a second mutation.

**Inputs:**
```ts
{
  p_tenant_id: UUID;
  p_store_id: UUID;
  p_product_id: UUID;
  p_quantity_delta: INTEGER;
  p_movement_type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'damage' | 'transfer' | 'manual' | 'sync_repair';
  p_reference_type: 'sale' | 'purchase' | 'expense' | 'adjustment' | 'system' | 'sync';
  p_reference_id?: UUID;
  p_notes?: TEXT;
  p_allow_negative?: BOOLEAN;
  p_operation_id?: UUID;
}
```

**Outputs:**
```ts
{
  success: boolean;
  movement_id: UUID;
  previous_quantity: integer;
  new_quantity: integer;
  idempotent_replay?: boolean;
}
```

**Permissions**: Authenticated users who have access to the store (`user_stores` join table). Service roles bypass this check.
**Failure Modes**:
- `Not authenticated`: Auth token missing.
- `Unauthorized to modify stock for this store`: User does not have store permissions.
- `Stock cannot go below zero`: If `p_allow_negative` is false and resulting quantity is < 0.
- Check constraint violation if `p_quantity_delta + previous_quantity != new_quantity`.
**Side Effects**: Updates `stock_levels`, inserts into `inventory_movements`.

---

### `set_inventory_stock`
**Purpose**: Directly override the current stock quantity. Calculates the delta and calls the ledger.
**Transaction Guarantees**: Same as `adjust_inventory_stock`.
**Idempotency**: Same as `adjust_inventory_stock`.

**Inputs:**
```ts
{
  p_tenant_id: UUID;
  p_store_id: UUID;
  p_product_id: UUID;
  p_new_quantity: INTEGER;
  p_movement_type: movement_type;
  p_reference_type: reference_type;
  p_reference_id?: UUID;
  p_notes?: TEXT;
  p_operation_id?: UUID;
}
```

**Outputs:** Same as `adjust_inventory_stock`.
**Failure Modes**: Same as `adjust_inventory_stock`. Check constraint failure if `new_quantity < 0`.

---

### `deduct_stock`
**Purpose**: Deducts stock specifically during POS checkout flows.
**Transaction Guarantees**: Strict row locks on `stock_levels`.
**Idempotency**: Supported via `p_operation_id`.

**Inputs:**
```ts
{
  p_store_id: UUID;
  p_product_id: UUID;
  p_quantity: INTEGER;
  p_metadata?: JSONB;
  p_operation_id?: UUID;
}
```

**Outputs:**
```ts
{
  success: boolean;
  movement_id: UUID;
  stock_level_id: UUID;
  previous_quantity: integer;
  new_quantity: integer;
  deducted: integer;
  timestamp: string;
  idempotent_replay?: boolean;
}
```
*Note: This RPC also returns gracefully typed errors inside the JSON object instead of raising exceptions for insufficient stock.*

**Failure Modes**:
- Returns `NO_STOCK_LEVEL` if no stock level exists.
- Returns `INSUFFICIENT_STOCK` if `qty < p_quantity`.

---

## Purchases

### `record_purchase_v2`
**Purpose**: Process a supplier intake transaction.
**Transaction Guarantees**: Full transaction. Reads stock, updates stock, creates ledger entries, creates purchase receipt and journal batches.
**Idempotency**: Supported via `p_idempotency_key` which checks the `idempotency_keys` table.

**Inputs:**
```ts
{
  p_idempotency_key: TEXT;
  p_tenant_id: UUID;
  p_store_id: UUID;
  p_supplier_id: UUID;
  p_invoice_number?: TEXT;
  p_invoice_total?: NUMERIC;
  p_items: JSONB; // [{ item_id, quantity, unit_cost }]
  p_amount_paid?: NUMERIC;
  p_payment_account_id?: UUID;
  p_payable_account_id?: UUID;
  p_status?: 'draft' | 'posted';
  p_notes?: TEXT;
}
```

**Outputs:**
```ts
{
  status: 'success';
  receipt_id: UUID;
  batch_id?: UUID;
  total_cost: number;
  amount_paid: number;
  payable_amount: number;
  state: 'draft' | 'posted';
}
```

**Side Effects**: Creates `purchase_receipts`, `journal_batches`, `ledger_entries`, `inventory_movements`, updates `stock_levels`, creates `idempotency_keys`.

---

## Reconciliation

### `approve_inventory_reconciliation`
**Purpose**: Finalizes a stock count and adjusts the ledger.
**Transaction Guarantees**: Uses `FOR UPDATE` row lock on `inventory_reconciliations`. Internally calls `adjust_inventory_stock`.
**Idempotency**: The internal ledger write is idempotent using the reconciliation `id` as the `operation_id`. The status transition (`pending` -> `approved`) is strictly enforced.

**Inputs:**
```ts
{
  p_reconciliation_id: UUID;
  p_notes?: TEXT;
}
```

**Outputs:**
```ts
{
  success: boolean;
  reconciliation_id: UUID;
  difference: integer;
}
```
