# LuckyStorePOS Controlled Assistance Gates

## Current Gate: Phase 9 (READ-ONLY)

Hermes is currently operating in read-only operational cognition mode.

## Allowed Prompts

These prompts are SAFE and will be executed:

- "Review replay determinism risks" -> Read-only analysis report
- "Analyze migration ordering stability" -> Read-only dependency analysis
- "Identify sync divergence risks" -> Read-only operational report
- "Generate failure lineage for [specific system]" -> Read-only debugging cognition
- "Summarize governance baseline state" -> Read-only summary
- "What is the current operational risk profile?" -> Read-only risk map

## Prohibited Actions

These actions require EXPLICIT APPROVAL before execution:

- Refactor any code in protected zones
- Edit migration files
- Run `supabase db reset`, `supabase db push`, or `supabase migration repair`
- Modify governance baseline
- Change replay engine logic
- Update sync engine behavior
- Commit or push to git
- Run eval harness against production data
- Modify RLS policies
- Change RPC function signatures

## Gate Criteria for Advancement

To advance beyond read-only mode:

1. All CRITICAL replay capabilities must be PROVEN (SOPs executed)
2. Legacy field migration must be complete (0 instances in baseline)
3. Governance baseline must be current and clean
4. User must explicitly request coding assistance
5. User must specify which non-protected zones to modify

## Protected Zone Interaction Rules

Even with general coding approval, protected zones require:
- Individual explicit approval per zone
- Verification run after change
- Rollback plan documented
