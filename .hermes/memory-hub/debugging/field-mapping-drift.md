# Field Mapping Drift Registry

## 1. Product References
Standard: `item_id` (new) vs `product_id` (legacy/inconsistent).

| Location | Field Name | Target Table |
|----------|------------|--------------|
| `stock_levels` | `item_id` | `inventory_items` |
| `inventory_movements` | `product_id` | `inventory_items` |
| `inventory_reconciliations` | `product_id` | `inventory_items` |
| `adjust_inventory_stock` | `p_product_id` | - |
| `complete_sale` RPC items | `item_id` | - |
| `complete_sale` Snapshot | `product_id` | - |
| `record_purchase_v2` items | `item_id` | - |

## 2. Quantity References
Standard: `quantity_delta` (new) vs `qty` / `quantity` (legacy).

| Location | Field Name |
|----------|------------|
| `inventory_movements` | `quantity_delta` |
| `stock_levels` | `qty` |
| `sale_items` | `qty` |
| `complete_sale` RPC items | `qty` |
| `complete_sale` Snapshot | `quantity` |
