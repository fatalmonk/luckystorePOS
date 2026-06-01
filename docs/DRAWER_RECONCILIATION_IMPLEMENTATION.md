# Drawer Reconciliation with Variance Tracking - Implementation Summary

## Files Modified

### 1. `/apps/mobile_app/lib/features/pos/presentation/screens/pos_session_summary_screen.dart`

Added three main methods for drawer reconciliation:

#### `_showDrawerReconciliationDialog()`
**Purpose:** Displays a dialog where the cashier enters the actual cash count and sees real-time variance calculation.

**Features:**
- Shows opening cash, cash sales, and expected drawer
- Real-time variance calculation as cashier types
- Color-coded variance status:
  - Green (#2ECC71): Balanced (variance = 0)
  - Blue (#3498DB): Over (more cash than expected)
  - Red (#E74C3C): Short (less cash than expected)
- Threshold warning when variance exceeds ৳50
- Notes field for variance explanation

**Returns:** 
```dart
{
  'actual_cash': double,
  'variance': double,
  'variance_status': 'balanced'|'over'|'short',
  'threshold_exceeded': bool,
  'variance_notes': String?,
  'manager_pin_verified': false,
}
```

#### `_requestManagerOverride(double variance)`
**Purpose:** Shows manager authentication dialog when variance exceeds threshold (৳50).

**Features:**
- Displays high variance warning with variance amount
- PIN input for manager verification (4-digit POS PIN)
- Validates manager role (admin or owner)
- Error feedback for invalid PIN

**Returns:**
```dart
{
  'approved': bool,
  'manager_name': String?,
  'manager_role': String?,
}
```

#### `_showVarianceReport(Map<String, dynamic> closeData)`
**Purpose:** Displays the final Z-Report after session close with variance details.

**Features:**
- Summary banner showing variance status
- Complete drawer breakdown:
  - Opening Cash
  - Cash Sales (+)
  - Expected Drawer
  - Actual Cash
  - Variance
- Threshold exceeded badge if applicable
- Status legend explaining variance types

### 2. Additional Helper Methods
- `_buildReconciliationRow()`: Builds formatted row for reconciliation dialog
- `_buildReportRow()`: Builds formatted row for variance report
- `_buildLegendItem()`: Builds legend items for variance status

## Database RPC (Already Exists)

### `close_session_with_reconciliation(p_session_id, p_actual_cash, p_variance, p_notes)`
**Location:** `/supabase/migrations/20260525000000_drawer_reconciliation_variance.sql`

**Returns:**
```json
{
  "success": true,
  "session_id": "uuid",
  "opening_cash": 1000.00,
  "cash_sales": 5000.00,
  "expected_drawer": 6000.00,
  "actual_cash": 5950.00,
  "variance": -50.00,
  "variance_status": "short",
  "variance_threshold_exceeded": false,
  "threshold_value": 50
}
```

## Database Schema Changes (Already Exists)

Added columns to `close_review_log`:
| Column | Type | Description |
|--------|------|-------------|
| `opening_cash` | numeric(15,2) | Opening cash at session start |
| `cash_sales` | numeric(15,2) | Total cash sales during session |
| `expected_drawer` | numeric(15,2) | Expected amount (opening + sales) |
| `actual_cash` | numeric(15,2) | Actual count by cashier |
| `variance_amount` | numeric(15,2) | Difference (actual - expected) |
| `variance_status` | text | balanced/over/short |
| `variance_threshold_exceeded` | boolean | True if |variance| > 50 |
| `manager_override_required` | boolean | True if threshold exceeded |
| `manager_override_pin_verified` | boolean | Manager PIN verified |
| `variance_notes` | text | Explanatory notes |

## Variance Threshold
**Value:** ৳50 Taka (configurable via `_varianceThreshold` constant)

## Flow
1. User clicks "Z-Report & Close Session"
2. Health review dialog appears (existing)
3. **NEW:** Drawer reconciliation dialog appears
   - Cashier enters actual cash count
   - Real-time variance calculation shown
   - If variance > ৳50, warning displayed
4. **NEW:** If threshold exceeded, manager override dialog appears
   - Manager enters PIN
   - Admin/Owner role verified
5. Session closed via `close_session_with_reconciliation` RPC
6. **NEW:** Variance report dialog shown to user

## Security
- Manager override requires admin or owner role
- PIN verification against users table with role filter
- Variance logged in close_review_log for audit
