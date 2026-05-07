# 🔒 Row Level Security (RLS) Model

## Overview

This document describes the multi-tenant security model implemented via Row Level Security (RLS) policies in Supabase for the luckystorePOS system.

## Architecture

### Multi-Tenant Hierarchy

```
Tenant (Organization)
├── Store 1
│   ├── Users (Staff, Manager, Admin)
│   ├── Items (Products)
│   ├── Sales (Orders)
│   └── Inventory
├── Store 2
│   └── ...
└── Admin/Manager can see all stores in tenant
```

### Key Concepts

1. **Tenant Isolation**: Complete data separation between different organizations
2. **Store Scoping**: Users can only access data from their assigned store
3. **Role-Based Access**: Different permissions for staff, manager, admin, advisor
4. **Security Definer Functions**: Privileged functions with proper validation

## RLS Implementation

### Helper Functions

Two critical helper functions enable tenant isolation:

```sql
-- Returns current user's tenant_id
get_current_user_tenant_id()

-- Returns current user's store_id
get_current_user_store_id()
```

### Policy Pattern

All RLS policies follow this pattern:

```sql
-- SELECT Policy
CREATE POLICY "table_select_tenant_isolated"
  ON table_name
  FOR SELECT
  TO authenticated
  USING (
    store_id = get_current_user_store_id()
    OR
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = get_current_user_tenant_id()
    )
  );
```

### User Roles

| Role | Permissions |
|------|-------------|
| **staff** | Can only see and modify data in their own store |
| **manager** | Can manage all operations within their store |
| **admin** | Can see all stores in their tenant, manage users |
| **advisor** | Read-only access across all stores in tenant |

## Secured Tables

### Critical Tables (Fixed in Migration 20260508000000)

| Table | Risk Before | Security Now |
|-------|-------------|--------------|
| `categories` | 🔴 All users could see all categories | ✅ Store-scoped |
| `items` | 🔴 All products visible across tenants | ✅ Store-scoped |
| `discounts` | 🔴 Discount configs visible to all | ✅ Store-scoped |
| `stock_levels` | 🔴 Inventory visible across stores | ✅ Store-scoped |
| `purchase_orders` | 🔴 POs visible across tenants | ✅ Store-scoped |
| `suppliers` | 🔴 Supplier data visible to all | ✅ Store-scoped |
| + 7 more tables | 🔴 Similar vulnerabilities | ✅ Fixed |

### All Secured Tables

- ✅ `stores` - Store management
- ✅ `users` - User profiles
- ✅ `categories` - Product categories
- ✅ `items` - Products/inventory
- ✅ `parties` - Customers (Khata/ledgers)
- ✅ `sales` - Orders/transactions
- ✅ `sale_items` - Order line items
- ✅ `sale_payments` - Payment records
- ✅ `expenses` - Expense tracking
- ✅ `stock_levels` - Current inventory
- ✅ `stock_movements` - Inventory movements
- ✅ `stock_transfers` - Transfer records
- ✅ `suppliers` - Supplier management
- ✅ `purchase_orders` - Purchase orders
- ✅ `discounts` - Discount configurations
- ✅ `payment_methods` - Payment configurations
- ✅ `receipt_config` - Receipt settings
- ✅ All ledger tables - Accounting data

## Offline Sync Function

### `sync_offline_orders(p_orders JSONB)`

**Purpose**: Synchronize orders created offline when the Flutter app reconnects

**Security Features**:
1. ✅ Validates user is authenticated
2. ✅ Validates order belongs to user's store
3. ✅ Validates order was created by current user
4. ✅ Implements idempotency (safe to call multiple times)
5. ✅ Returns status for each order processed

**Usage Example** (Flutter/Dart):

```dart
final response = await supabase.rpc('sync_offline_orders', params: {
  'p_orders': [
    {
      'id': 'order-uuid',
      'store_id': 'user-store-id',
      'total': 100.00,
      'subtotal': 95.00,
      'discount': 5.00,
      'tax': 0.00,
      'payment_type': 'cash',
      'status': 'completed',
      'notes': 'Offline order',
      'created_by': 'user-uuid',
      'created_at': '2026-05-07T10:00:00Z',
      'idempotency_key': 'offline-order-123',
      'items': [
        {
          'id': 'item-uuid',
          'item_id': 'product-uuid',
          'quantity': 2,
          'unit_price': 47.50,
          'total_price': 95.00,
          'discount': 0,
          'created_at': '2026-05-07T10:00:00Z'
        }
      ],
      'payments': [
        {
          'id': 'payment-uuid',
          'amount': 100.00,
          'payment_type': 'cash',
          'reference_number': null,
          'created_at': '2026-05-07T10:00:00Z'
        }
      ]
    }
  ]
});
```

**Response Format**:

```json
[
  {
    "order_id": "uuid",
    "status": "success",
    "message": "Order synchronized successfully"
  }
]
```

## Testing

Run the test suite in `supabase/test_rls_policies.sql` to verify:

1. No tables have `USING (true)` policies
2. All core tables have RLS enabled
3. Regular users can only see their store's data
4. Admins can see all stores in their tenant
5. Cross-tenant isolation is enforced
6. Offline sync function works correctly

## Best Practices

### For Developers

1. **Never disable RLS** on any table
2. **Always use helper functions** in policies
3. **Test with multiple tenants** before deploying
4. **Use SECURITY DEFINER functions** carefully with proper validation
5. **Check auth.uid()** in all security-definer functions

### For Database Administrators

1. **Audit RLS policies** regularly with:
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

2. **Verify no USING (true)** policies:
   ```sql
   SELECT tablename, policyname FROM pg_policies 
   WHERE qual = 'true';
   ```

3. **Monitor for security issues** in application logs

## Migration History

- `20260505000000_tenant_isolation_rls.sql` - Initial tenant isolation
- `20260508000000_fix_critical_rls_gaps.sql` - **CRITICAL** Fixed 13 security vulnerabilities
- `sync_offline_orders.sql` - Offline sync function

## Support

For questions or security concerns:
- Review this documentation
- Check `SECURITY_RECOMMENDATIONS.md`
- Run tests in `test_rls_policies.sql`

---

**Last Updated**: 2026-05-08  
**Security Level**: CRITICAL  
**Review Required**: Before any production deployment
