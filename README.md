# Lucky Store POS

A modern Point of Sale system designed for retail businesses in Bangladesh.

## Overview

Lucky Store POS is a comprehensive retail management solution that helps small to medium-sized retail stores streamline operations including sales processing, inventory management, customer tracking, and label printing.

## Project Structure

```
Lucky Store/
├── apps/
│   ├── mobile_app/          # Flutter POS app (Android/iOS)
│   │   ├── lib/
│   │   │   ├── features/
│   │   │   │   ├── pos/         # Point of Sale screen
│   │   │   │   ├── inventory/   # Inventory management
│   │   │   │   ├── checkout/    # Checkout & payments
│   │   │   │   └── ...
│   │   │   └── core/
│   │   │       └── services/
│   │   │           └── printer/  # Label printer (MHT-P29L)
│   │   └── ...
│   ├── admin_web/           # React admin dashboard
│   └── scraper/             # Product data scraper
├── landing-page/            # Public website (HTML/CSS)
├── supabase/                # Database & Edge Functions
└── data/                    # Inventory CSVs and assets
```

## Features

### Mobile App (Flutter)
- **Sales Management** - Process transactions with cash/card/mobile payments
- **Inventory Tracking** - Real-time stock with low stock alerts, CSV bulk import
- **Customer Management** - Build profiles, track purchase history
- **Label Printing** - Print price labels with MRP using MHT-P29L Bluetooth printer
- **Barcode Scanning** - Scan products for quick checkout
- **Offline Support** - Works without internet, syncs when connected
- **Google Maps Integration** - Address selection for deliveries

### Admin Web (React + Vite)
- Dashboard with sales analytics
- Product management
- Customer & supplier ledgers
- Sales history & reports
- Purchase entry
- Expense tracking

## Quick Start

### Prerequisites
- Flutter SDK (for mobile app)
- Node.js (for admin web)
- Supabase CLI (for backend)

### Mobile App
```bash
cd apps/mobile_app
flutter pub get
flutter run
```

### Admin Web
```bash
cd apps/admin_web
npm install
npm run dev
```

### Supabase Local Development
```bash
supabase start
supabase db reset  # Applies migrations
```

## Deployment

### Landing Page (Vercel)
```bash
vercel --prod
```
URL: https://lucky-store-pos-six.vercel.app/

### APK Distribution
Download from GitHub Releases: https://github.com/fatalmonk/luckystorePOS/releases

## Environment Setup

Copy the example files and fill in your values:

```bash
# Root
cp .env.example .env

# Mobile app
cp apps/mobile_app/.env.example apps/mobile_app/.env

# Admin web (uses root .env or Vercel env vars)
```

See `.env.example` files for required variables.

## Key Integrations

- **Supabase** - Database, Auth, Edge Functions, Real-time subscriptions
- **Google Maps** - Address selection via WebView + JavaScriptChannel
- **SSLCommerz** - Payment gateway integration
- **MHT-P29L Printer** - Bluetooth thermal label printing with TSPL commands

## Hardware Support

### Label Printer: MHT-P29L
- Bluetooth connection via `flutter_blue_plus`
- TSPL command format for labels
- Supports Code128 barcodes
- MRP with strikethrough pricing
- 40x30mm label size

## Database

PostgreSQL with Supabase. Key tables:
- `products` - Inventory items with MRP/stock
- `sales` - Transaction records
- `customers` - Customer profiles
- `inventory_adjustments` - Stock movements
- `tenant_isolation` - Multi-tenant support

See `supabase/migrations/` for schema details.

## Contact

- **Email:** luckystore.1947@gmail.com
- **Phone:** 01731944544
- **Address:** 665 Percival Hill Road, Emdad Park, Chawkbazar, Chittagong, Bangladesh

## License

Private - Lucky Store © 2024
