# Bash Commands Reference

This document provides a comprehensive reference for all bash commands available in the workspace.

## 📁 Directory Structure

```
scripts/
├── tools/          # Utility scripts
├── build/          # Build scripts
├── db/             # Database operations
├── dev/            # Development helpers
├── deploy/         # Deployment scripts
└── git/            # Git operations
```

## 🛠️ Utility Scripts (scripts/tools/)

### setup-env.sh
Setup environment variables and virtual environments.

```bash
./scripts/tools/setup-env.sh [dev|staging|prod]
```

**Features:**
- Copies environment file (.env.dev, .env.staging, or .env.prod)
- Creates Python virtual environment if needed
- Installs Node dependencies
- Installs Flutter dependencies
- Installs Admin Web dependencies

**Example:**
```bash
./scripts/tools/setup-env.sh dev
```

---

### clean.sh
Clean build artifacts, cache, and temporary files.

```bash
./scripts/tools/clean.sh [--all|--deep]
```

**Flags:**
- `--all`: Clean node_modules directories
- `--deep`: Clean Docker artifacts and .venv

**Features:**
- Removes Python cache (__pycache__, *.pyc, *.pyo)
- Removes node_modules (with --all)
- Cleans Flutter build artifacts
- Cleans Vite/Next.js build artifacts
- Removes temporary files (*.log, *.tmp, .DS_Store)
- Removes .venv (with --deep)

**Example:**
```bash
./scripts/tools/clean.sh --all
```

---

### format-code.sh
Format code across the workspace.

```bash
./scripts/tools/format-code.sh [--check|--fix]
```

**Flags:**
- `--check`: Check formatting without making changes
- `--fix`: Apply formatting fixes (default)

**Features:**
- Formats Python files (using black)
- Formats JavaScript/TypeScript files
- Formats Flutter/Dart files
- Formats Admin Web files

**Example:**
```bash
./scripts/tools/format-code.sh --check
```

---

### check-deps.sh
Check for outdated dependencies across the workspace.

```bash
./scripts/tools/check-deps.sh
```

**Features:**
- Checks Python dependencies
- Checks root Node dependencies
- Checks Admin Web dependencies
- Checks Mobile App dependencies
- Checks Scraper dependencies

**Example:**
```bash
./scripts/tools/check-deps.sh
```

---

### lint.sh
Run linting across the workspace.

```bash
./scripts/tools/lint.sh [--fix]
```

**Flags:**
- `--check`: Check linting without fixing (default)
- `--fix`: Auto-fix linting issues

**Features:**
- Lints Python files (using pylint or flake8)
- Lints JavaScript/TypeScript files
- Lints Flutter/Dart files
- Lints Admin Web files

**Example:**
```bash
./scripts/tools/lint.sh --fix
```

---

## 🏗️ Build Scripts (scripts/build/)

### build-all.sh
Build all applications in the workspace.

```bash
./scripts/build/build-all.sh [--dev|--prod]
```

**Flags:**
- `--dev`: Build in development mode (default)
- `--prod`: Build in production mode

**Features:**
- Builds Admin Web
- Builds Mobile App
- Builds Scraper

**Example:**
```bash
./scripts/build/build-all.sh --prod
```

---

### build-mobile.sh
Build mobile app for different platforms.

```bash
./scripts/build/build-mobile.sh [android|ios|web] [--debug|--release]
```

**Platforms:**
- `android`: Build Android APK
- `ios`: Build iOS app
- `web`: Build web app

**Flags:**
- `--debug`: Build in debug mode (default)
- `--release`: Build in release mode

**Example:**
```bash
./scripts/build/build-mobile.sh android --release
```

---

## 💾 Database Scripts (scripts/db/)

### backup.sh
Backup Supabase database.

```bash
./scripts/db/backup.sh [database_name] [output_path]
```

**Parameters:**
- `database_name`: Database name (default: lucky_store)
- `output_path`: Output directory (default: backups/)

**Features:**
- Creates timestamped backup
- Compresses backup with gzip
- Keeps only last 7 backups
- Shows backup size

**Example:**
```bash
./scripts/db/backup.sh lucky_store ./backups
```

---

### restore.sh
Restore Supabase database from backup.

```bash
./scripts/db/restore.sh <backup_file>
```

**Parameters:**
- `backup_file`: Path to backup file (.sql or .sql.gz)

**Features:**
- Decompresses .gz files automatically
- Requires confirmation before restore
- Cleans up temporary files

**Example:**
```bash
./scripts/db/restore.sh ./backups/lucky_store_backup_20260501_120000.sql.gz
```

---

### migrate.sh
Run database migrations.

```bash
./scripts/db/migrate.sh [up|down|reset|status]
```

**Actions:**
- `up`: Apply migrations (default)
- `down`: Rollback last migration
- `reset`: Reset database (requires confirmation)
- `status`: Show migration status

**Example:**
```bash
./scripts/db/migrate.sh up
```

---

## 🚀 Development Scripts (scripts/dev/)

### start-all.sh
Start all development servers.

```bash
./scripts/dev/start-all.sh
```

**Features:**
- Starts Supabase local
- Starts Admin Web dev server
- Saves PIDs for stop-all.sh
- Shows instructions for Mobile App

**Example:**
```bash
./scripts/dev/start-all.sh
```

---

### stop-all.sh
Stop all development servers.

```bash
./scripts/dev/stop-all.sh
```

**Features:**
- Stops all servers started by start-all.sh
- Uses saved PIDs from .dev-pids file
- Cleans up PID file

**Example:**
```bash
./scripts/dev/stop-all.sh
```

---

### run-tests.sh
Run all tests across the workspace.

```bash
./scripts/dev/run-tests.sh [--unit|--integration|--e2e] [--watch]
```

**Flags:**
- `--watch`: Run tests in watch mode

**Features:**
- Runs Python tests (pytest)
- Runs JavaScript/TypeScript tests
- Runs Flutter tests
- Runs Admin Web tests

**Example:**
```bash
./scripts/dev/run-tests.sh --watch
```

---

## 🚢 Deployment Scripts (scripts/deploy/)

### deploy-all.sh
Deploy all applications.

```bash
./scripts/deploy/deploy-all.sh [dev|staging|prod]
```

**Environments:**
- `dev`: Development environment (default)
- `staging`: Staging environment
- `prod`: Production environment

**Features:**
- Deploys Admin Web to Vercel
- Deploys Mobile App (manual steps required)
- Deploys Edge Functions

**Example:**
```bash
./scripts/deploy/deploy-all.sh prod
```

---

## 🔄 Git Scripts (scripts/git/)

### git-sync.sh
Git sync operations.

```bash
./scripts/git/git-sync.sh [pull|push|status|sync] [branch]
```

**Actions:**
- `pull`: Pull latest changes from remote
- `push`: Push changes to remote
- `status`: Show git status and recent commits
- `sync`: Pull and push (default)

**Parameters:**
- `branch`: Branch name (default: current branch)

**Example:**
```bash
./scripts/git/git-sync.sh sync main
```

---

## 📝 Quick Reference

### Common Workflows

**Setup new environment:**
```bash
./scripts/tools/setup-env.sh dev
```

**Start development:**
```bash
./scripts/dev/start-all.sh
```

**Run tests:**
```bash
./scripts/dev/run-tests.sh
```

**Format and lint code:**
```bash
./scripts/tools/format-code.sh --fix
./scripts/tools/lint.sh --fix
```

**Build for production:**
```bash
./scripts/build/build-all.sh --prod
```

**Deploy to production:**
```bash
./scripts/deploy/deploy-all.sh prod
```

**Backup database:**
```bash
./scripts/db/backup.sh
```

**Clean workspace:**
```bash
./scripts/tools/clean.sh --all
```

---

## 🔧 Requirements

### Required Tools
- **Supabase CLI**: For database operations
  ```bash
  npm install -g supabase
  ```

- **Python 3**: For Python scripts
  ```bash
  python3 --version
  ```

- **Node.js**: For JavaScript/TypeScript projects
  ```bash
  node --version
  npm --version
  ```

- **Flutter**: For mobile app development
  ```bash
  flutter --version
  ```

### Optional Tools
- **black**: Python code formatter
  ```bash
  pip install black
  ```

- **pylint**: Python linter
  ```bash
  pip install pylint
  ```

- **flake8**: Python linter
  ```bash
  pip install flake8
  ```

---

## 📚 Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Flutter Build Documentation](https://flutter.dev/docs/deployment)
- [Vercel Deployment Guide](https://vercel.com/docs)

---

## 🤝 Contributing

When adding new scripts:
1. Make the script executable: `chmod +x script.sh`
2. Add usage comments at the top
3. Update this README with the new script
4. Test the script before committing

---

## 📄 License

These scripts are part of the Lucky Store project and follow the same license.
