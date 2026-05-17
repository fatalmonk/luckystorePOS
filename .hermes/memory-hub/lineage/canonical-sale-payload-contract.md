# Canonical Sale Payload Contract v1

## Objective
Eliminate split-brain payload semantics across Flutter, Edge Functions, and RPC layers.

## 1. Item Definition (Canonical)
| Field | Type | Description |
|-------|------|-------------|
| `item_id` | UUID | The primary product identifier. |
| `qty` | Int | The integer quantity. |
| `unit_price` | Num | Fixed price at point of sale. |
| `discount` | Num | Per-item discount. |

## 2. Payload Structure (Unified)
```json
{
  "client_transaction_id": "tx-...",
  "store_id": "uuid",
  "items": [
    { "item_id": "uuid", "qty": 1, "unit_price": 10.0, "discount": 0 }
  ],
  "payments": [
    { "payment_method_id": "uuid", "amount": 10.0 }
  ],
  "snapshot": {
    "mode": "online|offline",
    "items": [
      { "item_id": "uuid", "qty": 1 }
    ]
  }
}
```

## 3. Drift Reconciliation Map
- **Flutter**: Change `quantity` -> `qty` in list mapping.
- **Edge Function**:
    - Request Body: Accept `quantity` but map to `qty` for RPC items.
    - Snapshot: Change `product_id` -> `item_id` and `quantity` -> `qty`.
- **RPC `complete_sale`**: Ensure internally references `qty` consistently.

## 4. Enforcement Strategy
All replay validation tests must check `snapshot.items[0]` against `items[0]` using the `item_id`/`qty` key set ONLY.
