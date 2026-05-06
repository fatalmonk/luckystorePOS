<div align="center">

# 🏪 Lucky Store POS

**A modern Point of Sale system designed for retail businesses in Bangladesh**

[![Flutter](https://img.shields.io/badge/Flutter-02569B?style=flat-square&logo=flutter&logoColor=white)](https://flutter.dev)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.io)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

[🚀 Live Demo](https://lucky-store-pos-six.vercel.app/) • [📱 Download APK](https://github.com/fatalmonk/luckystorePOS/releases) • [📖 Docs](docs/)

</div>

---

## ✨ Features

<details open>
<summary><b>📱 Mobile App (Flutter)</b></summary>

<br>

| Feature | Description |
|---------|-------------|
| 🛒 **Sales Management** | Process transactions with cash, card & mobile payments |
| 📦 **Inventory Tracking** | Real-time stock with low stock alerts & CSV bulk import |
| 👥 **Customer Management** | Build profiles, track purchase history & loyalty |
| 🏷️ **Label Printing** | Print price labels with MRP using MHT-P29L Bluetooth printer |
| 📡 **Barcode Scanning** | Quick product lookup via camera scan |
| 🌐 **Offline Support** | Works without internet, syncs when connected |
| 🗺️ **Google Maps** | Address selection for deliveries |

</details>

<details>
<summary><b>💻 Admin Dashboard (React + Vite)</b></summary>

<br>

- 📊 Sales analytics & dashboard
- 📝 Product management
- 📒 Customer & supplier ledgers
- 📈 Sales history & reports
- 🛍️ Purchase entry
- 💰 Expense tracking

</details>

---

## 🚀 Quick Start

### Prerequisites

```bash
# Flutter SDK
flutter --version  # >= 3.0.0

# Node.js
node --version     # >= 18.0.0

# Supabase CLI
supabase --version # >= 1.0.0
```

### 📱 Mobile App

```bash
cd apps/mobile_app
flutter pub get
flutter run
```

### 💻 Admin Web

```bash
cd apps/admin_web
npm install
npm run dev
```

### 🗄️ Supabase Local

```bash
supabase start
supabase db reset
```

---

## 📁 Project Structure

```
Lucky Store/
├── 📱 apps/
│   ├── 📲 mobile_app/          # Flutter POS app
│   ├── 💻 admin_web/           # React admin dashboard
│   └── 🔍 scraper/             # Product data scraper
├── 🌐 landing-page/           # Public website
├── 🗄️ supabase/               # Database & Edge Functions
├── 📖 docs/                   # Documentation
└── 📊 data/                   # Inventory CSVs & assets
```

---

## 🔧 Environment Setup

```bash
# Root environment
cp .env.example .env

# Mobile app environment
cp apps/mobile_app/.env.example apps/mobile_app/.env

# Admin web uses root .env or Vercel env vars
```

<details>
<summary>🔐 Required Environment Variables</summary>

<br>

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Public API key for Supabase |
| `GOOGLE_MAPS_API_KEY` | For address autocomplete |
| `SSLCOMMERZ_STORE_ID` | Payment gateway credentials |

</details>

---

## 🔌 Integrations

<div align="center">

| Service | Purpose |
|---------|---------|
| <img src="https://seeklogo.com/images/S/supabase-logo-DCC676FFE2-seeklogo.com.png" width="20"> **Supabase** | Database, Auth, Edge Functions, Real-time |
| <img src="https://developers.google.com/static/maps/images/maps-icon_1x.png" width="20"> **Google Maps** | Address selection for deliveries |
| 💳 **SSLCommerz** | Payment gateway (cards, mobile banking) |
| 🖨️ **MHT-P29L Printer** | Bluetooth thermal label printer |

</div>

---

## 🖨️ Hardware Support

### MHT-P29L Label Printer

- ✅ Bluetooth connection via `flutter_blue_plus`
- ✅ TSPL command format
- ✅ Code128 barcode support
- ✅ MRP with strikethrough pricing
- ✅ 40x30mm label size

---

## 🚀 Deployment

### Landing Page (Vercel)

```bash
vercel --prod
```

**Live URL:** [https://lucky-store-pos-six.vercel.app/](https://lucky-store-pos-six.vercel.app/)

### APK Distribution

Download from [GitHub Releases](https://github.com/fatalmonk/luckystorePOS/releases)

---

## 📊 Database Schema

```sql
-- Core Tables
products               -- Inventory items with MRP/stock
sales                  -- Transaction records
customers              -- Customer profiles
inventory_adjustments  -- Stock movements
tenant_isolation       -- Multi-tenant support
```

See [`supabase/migrations/`](supabase/migrations/) for full schema.

---

## 🤝 Contributing

1. 🍴 Fork the repository
2. 🌿 Create feature branch: `git checkout -b feature/amazing-feature`
3. 💾 Commit changes: `git commit -m 'feat: Add amazing feature'`
4. 📤 Push to branch: `git push origin feature/amazing-feature`
5. 🔁 Open a Pull Request

See [BRANCH_STRATEGY.md](docs/root-docs/BRANCH_STRATEGY.md) for detailed workflow.

---

## 📞 Contact

<div align="center">

📧 **Email:** [luckystore.1947@gmail.com](mailto:luckystore.1947@gmail.com)

📱 **Phone:** 01731944544

📍 **Address:** 665 Percival Hill Road, Emdad Park, Chawkbazar, Chittagong, Bangladesh

</div>

---

<div align="center">

**Made with ❤️ for retailers in Bangladesh**

© 2024 Lucky Store. All rights reserved.

</div>
