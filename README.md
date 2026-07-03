<p align="center">
  <img src="public/logo.svg" alt="RapidStats MY Logo" width="80" height="80" />
</p>

<h1 align="center">RapidStats MY</h1>

<p align="center">
  <strong>Daily ridership analytics for Malaysia's 14 public transit services</strong>
</p>

<p align="center">
  <a href="https://malaysia-transit-dashboard.ritz-analytics.workers.dev" target="_blank">
    <img src="https://img.shields.io/badge/Live-Dashboard-85AB8B?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Live Dashboard" />
  </a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Pages" />
  <img src="https://img.shields.io/badge/License-CC--BY_4.0-4C1?style=flat-square" alt="Data License" />
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#live-demo">Live Demo</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="#data-sources">Data Sources</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#local-development">Local Development</a> &bull;
  <a href="#deployment">Deployment</a>
</p>

---

## Overview

RapidStats MY is a stateless, serverless dashboard that tracks **daily ridership across all 14 Malaysian public transit services** — 10 rail lines and 4 bus networks — sourced entirely from the [DOSM Open Data Portal](https://data.gov.my).

The dashboard features real-time anomaly detection, period comparison tools, seasonal heatmaps, weather-aware insights, and a cinematic landing experience — all deployed on **Cloudflare Pages Free Tier** with zero database and zero API keys.

### Transit Services Covered

| Rail (10) | Bus (4) |
|-----------|---------|
| MRT Kajang Line | RapidKL Bus |
| MRT Putrajaya Line | Rapid Penang Bus |
| LRT Kelana Jaya Line | Rapid Kuantan Bus |
| LRT Ampang Line | |
| Monorail KL | |
| KTM ETS | |
| KTM Komuter Utara/Selatan | |
| KTM Intercity | |
| BRT Sunway Line | |

---

## Features

### Dashboard
- **6 KPI Cards** with inline SVG sparklines (7-day cubic-bezier curves) and day-over-day delta badges
- **30-Day Stacked Area Chart** for all 10 rail services with paginated windows, zoom (Recharts Brush), and per-group legends
- **14-Service Breakdown List** with trend arrows, horizontal bar fills, and cross-chart highlight syncing
- **Data Status Bar** showing freshest date, source badges, and 3-pipeline freshness indicators

### Analytics
- **Period Comparison** — side-by-side bar chart for any two dates with holiday markers and data availability
- **Day-Type Analytics** — week-over-week KTMB breakdown with reference lines and week navigation
- **Seasonality Heatmap** — month &times; day-type matrix (weekday / Friday / weekend / holiday) with average ridership and deviation tooltips
- **Mode Share Trend** — monthly stacked area chart showing rail service mode share evolution
- **Weekly Charts** — separate weekly views for KTMB and Prasarana
- **Busiest Stations** — top-20 stations by passenger count with daily series (Rapid Rail + KTMB)
- **Top Routes** — top-20 origin&rarr;destination pairs for both Rapid Rail and KTMB
- **Growth Rankings** — YoY growth rate comparison across all 14 services

### Data Intelligence
- **Z-Score Anomaly Detection** — 30-day rolling window, >2&sigma; = warning, >3&sigma; = critical
- **Linear Regression Trend** — 14-day window classifying up / down / stable
- **Exponential Smoothing Forecast** — 3-day ahead prediction with confidence intervals
- **Weekly Pattern Mining** — peak/low day of week, weekend/weekday ratio
- **Holiday-Aware Freshness** — cuti ganti detection, blackout day awareness, expected lag computation

### Weather Integration
- **5-Day Weather Forecast** from MET Malaysia (lazy-loaded via IntersectionObserver)
- **Environment Alerts** — weather warnings, flood warnings, earthquake alerts with transit-relevance filtering

### UX & Design
- **Cinematic Landing Page** — full-screen MP4 video hero, ambient glow orbs, scanline effect, Framer Motion entrance animations
- **Command Palette** (`Cmd+K`) — search transit lines, jump to dates, navigate sections
- **Export** — CSV and PNG (via html2canvas)
- **PWA** — installable on Chrome Android with custom A2HS prompt, offline banner
- **Theme Toggle** — light / dark / system with localStorage persistence
- **Font Size** — S / M / L
- **Auto-Refresh** — polls every 5 minutes, shows toast when new data arrives
- **Scroll Progress Bar** — 3px viewport-top indicator
- **Mobile Responsive** — slide-out drawer nav, touch-friendly 44px targets, responsive grid

---

## Live Demo

**[malaysia-transit-dashboard.ritz-analytics.workers.dev](https://malaysia-transit-dashboard.ritz-analytics.workers.dev)**

> Data licensed under [CC-BY 4.0](https://data.gov.my) from the Department of Statistics Malaysia (DOSM).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| UI | [React 19](https://react.dev) |
| Language | [TypeScript 5](https://typescriptlang.org) (strict) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (New York, 46 primitives) |
| Icons | [Lucide React](https://lucide.dev) |
| Charts | [Recharts 2.15](https://recharts.org) |
| State | [Zustand 5](https://zustand-demo.pmnd.rs) |
| Animations | [Framer Motion 12](https://www.framer.com/motion/) |
| Theming | [next-themes](https://github.com/pacocoursey/next-themes) (class-based, default dark) |
| Dates | [date-fns 4](https://date-fns.org) |
| Tables | [TanStack React Table 8](https://tanstack.com/table) |
| Primitives | 18 [Radix UI](https://www.radix-ui.com) components, cmdk, vaul, sonner |
| Deployment | [Cloudflare Pages](https://pages.cloudflare.com) via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) |
| Runtime | [Bun](https://bun.sh) |
| Target | ES2017 (Cloudflare Workers compatible) |

---

## Data Sources

All data is sourced from **public, free, API-key-free** endpoints.

### External APIs (Runtime)

| API | Purpose | Latency |
|-----|---------|---------|
| [data.gov.my Catalogue API](https://api.data.gov.my/data-catalogue) | Headline ridership (14 services), KTMB daily | T-1 to T-26 |
| [data.gov.my Storage](https://storage.data.gov.my) | Parquet files (Prasarana, KTMB timeseries) | Build-time only |
| [datagovmy-meta](https://github.com/data-gov-my/datagovmy-meta) | Dataset metadata (last_updated, next_update) | Real-time |
| [Nager.Date](https://date.nager.at) | Malaysian public holiday dates | Real-time |
| [MyCal API](https://mycal-api.huijun00100101.workers.dev) | Islamic holiday estimates | Build-time |
| [MET Malaysia](https://met.gov.my) | 5-day weather forecasts | Real-time |
| Malaysia Environment APIs | Weather / flood / earthquake warnings | Real-time |

### Static JSON Files (pre-processed, in `public/`)

| File | Refresh Cycle | Content |
|------|--------------|---------|
| `headline-recent.json` | Monthly | All 14 services, 2024+ (audited) |
| `headline-daily.json` | Monthly | Daily headline subset |
| `ktmb-daily.json` | Daily | 5 KTMB rail services daily totals |
| `prasarana-daily.json` | Daily | 5 Rapid Rail + BRT daily totals |
| `prasarana-daily-totals.json` | Daily | Per-line Prasarana breakdown |
| `ktmb-stations.json` | Daily | Top-20 KTMB stations + daily series |
| `prasarana-stations.json` | Daily | Top-20 Prasarana stations + daily series |
| `ktmb-routes.json` | Daily | Top-20 KTMB O-D routes |
| `prasarana-routes.json` | Daily | Top-20 Prasarana O-D routes |
| `holidays-{year}.json` | Build-time | Pre-classified holiday data (3 years) |

### 3-Tier Data Pipeline

```
  Tier 1 (Live, T-1 to T-3)          Tier 2 (Monthly, ~T-26)
  ┌─────────────────────┐            ┌──────────────────────┐
  │ KTMB OD  (5 rails)  │──┐         │ Headline (14 services)│
  │ API proxy runtime   │  │         │ Live API + static    │
  └─────────────────────┘  │         └──────────────────────┘
                           ├─── Merge ───▶ Dashboard
  ┌─────────────────────┐  │
  │ Prasarana OD (6 svc) │──┘
  │ Static JSON daily   │
  └─────────────────────┘
```

### Automated Refresh

| Schedule | Action | Trigger |
|----------|--------|---------|
| **Daily 06:15 MYT** | `process_parquet.py` &rarr; regenerate all daily JSONs | GitHub Actions cron |
| **Monthly 12th** | `refresh-headline.js` &rarr; fetch headline from live API | GitHub Actions cron |
| **Every 5 min** | `useDataMetadata` polls `/api/metadata` for freshest date change | Client-side singleton |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Cloudflare Pages                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Next.js 16 (OpenNext)                  │  │
│  │  ┌──────────┐  ┌───────────┐  ┌────────────────┐  │  │
│  │  │ Landing  │  │ Dashboard │  │   Analytics    │  │  │
│  │  │  Page    │→ │  Section  │→ │   Section      │  │  │
│  │  └──────────┘  └───────────┘  └────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │           8 API Routes                       │  │  │
│  │  │  /api/ridership  /api/comparison-data        │  │  │
│  │  │  /api/metadata    /api/notifications          │  │  │
│  │  │  /api/holidays    /api/weather-forecast       │  │  │
│  │  │  /api/environment-alerts  /api/mcp            │  │  │
│  │  └──────────┬───────────────────────────────────┘  │  │
│  └─────────────┼──────────────────────────────────────┘  │
│                │                                          │
│  ┌─────────────▼──────────────────────────────────────┐  │
│  │         Static JSON (public/*.json)                 │  │
│  │    + 5-min stale-while-revalidate cache            │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │    data.gov.my APIs         │
        │  (DOSM Open Data Portal)    │
        └─────────────────────────────┘
```

### Key Design Decisions

- **No database** — fully stateless, static-JSON-backed. Simplifies deployment and eliminates cold-start DB overhead on CF Free Tier.
- **No API keys** — all external data sources are public and free.
- **3-pipeline merge at API edge** — `/api/comparison-data` merges Tier 1 live data with Tier 2 headline data at request time, giving users data through ~T-26 without waiting for monthly rebuilds.
- **Runtime extension** — the dashboard always shows data as fresh as the live APIs allow, falling back to static JSON when APIs are slow.
- **CF Free Tier optimized** — cold path ~4-6ms, `nodejs_compat` flag, smart placement in APAC.

---

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Single-page app (dashboard + analytics + about)
│   │   ├── layout.tsx                # Root layout: ThemeProvider, fonts, Toaster, SW
│   │   ├── globals.css               # Dark/light theme vars, animations, scrollbars
│   │   └── api/                      # 8 API routes
│   │       ├── comparison-data/      # 3-tier data merge
│   │       ├── metadata/             # Holiday-aware freshness tracking
│   │       ├── notifications/        # Z-score anomaly + trend + forecast
│   │       ├── ridership/            # Merged KTMB + Prasarana daily
│   │       ├── ridership-ktmb-daily/ # Proxy to data.gov.my KTMB
│   │       ├── holidays/             # 4-tier holiday classification
│   │       ├── weather-forecast/     # MET Malaysia 5-day forecast
│   │       ├── environment-alerts/   # Weather/flood/earthquake warnings
│   │       └── mcp/                  # MCP tool router
│   ├── components/
│   │   ├── dashboard/                # 26 custom components
│   │   └── ui/                       # 46 shadcn/ui primitives
│   ├── hooks/                        # 12 custom hooks
│   └── lib/
│       ├── store.ts                  # Zustand global store
│       ├── utils.ts                  # cn() helper
│       ├── parse-ridership.ts        # Data normalization
│       └── holidays.ts               # Holiday utilities
├── public/
│   ├── hero-bg.mp4                   # Landing page video
│   ├── *.json                        # 12+ static data files
│   ├── sw.js                         # Service worker (pass-through)
│   ├── manifest.json                 # PWA manifest
│   └── _headers                      # Cloudflare cache rules
├── scripts/
│   ├── process_parquet.py            # Daily: parquet → JSON
│   ├── refresh-headline.js           # Monthly: live API → headline JSON
│   └── build-holidays.js             # Build-time: holiday JSON generation
├── open-next.config.ts               # Cloudflare adapter config
├── wrangler.jsonc                    # CF Workers config
└── package.json
```

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh) (latest)
- Git

### Setup

```bash
# Clone
git clone https://github.com/DENGKIL-UX/Malaysia-Transit-Dashboard.git
cd Malaysia-Transit-Dashboard

# Install dependencies
bun install

# Generate holiday data (required before first run)
node scripts/build-holidays.js

# Start dev server
bun run dev
```

The dev server runs on **port 3000** with Turbopack.

### No Configuration Needed

The project requires **zero API keys and zero environment variables** for local development. All data sources are public. Static JSON files in `public/` provide offline-capable data, with live API calls extending the data range at runtime.

---

## Deployment

### Cloudflare Pages (Production)

```bash
# Build holidays first, then build + deploy
node scripts/build-holidays.js && npx opennextjs-cloudflare build && npx wrangler deploy
```

The project is optimized for **Cloudflare Free Tier**:
- Cold path: ~4-6ms
- Smart placement: APAC
- `nodejs_compat` flag for Node.js API compatibility
- Static asset caching via `public/_headers` (1-year immutable for `/_next/static/*`, 5-min stale-while-revalidate for data JSONs)

### Automated Data Refresh (GitHub Actions)

| Schedule | Script | Output |
|----------|--------|--------|
| Daily 06:15 MYT (22:15 UTC) | `scripts/process_parquet.py` | All daily JSON files |
| Monthly 12th 06:30 MYT | `scripts/refresh-headline.js` | `headline-recent.json` |

The daily cron auto-commits updated JSON files, triggering a Cloudflare Pages rebuild.

---

## Design System

- **Theme:** Sage-green dark mode (default) with light mode support
- **Dark palette:** `#070e07` base, `#85AB8B` accent, `#336443` headings
- **Light palette:** `#f5f5f0` base, `#3d7a4f` accent
- **Typography:** Geist Sans + Geist Mono
- **Effects:** Glassmorphism (`backdrop-blur`), custom scrollbars, Framer Motion transitions
- **Components:** 46 shadcn/ui primitives (New York style) + 26 custom dashboard components

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/ridership` | GET | Merged KTMB + Prasarana daily ridership (params: `start_date`, `end_date`) |
| `/api/comparison-data` | GET | 3-tier merge: headline + Prasarana + KTMB for comparison view |
| `/api/metadata` | GET | Holiday-aware freshness status for all 3 pipelines |
| `/api/notifications` | GET | Anomaly alerts, trend analysis, 3-day forecast |
| `/api/holidays` | GET | 4-tier holiday classification (national/state/religious/cuti-ganti) |
| `/api/ridership-ktmb-daily` | GET | Proxy to data.gov.my KTMB daily API |
| `/api/weather-forecast` | GET | 5-day MET Malaysia weather forecast |
| `/api/environment-alerts` | GET | Active weather/flood/earthquake warnings |
| `/api/mcp` | POST | MCP tool router (`query_ridership`, `get_metadata`) |

---

## License

- **Application Code:** MIT
- **Data:** [CC-BY 4.0](https://data.gov.my) &mdash; Department of Statistics Malaysia (DOSM)

---

<p align="center">
  Built with <span style="color:#e74c3c;">&#9829;</span> for Malaysian public transit transparency
</p>