# Identity Mapping Matrix (IMM)

| Concept | Flutter Model | RPC Param | Supabase Table | Field Name |
|---------|---------------|-----------|----------------|------------|
| Product | `item_id` | `p_product_id` | `inventory_items` | `id` |
| Stock Qty | `quantity` | `p_quantity_delta` | `stock_levels` | `qty` |
| Sale ID | `clientTransactionId` | `p_client_transaction_id` | `sales` | `client_transaction_id` |
| Op Idempotency | `transactionTraceId` | `p_operation_id` | `inventory_movements` | `operation_id` |
| Ledger Delta | - | `p_quantity_delta` | `inventory_movements` | `quantity_delta` |
| User | `cashierId` | `p_cashier_id` | `users` | `id` |
