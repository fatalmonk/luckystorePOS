# LuckyStorePOS Operational Risk Clusters

## Cluster 1: Connection/Surface Mismatch
**Failures**: F1 (port mismatch)
**Systems**: Migration replay, local development
**Pattern**: Hardcoded defaults drift from actual runtime configuration
**Impact**: Local development friction, false replay failures
**Recurrence**: High (2/2 recent replay attempts failed for this reason)
**Cluster signature**: `FATAL: Cannot connect to Postgres`

## Cluster 2: Schema-Application Drift
**Failures**: F2 (legacy field), F7 (eval harness stale)
**Systems**: Mobile app, admin web, eval harness, edge functions
**Pattern**: Schema evolves, application code partially updates
**Impact**: Silent data corruption, tool unusability, RPC failure
**Recurrence**: Chronic (47 tracked instances)
**Cluster signature**: `column "X" does not exist` or stale field in payload

## Cluster 3: Security Privilege Entropy
**Failures**: F3 (RLS regression), F4 (orphan privilege), F5 (search path)
**Systems**: Supabase backend, governance pipeline
**Pattern**: Security hardening creates cascading fixes
**Impact**: Confusing audit state, potential over/under-privilege, injection vulnerability
**Recurrence**: Chronic (6 fix migrations, 140+ orphan entries)
**Cluster signature**: `permission denied`, `SECURITY DEFINER` without `search_path`

## Cluster 4: Sync Integrity Uncertainty
**Failures**: F6 (queue schema drift), F8 (duplicate replay)
**Systems**: Mobile offline sync, server replay
**Pattern**: Replay infrastructure exists but operational proof incomplete
**Impact**: Potential data loss, financial impact, operational stop
**Recurrence**: Unknown (unverified)
**Cluster signature**: Duplicate effects, queue loss, silent sync failures
