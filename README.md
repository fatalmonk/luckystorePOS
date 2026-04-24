# Lucky Store

Lucky Store monorepo containing the Flutter POS application, scraper utilities, and Supabase backend services.

## Repo structure

- `apps/mobile_app` - Flutter POS and mobile application (web + iOS + Android targets)
- `apps/scraper` - Scraping utilities
- `data/` - Datasets (competitors, inventory samples)
- `scripts/` - Automation and ops scripts (`deploy`, `ops`, `db`, `data`, `tools`, etc.)
- `supabase/` - Supabase Edge Functions and migrations
- `docs/` - Project documentation index ([docs/README.md](./docs/README.md))
- `archive/` - Deprecated codebases, including legacy frontend and import tools

## Setup

### 1) Prerequisites

Install the tools needed for your workflow:

- Flutter SDK (for `apps/mobile_app`)
- Node.js + npm (for scripts and JavaScript tooling)
- Supabase CLI (for local DB/functions workflows)

### 2) Install dependencies

```bash
# Mobile app
cd apps/mobile_app
flutter pub get

# Return to repo root for script tooling
cd ../..
npm install
```

### 3) Configure environment variables

1. Copy the template:

```bash
cp .env.example .env
```

2. Fill in real values in `.env` (or app-local `.env` files where required).
3. Do **not** commit `.env` files; only commit template files like `.env.example`.

### 4) Run the POS app locally

```bash
cd apps/mobile_app

# Web (Chrome)
flutter run -d chrome

# Emulator/device
flutter run
```

## Deploy POS Web to Vercel

This repo is configured to build and deploy `apps/mobile_app` to Vercel as a compiled web application. Deployment configuration lives at `/vercel.json` in the repo root, while build commands target `apps/mobile_app`.

In Vercel project settings, keep the root directory and `vercel.json` behavior aligned, and configure required environment variables.

Then connect the GitHub repository for automatic deployments, or deploy via CLI from `apps/mobile_app`.
