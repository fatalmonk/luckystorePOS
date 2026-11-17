# Scripts Directory

Canonical script groups:

- `scripts/tools/` - utility scripts (setup, clean, format, lint, check-deps)
- `scripts/build/` - build scripts (build-all, build-mobile)
- `scripts/dev/` - development helpers (start-all, stop-all, run-tests)
- `scripts/deploy/` - Hostinger packaging/deployment scripts and legacy helpers
- `scripts/git/` - git operations (git-sync)
- `scripts/test/` - test scripts
- `scripts/ops/` - operational data scripts
- `scripts/receipts/` - receipt validation and reconciliation; see [receipt tooling memory](receipts/README.md) for the opt-in local TypeSafe memory helper
- `scripts/db/` - SQL setup/migration snippets (backup, restore, migrate)
- `scripts/data/` - data preparation helpers
- `docs/runbooks/` - script/import runbooks (moved from `scripts/docs/`)

## Quick Start

See [COMMANDS.md](COMMANDS.md) for the tracked helper reference and current
validation notes.

The shell helpers are a mixed set of current and legacy scripts. Check
`bash -n path/to/script.sh` before running one; the command reference records
helpers that currently fail syntax validation. Do not use them as a substitute
for the guarded production workflows.

### Common Commands

```bash
# Setup environment (requires a locally created .env.dev)
./scripts/tools/setup-env.sh dev

# Start all dev servers
./scripts/dev/start-all.sh

# Run tests
./scripts/dev/run-tests.sh

# Build all apps
./scripts/build/build-all.sh --prod

# Deploy customer storefront production
# Use the guarded GitHub Actions workflow; do not run deploy-all.sh prod.
# See ../DEPLOYMENT.md and .github/workflows/storefront-hostinger.yml.

# Backup database
./scripts/db/backup.sh

# Clean workspace
./scripts/tools/clean.sh --all
```

## Usage

Use the paths above directly. The repository scraper entry point is `npm run scrape`; competitor research and acceptance remain separate from storefront catalog writes.

All bash scripts are executable and can be run directly from the workspace root.
