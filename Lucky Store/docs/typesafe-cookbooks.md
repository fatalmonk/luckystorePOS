# TypeSafe Cookbooks — Reusable Patterns
Verified source: https://docs.typesafe.ai/cookbooks (primary docs)

## Pattern Index
1. Self-consistency — agreement across repeated noul/choice calls.
2. Batch/parallel — pack questions into one call (12.2x cheaper, 10x faster).
3. Confidence-gated routing — high conf → act; medium → review; low → escalate.
4. Classification / hierarchical — Choice questions over categories.
5. Re-ranking / RAG — retrieve wide, filter per passage (use `skills/typesafe`).
6. Function calling / skill suggestion — structured outputs, typed functions.
7. Guardrails — screen inputs + outputs before expensive actions.
8. Citation check — verify quotes against source document.
9. SDE cascade / date extraction / pre-parsed value — structured extraction.

SDK: `typesafe-sdk` (pip/uv). API: `https://api.typesafe.ai/v1/systemone`.
Agent skill: `claude plugin marketplace add typesafe-ai/skills` → `claude plugin install typesafe@typesafe-ai`.
