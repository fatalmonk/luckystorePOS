# Runbook: Governance Checks

## Running Governance

```bash
cd /Users/ioriimasu/dev/luckystorePOS

# Build artifacts (regenerates from current migrations)
npm run governance:build

# Check against baseline
npm run governance:check
```

## Updating Baseline

**Requires explicit approval**:
```bash
npm run governance:baseline
```
This updates `scripts/governance/baseline.json` with current artifact hashes.

## Interpreting Results

| Check | Pass | Fail |
|---|---|---|
| Artifact existence | All 3 JSON files present | Missing artifact |
| Hash match | Baseline == current | Drift detected |
| Known issues | Listed in baseline | New unlisted issues |

## Current Known Issues (Baseline)

- 6 SECURITY DEFINER functions missing `search_path`
- 85+ orphan function privileges
- 60+ orphan revokes
- 47 legacy runtime field references
- 222 forward dependencies

## When to Update Baseline

- After intentional migration restructure
- After privilege cleanup migration
- After legacy field remediation
- When current drift is accepted as new normal

## When NOT to Update Baseline

- To hide actual problems
- Without code review
- Without documenting why
