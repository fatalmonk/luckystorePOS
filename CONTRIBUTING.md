# Contributing

Thanks for contributing to Lucky Store.

## Development principles

- Keep changes scoped and easy to review.
- Prefer small pull requests with clear intent.
- Avoid committing secrets, credentials, or machine-local config.
- Follow repo formatting defaults from `.editorconfig`.

## Getting started

1. Fork/clone the repository.
2. Create a feature branch from `main`.
3. Copy `.env.example` to `.env` and set local values.
4. Install dependencies for the area you are changing.

```bash
# JavaScript tooling (repo root)
npm install

# Flutter app
cd apps/mobile_app
flutter pub get
```

## Before opening a PR

- Run relevant tests/lint checks for changed areas.
- Verify no secrets are included in diffs.
- Ensure docs/config examples are updated when behavior changes.

Suggested quick checks:

```bash
git status
npm run -s lint || true
```

## Commit and pull request guidance

- Use clear commit messages (`type(scope): summary` is preferred).
- In PR description, include:
  - What changed
  - Why it changed
  - Any migration or setup steps
  - Screenshots for UI updates (when applicable)

## Security and secrets

- Never commit:
  - `.env` files
  - private keys/certificates
  - service-role or production credentials
- If a secret is committed accidentally, rotate it immediately and remove it from git history.
