# Security Recommendations

## Completed Security Fixes

### ✅ Critical: Revoked Anon EXECUTE on SECURITY DEFINER Functions
- Migration: `20260506010000_revoke_anon_security_definer_execute.sql`
- 85+ functions now require authentication
- Prevents unauthenticated users from executing privileged operations

### ✅ High: Fixed Mutable search_path
- Migration: `20260506020000_fix_function_search_path_mutable.sql`
- 21 functions now have explicit `SET search_path = ''`
- Prevents search path injection attacks

### ✅ Medium: Restricted Authenticated EXECUTE
- Migration: `20260506030000_restrict_authenticated_sensitive_functions.sql`
- 10 admin/manager-only functions now restricted
- Functions like `void_sale`, `close_accounting_period`, `issue_pos_override_token`

## Manual Security Configuration Required

### 🔴 Leaked Password Protection (HIGH PRIORITY)

**Status:** Cannot be configured via CLI (requires dashboard or newer CLI version)

**Action Required:** Enable HaveIBeenPwned.org password checking

**How to Enable:**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: Project Settings → Authentication
3. Find: "Password Protection" or "Leaked Password Protection"
4. Enable: "Check passwords against HaveIBeenPwned.org"

**Why This Matters:**
- Prevents users from using passwords that have been compromised in data breaches
- Significantly improves account security
- One-click security improvement

**Alternative (requires newer CLI):**
```bash
# Requires Supabase CLI v2.98.2+
supabase config set auth.enable_hibp_check true --project-ref YOUR_PROJECT_REF
```

## Remaining Security Considerations

### Role-Based Access Control (RBAC)
The current implementation uses `authenticated` role broadly. Consider implementing:
- `pos_admin` role: Full system access
- `pos_manager` role: Override approvals, reporting, period closing
- `pos_cashier` role: Sales, limited refunds

### RLS Policies
Review Row Level Security policies on:
- `sales`, `sale_items` tables
- `inventory` adjustments
- `ledger_entries` - should be immutable with append-only pattern
- `users` - restrict profile updates

### MFA (Multi-Factor Authentication)
Available on Supabase Pro plan. Recommended for:
- Admin accounts
- Manager accounts with override permissions

## Security Monitoring

Consider implementing:
- Audit logging for sensitive operations (sales, inventory, ledger)
- Failed login attempt monitoring
- Rate limiting validation

## Compliance Notes

For retail/financial compliance:
- Ledger entries are append-only (protected by trigger)
- Sale audit logs are immutable
- Period closing prevents backdated entries
