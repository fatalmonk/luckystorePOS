# Inventory Ledger Architecture

## The Core Philosophy
The Inventory Ledger establishes **immutability** as the foundation of all inventory operations. 
In this system:
1. **Inventory is derived state**: The `inventory_items` table merely represents a materialized view of the current stock.
2. **The Ledger is authoritative**: The `inventory_movements` table is the absolute source of truth. Every single change to an item's quantity MUST be recorded here with its context and intent.

Without this immutability, fraud detection, reconciliation, and reliable offline sync/replay are impossible.

## Append-Only Immutability
`inventory_movements` rows are **never** updated. They are append-only. 
If an error was made, a compensating transaction (a new row) must be appended to correct it. 
This is strictly enforced via database triggers and RLS policies.

## Table Structure
The `inventory_movements` table tracks:
- `id`: UUID (Primary Key)
- `tenant_id`: UUID (Foreign Key to tenants)
- `store_id`: UUID (Foreign Key to stores)
- `product_id`: UUID (Foreign Key to inventory_items)
- `movement_type`: Enum (sale, purchase, adjustment, return, damage, transfer, manual, sync_repair)
- `quantity_delta`: Integer (positive or negative change)
- `reference_type`: Enum (sale, purchase, expense, adjustment, system, sync)
- `reference_id`: UUID (Nullable, links to the exact sale/purchase/expense)
- `previous_quantity`: Integer
- `new_quantity`: Integer
- `notes`: Text (Business context, e.g., "POS checkout", "Damaged in transit")
- `created_by`: UUID (Foreign Key to auth.users)
- `created_at`: Timestampz

## Transactional Boundaries
**Never** allow the frontend to update `inventory_items` and then insert into `inventory_movements` as separate queries. 

All inventory mutations are handled inside Postgres RPCs (Remote Procedure Calls) to guarantee atomicity:
```sql
BEGIN;
  -- 1. Lock the row and get previous quantity
  -- 2. Update inventory_items
  -- 3. Insert into inventory_movements
COMMIT;
```

If any step fails, the entire transaction rolls back, preventing corruption.

## Negative Inventory Prevention
Stock cannot drop below zero unless `allow_negative_inventory` is set to true in the store's settings. This is enforced at the database layer inside the RPC.

## Offline Queue Integration
In the future, the offline POS app will queue these exact ledger events. Because the architecture is event-based, these offline transactions can be safely replayed chronologically when connectivity is restored, perfectly reconciling the final materialized stock.
