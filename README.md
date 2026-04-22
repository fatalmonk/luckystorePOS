# Lucky Store

Lucky Store monorepo containing the Flutter POS application, scraper utilities, and Supabase backend services.

## Repo structure

- `apps/mobile_app` - Flutter POS and Mobile Application (Vercel web target for POS, plus iOS/Android targets)
- `apps/scraper` - Scraping utilities
- `data/` - Datasets (competitors, inventory samples)
- `scripts/` - Automation scripts and one-off database/data tools (`deploy`, `ops`, `db`, `data`, `tools`, etc.)
- `supabase/` - Supabase Edge Functions and migrations
- `docs/` - Project documentation index ([docs/README.md](./docs/README.md))
- `archive/` - Deprecated codebases, including the legacy React frontend and imyport tools

## Local setup

1. Make sure Flutter is installed.
2. Fetch dependencies for the mobile app:

```bash
cd apps/mobile_app
flutter pub get
```

3. Configure environment variables.
   Create an `.env` file in `apps/mobile_app` with the required Supabase credentials (e.g., `SUPABASE_URL`, `SUPABASE_ANON_KEY`).
4. Run the app locally:

```bash
# To run on web (Chrome)
flutter run -d chrome

# To run on an emulator/device
flutter run
```

## Deploy POS Web to Vercel

This repo is configured to build and deploy `apps/mobile_app` to Vercel as a compiled web application. The `vercel.json` within `apps/mobile_app` handles the Flutter installation and web build process.

In your Vercel project settings, set the root directory to `apps/mobile_app` and configure any necessary environment variables.

Then you can connect the GitHub repo in Vercel for automatic deployments, or deploy via CLI from `apps/mobile_app`.
