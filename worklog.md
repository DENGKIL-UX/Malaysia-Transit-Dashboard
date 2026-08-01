---
Task ID: 1
Agent: main
Task: Fix Malaysia Transit Dashboard auto-update — data was stale because static files in public/ only update on Cloudflare rebuild, and GitHub metadata was fetched from local files instead of live

Work Log:
- Explored full data architecture: 8 API routes, 7+ static JSON files, 10+ frontend hooks
- Identified root cause: DOSM OD data (`exclude_openapi: true`) only available as parquet, not via API
- Fetched all 9 DOSM metadata URLs from GitHub to verify live data availability
- Confirmed: OD datasets are NOT available via api.data.gov.my (empty response), but metadata IS live
- Tested preview parquet (3.6KB) — only 50-row sample, not usable for charts
- Full parquet is 2.75MB — too large for CF Worker runtime processing
- Found existing GitHub Actions workflow (`.github/workflows/refresh-data.yml`) that should handle this

Changes made:
1. **Created `/api/dosm-meta/route.ts`** — Live metadata proxy fetching all 9 DOSM datasets from GitHub raw URLs, 1-hour in-memory cache
2. **Updated `/api/metadata/route.ts`**:
   - DOSM OD metadata now fetched LIVE from GitHub (was reading stale static file)
   - KTMB freshness now fetched LIVE from api.data.gov.my API (was reading stale static file)
   - Headline API URL fixed with trailing slash (301 redirect was failing)
3. **Updated `/api/comparison-data/route.ts`**:
   - Fixed headline API URL with trailing slash
   - Fixed KTMB API URL with trailing slash
4. **Updated `/api/notifications/route.ts`**:
   - KTMB data now fetched LIVE from api.data.gov.my API with long→wide pivot
   - Falls back to static file if API fails
5. **Updated `src/hooks/use-prasarana-daily.ts`**:
   - Now fetches from `/api/comparison-data` (merged live data) instead of static `/prasarana-daily.json`
   - Falls back to static file if API fails
6. **Updated `.github/workflows/refresh-data.yml`**:
   - Changed from daily to every 6 hours (4 cron schedules)
   - Added CI-aware force re-download to parquet processor
   - Added live metadata logging step
   - Added force commit option for manual triggers
   - Better error handling with continue-on-error for old processor
7. **Updated `mini-services/dosm-sync/process_od_parquet.py`**:
   - CI-aware download: always re-downloads in GitHub Actions (CI=true), skips locally
   - No more stale parquet caching in CI

Stage Summary:
- Before: Freshest date showed "2026-07-02 (KTMB OD · 4d ago)" — all from stale static files
- After: Freshest date shows "2026-07-04 (KTMB OD · 1d ago, fresh)" — metadata LIVE from GitHub, KTMB LIVE from API
- Key fix: The freshness indicator is now accurate because metadata is fetched at runtime from GitHub
- Chart data gap: DOSM OD per-line data (Rapid Rail + BRT) still comes from static files updated by GitHub Actions every 6 hours — this is the correct architecture since parquet data is too large for runtime and not available via API
- GitHub Actions workflow improved to run 4x daily with force re-download in CI

---
Task ID: 2
Agent: main
Task: Fix stale chart data — create build-time DOSM parquet processing so every Cloudflare deploy includes fresh data

Work Log:
- Confirmed production API returns Prasarana data only through 2026-07-02 (2 days behind live)
- Tested all possible Prasarana API endpoints on data.gov.my — ALL return 404 (exclude_openapi)
- Tested parquet-wasm in Node.js — fails (needs browser WASM environment)
- Created scripts/build-dosm-data.js — build-time script that:
  1. Checks Python3 availability (graceful fallback if missing)
  2. Installs pandas+pyarrow if needed
  3. Downloads latest DOSM OD parquets from storage.data.gov.my
  4. Processes into dosm-od-daily-totals.json + metadata JSONs
  5. Writes to public/ (included in build output)
- Updated package.json build/predeploy scripts to include build-dosm-data.js
- Tested: data_as_of went from 2026-07-02 → 2026-07-04 (gained 2 days)
- Row count went from 183 → 185

Stage Summary:
- Created scripts/build-dosm-data.js (build-time parquet processing)
- Updated package.json build chain: build-dosm-data.js → build-holidays.js → next build
- Every Cloudflare deploy will now automatically include the latest DOSM OD data
- Graceful fallback: if Python unavailable, existing committed files are used
- Combined with previous changes: live metadata API + live KTMB + build-time data refresh

---
Task ID: 3
Agent: main
Task: QA + resilience round — KTMB fallback fix, forecast trend, per-line sparklines, station search, export JSON, layout script hygiene, KPI polish

## Current project status (after this round)
- Dashboard is feature-complete and stable: landing page, 6 KPI cards, 30-day stacked chart with pagination, line breakdown with cross-chart highlight sync, KTMB/Rapid weekly charts, day-type analytics, seasonality heatmap, YoY growth rankings, mode share trend, busiest stations (Rapid + KTMB), top routes, period comparison (MoM/WoW/YoY), anomaly notifications, command palette (⌘K), export (CSV/JSON/PNG), settings (theme + density), PWA install prompt, weather + environment alerts (hide gracefully when upstream unreachable).
- QA performed via agent-browser (Chromium 149 via @sparticuz/chromium binary + LD_LIBRARY_PATH trick — see notes): all sections render, no horizontal scroll at 375px, dark+light mode verified, console clean after fixes, production build (`next build`) passes and serves correctly.

## Goals / completed modifications / verification results

### Bug fixes
1. **KTMB weekly chart showed "API error: 502" + empty chart when upstream data.gov.my is unreachable** (reproduced in sandbox; also a real prod resilience risk). Root cause: `useKtmbDaily` had no static fallback, unlike every other hook.
   - `src/hooks/use-ktmb-daily.ts`: added static fallback to `/ktmb-daily.json` (GitHub Actions daily refresh), normalized "YYYY-MM-DD HH:mm:ss" dates, maps `tebrau` → `shuttleTebrau`, returns `source: 'live' | 'static' | null`.
   - `src/components/dashboard/ktmb-weekly-chart.tsx`: source-aware status badge ("static fallback" with CloudOff icon vs amber T-1..T-3), in-card fallback notice line, redesigned empty/error state (icon tile + explanation).
   - VERIFIED: chart now renders data (WEEKLY TOTAL 979,432) with "static fallback" badge in sandbox; live path unchanged.
2. **Flat 3-day forecast** (`/api/notifications`): forecast was `lastLevel` repeated 3× (identical values read as a bug). Now level + damped regression slope (50% damping, `ponytail:` comment). VERIFIED: 01 Aug ~202,770 → 02 Aug ~203,921 → 03 Aug ~205,072 (±14,969).
3. **React console error "Encountered a script tag while rendering React component"** in fresh sessions — inline `<script dangerouslySetInnerHTML>` in `src/app/layout.tsx` (pre-existing).
   - Migrated to `next/script`: `name-shim` (beforeInteractive) + `sw-register` (afterInteractive, now order-independent — registers immediately if `document.readyState === 'complete'`, else on load).
   - VERIFIED: fresh-session console fully clean; `__name` shim present; service worker registers (scope `/`).

### New features
4. **7-day trend sparklines in Line Breakdown** (`transit-breakdown.tsx`): pure-SVG mini curves (cubic-bezier + gradient fill + end dot, matching KPI sparkline language) per service row + BRT, using last 7 non-null days from `useRidership`/`usePrasaranaDaily`; visible md+, fade-in on row hover, `title="7-day trend"`. VERIFIED: 7 sparklines render in sandbox (KTMB/bus lines legitimately absent in fallback mode — their recent fields are null in the static merge; they render in production where live data flows).
5. **Station search filter** (`busiest-stations-rapid.tsx` + `busiest-stations-ktmb.tsx`): search input (Search icon, clear button, focus ring), matches station name (+ line label for Rapid), keeps original rank for medal styling, shows "N of M stations match" count, "No stations match" empty state with clear action. VERIFIED: "KL" → "2 of 20 stations match"; empty state + clear work.
6. **JSON export** (`export-dropdown.tsx`): third menu item "JSON (full data)" — pretty-printed payload with source attribution, exported_at, count; shares the `useRidership` fetch (no new requests). VERIFIED: menu renders, download triggers without console errors.

### Styling details (mandatory pass)
7. `kpi-cards.tsx`: ease-out **count-up animation** on values (rAF-based, respects prefers-reduced-motion, extracted into `KpiCard` component for hooks compliance); **delta badges** now pill-style with ArrowUpRight/ArrowDownRight icons + tinted borders; **icon chips** (7×7 rounded-lg tinted containers); **accent hairline** gradient along each card's top edge; hover intensifies decorative blur dot.
8. Source-aware badges + richer error states in KTMB weekly (above); search inputs styled to the design system (CSS vars, sage focus ring).

### Verification summary
- `npx eslint .`: 15 pre-existing errors (all `react-hooks/set-state-in-effect` — the codebase-wide fetch-in-effect pattern incl. vendored shadcn `carousel.tsx`); **0 new errors** from this round.
- `npx tsc --noEmit`: only pre-existing errors in untouched files (examples/, mini-services/, skills/, mcp route, page.tsx:604, command-palette).
- `next build`: passes; production server smoke-tested (home 200, /api/comparison-data 200, /api/notifications OK, KTMB fallback + sparklines + search confirmed on prod build).
- agent-browser: 375px no horizontal scroll; light/dark both fine; console clean; all 10 h2 sections render.

## Unresolved issues / risks / next priorities
1. **15 lint errors** (`react-hooks/set-state-in-effect`) across hooks + components + vendored shadcn. Fixing properly means either the React Compiler-canonical `useEffectEvent` pattern or suppressing the rule for the fetch-in-effect pattern project-wide. Low user impact (builds pass via `ignoreBuildErrors`), medium maintenance risk. Priority: medium — decide project-wide policy, don't fix piecemeal.
2. **Sandbox limitation (not a bug)**: data.gov.my is unreachable from this environment, so live-API paths (KTMB daily, headline live, weather) exercise their static fallbacks. Production behavior for live paths should be re-verified after deploy (freshness badges, KTMB weekly "T-1..T-3" badge, weather widget).
3. **Line Breakdown anchor** shows "Latest day — 2026-06-30" in fallback mode (freshest day where all 9 CORE_KEYS are non-null in the static merge). By design, but worth a tooltip explaining why when the live API is down.
4. **`Rapid Bus (Kuantan)` renders 0** (genuine zero from merge) — verify upstream publishes bus_rkn at all in OD data; if not, treat as null → "—".
5. **Forecast stddev** is from level-model residuals; with the added trend the interval is approximate. Fine for a 3-day projection.
6. Next-phase candidates: scroll-spy nav active states, holiday-aware legend in heatmap, "copy link" deep links, offline PWA caching of static JSONs, station sparklines in top-routes, per-line sparkline data source fallback to KTMB static for fallback mode.
