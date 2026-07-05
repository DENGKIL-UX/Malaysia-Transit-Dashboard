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
