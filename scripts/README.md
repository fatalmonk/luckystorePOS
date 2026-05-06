# Scripts Directory

Canonical script groups:

- `scripts/tools/` - utility scripts (setup, clean, format, lint, check-deps)
- `scripts/build/` - build scripts (build-all, build-mobile)
- `scripts/dev/` - development helpers (start-all, stop-all, run-tests)
- `scripts/deploy/` - deployment scripts (deploy-all)
- `scripts/git/` - git operations (git-sync)
- `scripts/test/` - test scripts
- `scripts/ops/` - operational data scripts
- `scripts/db/` - SQL setup/migration snippets (backup, restore, migrate)
- `scripts/data/` - data preparation helpers
- `docs/runbooks/` - script/import runbooks (moved from `scripts/docs/`)

## Quick Start

See [COMMANDS.md](COMMANDS.md) for comprehensive documentation of all bash commands.

### Common Commands

```bash
# Setup environment
./scripts/tools/setup-env.sh dev

# Start all dev servers
./scripts/dev/start-all.sh

# Run tests
./scripts/dev/run-tests.sh

# Build all apps
./scripts/build/build-all.sh --prod

# Deploy to production
./scripts/deploy/deploy-all.sh prod

# Backup database
./scripts/db/backup.sh

# Clean workspace
./scripts/tools/clean.sh --all
```

## Usage

Use the paths above directly (for example `node scripts/ops/import-competitor-data.js`).

All bash scripts are executable and can be run directly from the workspace root.
