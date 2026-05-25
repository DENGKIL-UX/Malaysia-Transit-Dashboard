---
Task ID: 1
Agent: Main
Task: Fix Serwist + Turbopack build conflict for CF Pages deployment

Work Log:
- Read next.config.ts — found `withSerwist` wrapper injecting webpack plugin
- Identified root cause: Next.js 16 defaults to Turbopack, Serwist webpack plugin conflicts
- Removed `withSerwistInit` import and wrapper from next.config.ts
- Created static `public/sw.js` with runtime caching (no build-time precache dependency):
  - Static assets (_next/static/*) → CacheFirst, 30-day TTL, max 200 entries
  - Internal API (/api/*) → CacheFirst, 7-day TTL, max 50 entries
  - External data.gov.my → StaleWhileRevalidate, 1-day TTL, max 30 entries
  - Navigation → NetworkFirst with offline fallback
  - Online event → auto-reload pages
- Fixed mismatched quote in layout.tsx Geist_Mono import (`'next/font/google"` → `'next/font/google'`)
- Fixed offline-banner.tsx lint error: `useState(false)` + `setIsOffline(!navigator.onLine)` → `useState(() => !navigator.onLine)`
- Added `.open-next` to ESLint ignores
- Lint passes clean
- Pushed commit 8021c71 to GitHub origin/main

Stage Summary:
- Build will no longer fail with Turbopack/webpack conflict
- Service worker works as a static file served from public/ — no webpack plugin needed
- Serwist packages still in dependencies but not used for build-time SW generation
- CF Pages should now deploy successfully

---
Task ID: 2
Agent: Main
Task: Add 6 missing transit fields to entire data pipeline

Work Log:
- Read all 8 target files to understand current data flow
- Modified `use-ridership.ts`: Added ets, intercity, komuterUtara, tebrau, busKuantan, busRpn to RidershipDay interface; added field extraction from API response; fixed total to sum all 13 fields
- Modified `use-analytics.ts`: Added same 6 fields to EnrichedDay interface; added field extraction; fixed total to sum all 13 fields
- Modified `transit-breakdown.tsx`: Updated LineData key type to `keyof RidershipDay`; added 7 new lines (ETS, Intercity, Komuter Utara, Tebrau, Bus KL, Bus Kuantan, Bus Penang); skeleton count 6→13; footer label "Total Rail"→"Total Ridership"
- Modified `kpi-cards.tsx`: Added ETS and KTM Intercity KPI cards; changed label "Total Rail Ridership"→"Total Ridership"; grid updated to `lg:grid-cols-3 xl:grid-cols-6`; skeleton count 4→6
- Modified `comparison-chart.tsx`: Added 5 intercity rail lines (komuter, ets, intercity, komuterUtara, tebrau) to LINES constant (10 total rail lines, buses excluded)
- Modified `export-dropdown.tsx`: Updated CSV headers to include all 13 fields + Total; updated row mapping to include all new fields
- Modified `command-palette.tsx`: Added 7 new transit line entries (ETS, Intercity, Komuter Utara, Tebrau, Bus KL, Bus Kuantan, Bus Penang); added id-to-key mappings
- Modified `page.tsx`: Added 6 missing lines to Transit Coverage list in About section; expanded hero coverage line to show all 13 transit modes
- Lint passes clean with no errors

Stage Summary:
- All 13 ridership_headline fields now flow end-to-end from API → hooks → UI components
- Total ridership now correctly includes all 13 transit lines (rail + bus)
- Transit breakdown shows all 13 lines with proper color coding
- KPI cards expanded to 6 cards (2 new: ETS, KTM Intercity)
- Comparison chart shows 10 rail lines (buses excluded per design)
- CSV export includes all 15 columns (13 lines + date + total)
- Command palette can search all 13 transit lines

---
Task ID: 3
Agent: Main
Task: Add KTMB Mon-Sun daily/weekly chart using ridership_ktmb_daily dataset

Work Log:
- Explored data.gov.my API to understand `ridership_ktmb_daily` dataset structure
  - Fields: date (YYYY-MM-DD), service (ets/intercity/komuter/komuter_utara/shuttle_tebrau), ridership (number)
  - Data available up to 2025-05-25 (very recent, ~1 day lag)
  - Each date has 5 rows (one per service)
- Created API route `src/app/api/ridership-ktmb-daily/route.ts`:
  - Proxies to `https://api.data.gov.my/data-catalogue/?id=ridership_ktmb_daily` with date range
  - 1-hour revalidation cache
- Created hook `src/hooks/use-ktmb-daily.ts`:
  - Fetches 5 weeks of data, pivots by date into KtmbDay interface
  - Each KtmbDay has: date, ets, intercity, komuter, komuterUtara, shuttleTebrau, total, dayOfWeek, dayName
  - Sorts chronologically
- Created component `src/components/dashboard/ktmb-weekly-chart.tsx`:
  - Bar chart showing Mon-Sun daily totals for current week vs previous week
  - Summary stats row: Weekly Total, Daily Avg, vs Prev Week (with trend arrow)
  - Teal gradient bars for current week, muted green for previous week
  - Custom tooltip with day name, date, week range
  - Proper skeleton loading state
  - Matches existing dashboard design system (var() colors, animate-fade-in-up, glassmorphism)
- Integrated into `src/app/page.tsx`: Added KtmbWeeklyChart below the main grid (ridership chart + transit breakdown)
- Lint passes clean, API tested and returns valid data

Stage Summary:
- New data pipeline: API route → hook → chart component for KTMB daily ridership
- Chart shows 7-day (Mon-Sun) comparison between current and previous week
- Data sourced from `ridership_ktmb_daily` (real-time, ~1 day lag) vs headline (monthly audited)
- 3 new files: API route, hook, chart component
