# TypeSafe × Flutter — Cookbook Index
Verified source: https://docs.typesafe.ai/cookbooks (primary docs); https://docs.typesafe.ai/primitives.md (Choice/Noul/Score); SDK: https://github.com/typesafe-ai/skills (agent skill); Python SDK docs from quickstart.

This workspace (Lucky Store) uses the Flutter app in `apps/mobile_app/`.
TypeSafe / Jev provides typed decisions (Choice = pick pattern, Score = rate quality, Noul = check constraint) — useful for Flutter architecture decisions.

## Flutter-Relevant Patterns
1. **Confidence-gated routing** → choose Flutter route handler / navigation pattern.
2. **Classification / hierarchical** → classify widget/state architecture (BLoC/Provider/Riverpod/Provider).
3. **Re-ranking** (cookbook: rerank_typesafe) → rank widget libraries / design tokens.
4. **Skill suggestion** (cookbook: skill_suggestion) → match Flutter feature request to skill / component.
5. **Structure recovery / autoformat** → format Flutter widget trees / state shapes.
6. **Self-consistency** → verify Flutter architecture choices repeatably.

## Quick Reference
SDK install: `pip install typesafe-sdk` or `uv add typesafe-sdk`.
Agent skill: `npx skills add typesafe-ai/skills --skill typesafe-ai` (see typesafe-ai skill).
API endpoint: `POST https://api.typesafe.ai/v1/systemone` with `TYPESAFE_API_KEY`.

Three primitives (primary doc: https://docs.typesafe.ai/primitives.md):
- `Choice` — defined options (e.g. "BLoC" vs "Riverpod" vs "Provider").
- `Score` — ordered levels (quality / maintainability / performance).
- `Noul` — binary check (constraint met? constraint violated?).
