# Transformation Authority Matrix

| Layer | Responsibility | Authority |
|---|---|---|
| **Sale Intent (Mobile)** | Intent Capture | **Canonical Intent** |
| **Snapshot Model (Mobile)** | Point-of-Sale Context | **Canonical Context** |
| **OfflineSyncService** | Persistence & Sequential Delivery | **Sequence Owner** |
| **Supabase RPC (`complete_sale`)** | Reconciliation & Inventory Mutation | **Final State Authority** |
| **Edge Function** | None (RPC bypass) | **Transitional** |

## Ownership of Normalization
- **Payload Normalization**: Owned by `SaleTransactionIntent.toJson()`.
- **Queue Serialization**: Owned by `QueuedOfflineTransaction.toJson()`.
- **Replay Ordering**: Implicit (List order in JSON / `createdAt`).
- **Idempotency Keys**: Owned by `generateClientTransactionId`.
