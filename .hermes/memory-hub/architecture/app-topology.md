# LuckyStorePOS Application Topology

## Topology Overview

LuckyStorePOS consists of three main applications with distinct roles, deployment targets, and operational characteristics.

## Application Graph

```
                    ┌─────────────────┐
                    │   Supabase      │
                    │   (Backend)     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Mobile POS  │ │  Admin Web   │ │   Scraper    │
    │   (Flutter)  │ │  (React)     │ │   (Node)     │
    └──────────────┘ └──────────────┘ └──────────────┘
         │                │                │
         │                │                │
         ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  Device  │    │  Browser │    │  Cron/   │
   │  (APK)   │    │ (Vercel) │    │  Manual  │
   └──────────┘    └──────────┘    └──────────┘
```

## Application Details

### 1. Mobile POS Application

**Type**: Native Mobile Application
**Framework**: Flutter
**Language**: Dart
**Deployment**: APK distribution
**Runtime**: Physical Android devices

**Purpose**: In-store point-of-sale operations

**Key Features**:
- Sales transaction processing
- Inventory lookup and management
- Barcode scanning
- Customer management
- Label printing (Bluetooth)
- Offline operation support
- Data synchronization

**Architecture**:
```
apps/mobile_app/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── core/                     # Core functionality
│   │   ├── config/               # Configuration
│   │   └── theme/               # Theming
│   ├── features/                # Feature modules
│   │   ├── auth/                # Authentication
│   │   ├── sales/               # Sales processing
│   │   ├── checkout/            # Checkout flow
│   │   ├── cashier/            # Cashier operations
│   │   ├── print/               # Label printing
│   │   ├── pos/                 # POS operations
│   │   ├── reconciliation/      # Data reconciliation
│   │   └── safety/              # Safety features
│   ├── offline/                 # Offline support
│   │   ├── queue/               # Operation queue
│   │   └── storage/             # Local storage
│   ├── sync/                    # Synchronization
│   │   └── engine/              # Sync engine
│   ├── telemetry/               # Telemetry
│   │   └── collector/          # Data collection
│   ├── models/                  # Data models
│   ├── shared/                  # Shared utilities
│   └── widgets/                 # UI widgets
├── pubspec.yaml                 # Dependencies
└── android/                     # Android configuration
```

**Data Flow**:
```
User Input → Feature Logic → Offline Queue → Sync Engine → Supabase
     ↓              ↓              ↓              ↓           ↓
  UI Screen   Business Logic  Local DB    Conflict Res.  RPC Call
```

**Dependencies**:
- Supabase Dart SDK
- Flutter Bluetooth (for printing)
- Camera/Barcode scanner plugins
- SQLite (local database)
- Connectivity plugins

**Operational Characteristics**:
- **Offline Capable**: Yes (local SQLite + queue)
- **Real-time**: Partial (sync on connectivity)
- **Critical Path**: Sales → Sync → Supabase
- **Failure Mode**: Queue operations, sync later

### 2. Admin Web Application

**Type**: Web Application
**Framework**: React + Vite
**Language**: TypeScript
**Deployment**: Vercel
**Runtime**: Web browsers

**Purpose**: Business management and analytics

**Key Features**:
- Dashboard analytics
- Product management
- Inventory control
- Sales history and analysis
- Purchase and expense tracking
- Customer/supplier ledgers
- Reports generation
- System configuration

**Architecture**:
```
apps/admin_web/
├── src/
│   ├── main.tsx                 # App entry point
│   ├── app/                     # App layout
│   ├── components/              # Reusable components
│   ├── features/                # Feature modules
│   │   ├── dashboard/           # Analytics dashboard
│   │   ├── products/            # Product management
│   │   ├── inventory/          # Inventory control
│   │   ├── sales/               # Sales history
│   │   ├── purchase/           # Purchase entry
│   │   ├── expenses/           # Expense tracking
│   │   ├── finance/            # Financial reports
│   │   ├── collections/        # Collections management
│   │   ├── reminders/          # Reminders system
│   │   ├── reports/            # Report generation
│   │   ├── settings/           # System settings
│   │   ├── oauth/              # OAuth integration
│   │   ├── pos/                # POS management
│   │   └── system/             # System monitoring
│   ├── lib/                     # Shared utilities
│   │   ├── supabase/            # Supabase client
│   │   └── database.types.ts   # Generated types
│   ├── services/                # API services
│   ├── hooks/                   # React hooks
│   ├── layouts/                 # Page layouts
│   ├── routes/                  # Route definitions
│   ├── schemas/                 # Validation schemas
│   ├── styles/                  # Global styles
│   ├── theme/                   # Theme configuration
│   ├── types/                   # TypeScript types
│   └── sw/                      # Service worker
├── package.json                 # Dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json                # TypeScript config
└── index.html                   # HTML entry
```

**Data Flow**:
```
User Action → Feature Component → Service Hook → RPC Call → Supabase
     ↓              ↓                  ↓            ↓          ↓
  UI Event   State Management   Data Fetch  Validation  Query
```

**Dependencies**:
- Supabase JS SDK
- React Query (data fetching)
- React Router (routing)
- Zod (validation)
- Tailwind CSS (styling)
- Recharts (charts)

**Operational Characteristics**:
- **Offline Capable**: Partial (service worker cache)
- **Real-time**: Yes (Supabase subscriptions)
- **Critical Path**: User Action → RPC → Response
- **Failure Mode**: Error display, retry mechanism

### 3. Scraper Application

**Type**: Command-line Tool
**Framework**: Node.js
**Language**: JavaScript
**Deployment**: Manual execution
**Runtime**: Local or CI

**Purpose**: Competitor data collection

**Key Features**:
- Web scraping
- Data extraction
- Data normalization
- Database import

**Architecture**:
```
apps/scraper/
├── scrape-shwapno.js            # Main scraper
└── package.json                 # Dependencies
```

**Data Flow**:
```
Web Page → Scraper → Normalize → Import → Supabase
    ↓         ↓          ↓          ↓         ↓
  HTML    Parse     Transform   Validate   Insert
```

**Dependencies**:
- Cheerio (HTML parsing)
- Axios (HTTP requests)
- Supabase JS SDK

**Operational Characteristics**:
- **Offline Capable**: No
- **Real-time**: No
- **Critical Path**: Scrape → Import
- **Failure Mode**: Log error, retry manually

## Application Interactions

### Mobile POS ↔ Admin Web
**Interaction**: Indirect through Supabase
**Data Sharing**: Sales data, inventory, customers
**Sync**: Real-time via Supabase subscriptions
**Conflict**: None (read-only from admin perspective)

### Mobile POS ↔ Scraper
**Interaction**: None
**Data Sharing**: None
**Sync**: N/A
**Conflict**: N/A

### Admin Web ↔ Scraper
**Interaction**: Indirect through Supabase
**Data Sharing**: Competitor product data
**Sync**: Manual (scraper runs independently)
**Conflict**: None (scraper writes to separate tables)

### All Apps ↔ Supabase
**Interaction**: Direct API calls
**Data Sharing**: All operational data
**Sync**: Real-time (subscriptions) + batch (sync)
**Conflict**: Handled by sync engine (mobile) and RLS (admin)

## Deployment Topology

### Development Environment
```
Local Machine
├── Mobile POS: Flutter dev server
├── Admin Web: Vite dev server
├── Supabase: Docker stack
└── Scraper: Node.js execution
```

### Staging Environment
```
Remote Supabase (STAGING)
├── Mobile POS: APK pointing to staging
├── Admin Web: Vercel preview
└── Scraper: Manual execution
```

### Production Environment
```
Remote Supabase (PRODUCTION)
├── Mobile POS: APK pointing to production
├── Admin Web: Vercel production
└── Scraper: Scheduled execution
```

## Runtime Characteristics

### Mobile POS
- **Startup Time**: 2-3 seconds
- **Memory Usage**: 100-200 MB
- **Battery Impact**: Moderate (Bluetooth, camera)
- **Network Usage**: Low (batch sync)
- **Storage Usage**: 50-100 MB (local DB)

### Admin Web
- **Load Time**: 1-2 seconds
- **Memory Usage**: 50-100 MB
- **Network Usage**: Moderate (real-time subscriptions)
- **Storage Usage**: Minimal (browser cache)

### Scraper
- **Execution Time**: 5-10 minutes
- **Memory Usage**: 50-100 MB
- **Network Usage**: High (web scraping)
- **Storage Usage**: Minimal

## Failure Modes

### Mobile POS Failures
- **Network Down**: Queue operations, sync later
- **Supabase Down**: Queue operations, retry with backoff
- **Bluetooth Failure**: Show error, fallback to alternative
- **Camera Failure**: Show error, fallback to manual entry
- **Local DB Corruption**: Re-sync from Supabase

### Admin Web Failures
- **Network Down**: Show cached data, retry on reconnect
- **Supabase Down**: Show error, retry with backoff
- **RPC Failure**: Show error, fallback to alternative query
- **Subscription Failure**: Poll instead of subscribe

### Scraper Failures
- **Network Down**: Log error, retry later
- **Website Changes**: Log error, update scraper
- **Rate Limiting**: Wait and retry
- **Data Validation**: Log error, skip invalid records

## Scaling Considerations

### Mobile POS
- **Horizontal Scaling**: N/A (device-bound)
- **Vertical Scaling**: Optimize app performance
- **Data Scaling**: Implement pagination, lazy loading
- **Sync Scaling**: Batch operations, conflict resolution

### Admin Web
- **Horizontal Scaling**: Vercel auto-scaling
- **Vertical Scaling**: Optimize bundle size, caching
- **Data Scaling**: Implement pagination, virtual scrolling
- **Query Scaling**: Optimize RPC functions, add indexes

### Scraper
- **Horizontal Scaling**: Run multiple instances
- **Vertical Scaling**: Optimize scraping logic
- **Data Scaling**: Batch inserts, rate limiting
- **Network Scaling**: Respect rate limits, use proxies

## Monitoring

### Mobile POS
- **Metrics**: Sync success rate, queue depth, error rate
- **Logging**: Telemetry events, error logs
- **Alerting**: Sync failures, queue overflow

### Admin Web
- **Metrics**: Page load time, RPC latency, error rate
- **Logging**: User actions, error logs
- **Alerting**: High error rate, slow queries

### Scraper
- **Metrics**: Execution time, records scraped, error rate
- **Logging**: Scraping progress, error logs
- **Alerting**: Scraping failures, data quality issues