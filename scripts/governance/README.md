# Governance Enforcement

This directory contains deterministic governance enforcement for migration replay and runtime boundary drift.

Primary entrypoint:

- `node scripts/governance/enforce-governance.cjs`

The enforcement model is regression-based:

- current known debt is baselined in `baseline.json`
- CI fails on new missing `search_path` coverage for `SECURITY DEFINER`
- CI fails on new orphan `GRANT/REVOKE` findings
- CI fails on new forward migration dependencies
- CI fails on new legacy runtime field hits in canonical runtime paths
- CI fails if governance artifact generation is nondeterministic across two runs
