# Runbook: Rollback Procedures

## Migration Rollback

**CRITICAL**: Never rollback applied migrations in staging/production.

### If migration failed during replay (local only):

1. Identify failing migration from `failure.json`
2. Fix migration SQL
3. Re-run replay from beginning
4. Verify all migrations pass

### If migration already pushed to staging:

1. **STOP** - do not attempt migration repair
2. Create NEW migration that fixes the issue
3. Run replay including the fix migration
4. Verify fix migration passes

## Code Rollback

### Admin Web
```bash
git revert <commit-hash>
npm run build
```

### Mobile App
```bash
git revert <commit-hash>
flutter build apk
```

## Supabase Schema Rollback

**There is no automatic rollback**. Options:
1. Restore from backup (if exists)
2. Create compensating migration
3. Manual SQL fix (with explicit approval)

## Service Role Key Compromise

1. Rotate key in Supabase dashboard immediately
2. Update `.env.local` files
3. Verify no leaked keys in git history: `git log --all -p | grep -i "service_role"`
4. Rebuild and redeploy all apps
