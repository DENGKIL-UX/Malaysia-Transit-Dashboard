# AGENT.md — RapidStats MY (Malaysia Transit Dashboard)

> **Ponytail mode: lazy senior dev.** Lazy means efficient, not careless. The best code is the code never written.

---

## The Ladder (run it AFTER you understand the problem)

Before writing any code, stop at the first rung that holds:

1. **Does this need to be built at all?** (YAGNI)
2. **Does it already exist in this codebase?** Reuse the hook, component, or pattern already here.
3. **Does the standard library / already-installed dep do this?** Use it.
4. **Can this be one line?** Make it one line.
5. **Only then:** write the minimum code that works.

The ladder shortens the solution, never the reading. Trace the real flow end-to-end before picking a rung.

---

## Rules

- **No new dependencies.** We have 46 shadcn/ui components, Recharts, Framer Motion, Zustand, date-fns, Lucide, z-ai-web-dev-sdk. That covers everything.
- **No abstractions that weren't requested.** No interface with one implementation, no factory for one product, no config for a value that never changes.
- **No boilerplate.** No scaffolding "for later."
- **Deletion over addition.** Boring over clever. Fewest files possible. Shortest working diff wins.
- **No new Zustand store.** Add fields to the existing `useAppStore` in `src/lib/store.ts`.
- **No new API route** unless the existing 8 cannot be extended.
- **No new hook** unless `src/hooks/` doesn't already cover the pattern.
- **No new CSS animations** — `fadeInUp`, `pulse-glow`, `train-pass`, `shimmer` exist in `globals.css`.
- **Mark intentional simplifications with a `ponytail:` comment.** Format: `ponytail: <ceiling>, <upgrade path>`.
- **User insistence wins.** If asked for the full version, build it. No re-arguing.

## Not lazy about

- **Understanding the problem** — read it fully, trace the real flow, identify blast radius
- **Input validation at trust boundaries** (API query params, external API responses)
- **Error handling that prevents data loss** — fallback to empty state, never crash
- **Security** — no `any` types in production code, no `console.log`, no exposed secrets
- **Accessibility** — semantic HTML, ARIA labels, 44px touch targets
- **Both dark and light mode** — test both if you touch CSS variables or add styled elements
- **Mobile responsiveness** — no horizontal scroll at 375px
- **Anything explicitly requested by the user**

---

## Codebase Reality

### What this is

Daily ridership analytics dashboard for Malaysia's 14 public transit services (10 rail + 4 bus). Sourced from DOSM open data portal (data.gov.my). Deployed on Cloudflare Pages via OpenNext.

### Tech stack

| Layer | Tech | Version |
|-------|------|---------|
| Framework | Next.js (App Router, Turbopack) | 16 |
| UI | React | 19 |
| Language | TypeScript (strict, noImplicitAny: false) | 5 |
| Styling | Tailwind CSS (custom CSS vars) | 4 |
| Components | shadcn/ui (New York) | 46 in `src/components/ui/` |
| Icons | Lucide React | 0.525 |
| Charts | **Recharts** | 2.15 |
| State | Zustand (single store) | 5 |
| Fetching | Custom hooks (useState+useEffect) | — |
| Animations | Framer Motion + CSS keyframes | 12 |
| Theming | next-themes (class-based, default dark) | 0.4 |
| Dates | date-fns | 4.1 |
| Deploy | Cloudflare Pages via OpenNext | @opennextjs/cloudflare 1.19 |
| Runtime | Bun | — |
| **No database** | Stateless, static-JSON-backed | — |

### Data architecture — three pipelines + automated refresh

```
Tier 1: KTMB OD       — 5 rail services   — T-1 to T-3 lag  — LIVE API (runtime)
Tier 1: Prasarana OD  — 5 rail + BRT     — T-1 to T-3 lag  — STATIC JSON (daily GitHub Actions cron)
Tier 2: Headline       — All 14 services   — ~T-26 lag      — LIVE API (runtime) + STATIC (monthly refresh)
```

**Automated data refresh (GitHub Actions):**
- **Daily** (22:15 UTC): `.github/workflows/refresh-data.yml` runs `scripts/process_parquet.py`
  → Downloads latest parquets from `storage.data.gov.my/dashboards/`
  → Regenerates `prasarana-daily-totals.json`, `ktmb-daily.json`, station/route JSONs
  → Auto-commits to repo → triggers CF Pages rebuild (~3 min)
- **Monthly** (12th, 22:30 UTC): Same workflow runs `scripts/refresh-headline.js`
  → Fetches headline data from live API → updates `headline-recent.json`

**Runtime data extension (no CI/CD needed):**
- `/api/comparison-data` fetches live headline API BEYOND the static file
  → Charts show headline data through ~T-26 without waiting for monthly rebuild
  → KTMB data extends to T-1 via live API

Static JSON in `public/`:
- `headline-recent.json` (241KB) — 2024+ headline subset (monthly refresh + live API extension)
- `ktmb-daily.json` (8KB) — KTMB daily totals (daily refresh; also available live)
- `prasarana-daily.json` (7.5KB) — Prasarana daily totals (daily refresh)
- `prasarana-daily-totals.json` — per-line breakdown (daily refresh)
- `ktmb-stations.json`, `prasarana-stations.json` — top-20 stations + daily series
- `ktmb-routes.json`, `prasarana-routes.json` — top-20 O-D routes
- `holidays-2025.json`, `holidays-2026.json`, `holidays-2027.json` — prebuilt holiday classifications

### API routes (8 total)

| Route | Purpose | Cache |
|-------|---------|-------|
| `/api/comparison-data` | 3-tier merge: static headline + LIVE headline extension + prasarana + LIVE KTMB | `s-maxage=21600`, 6h in-memory |
| `/api/metadata` | Holiday context + 3 pipeline freshness | `s-maxage=1800` |
| `/api/notifications` | Anomaly detection (Z-score), trend, forecast | `s-maxage=600` |
| `/api/ridership` | Merged KTMB + Prasarana daily (requires start/end_date) | `s-maxage=300` |
| `/api/holidays` | 4-tier: prebuilt JSON → MyCal → Nager → weekend-only | `s-maxage=3600` |
| `/api/mcp` | POST tool router (query_ridership, get_metadata) | CF Cache API 24h |
| `/api/ridership-ktmb-daily` | Proxy to data.gov.my KTMB API | `s-maxage=3600` |
| `/api/route.ts` | Catch-all health check | — |

### State management — single Zustand store

File: `src/lib/store.ts`. Store: `useAppStore`. All global state lives here.

Key fields: `notifications`, `freshness`, `analyticsState`, `metadata`, `dataRefreshKey`, `pendingRefresh`, `dataUpdateTimestamp`.

**Cascade refresh pattern:** `useDataMetadata` polls `/api/metadata` every 5min (singleton). When `freshest_date` changes → `triggerDataRefresh()` → increments `dataRefreshKey` → `page.tsx` useEffect calls `refetchRidership()` + `refetchAnalytics(true)` in parallel → `DataUpdateToast` appears.

### Key type shapes (from `src/hooks/use-data-metadata.ts`)

```ts
interface PipelineFreshness {
  latest_date: string;
  lag_days: number;
  expected_lag: number;
  lag_explained_by: string[];
  is_overdue: boolean;
  status: 'fresh' | 'expected' | 'delayed' | 'overdue' | 'unknown';
}

interface DataMetadata {
  headline: PipelineFreshness;
  prasarana: { data_as_of: string; last_updated: string; next_update: string; source: string };
  ktmb: PipelineFreshness;
  prasarana_od: PipelineFreshness;
  freshest_date: string;
  freshest_source: string;
  holiday_context: HolidayContext | null;  // { today, todayIsBlackout, nextWorkingDay, prevWorkingDay, upcomingHolidays }
  pipeline_insights: string[];
}
```

Note: `DataMetadata` has no `lastChecked` field. Use `useAppStore.dataUpdateTimestamp` (epoch ms, set on cascade refresh completion) as the nearest proxy for "last checked."

### Data refresh scripts

- `scripts/process_parquet.py` — Downloads parquets → outputs JSON to `public/` (OUTPUT_DIR env)
- `scripts/refresh-headline.js` — Fetches headline from live API → updates `headline-recent.json`
- `.github/workflows/refresh-data.yml` — Daily (22:15 UTC) + Monthly (12th 22:30 UTC) cron

### File map

```
src/
  app/
    page.tsx                          # Single-page app (all dashboard sections, 834 lines)
    layout.tsx                        # Root: ThemeProvider, Geist fonts, Toaster, SW reg
    globals.css                       # ALL custom CSS vars (dark+light), animations, scrollbar
    api/
      comparison-data/route.ts        # 3-tier merge + live headline extension
      metadata/route.ts               # Holiday-aware freshness + parallel fetches
      notifications/route.ts          # Anomaly Z-score, trend regression, 3-day forecast
      ridership/route.ts              # Merged KTMB + Prasarana
      holidays/route.ts               # 4-tier holiday fallback
      mcp/route.ts                    # MCP tool router (POST)
      ridership-ktmb-daily/route.ts   # Proxy to data.gov.my
  components/
    dashboard/                         # 26 custom components (DO modify these)
    ui/                                # 46 shadcn/ui primitives (DO NOT modify without reason)
    theme-provider.tsx                 # next-themes wrapper
  hooks/
    use-ridership.ts                   # MCP → /api/ridership fallback → parseRidershipRow
    use-analytics.ts                   # Holidays + comparison-data → enrich with day types
    use-notifications.ts              # 5-min poll /api/notifications → Zustand
    use-data-metadata.ts              # Singleton 5-min poll /api/metadata → cascade refresh
    use-ktmb-daily.ts                 # /api/ridership-ktmb-daily → pivot by date
    use-prasarana-daily.ts            # /prasarana-daily.json (direct static fetch)
    use-ktmb-stations.ts             # /ktmb-stations.json (direct static fetch)
    use-prasarana-stations.ts        # /prasarana-stations.json (direct static fetch)
    use-mobile.ts                     # Viewport < 768px detection
    use-toast.ts                      # shadcn toast external state
  lib/
    store.ts                          # Single Zustand store
    utils.ts                          # cn() helper (clsx + twMerge)
    parse-ridership.ts               # snake_case → camelCase + total computation
    holidays.ts                       # Holiday fetching, cuti ganti, blackout detection
public/
  _headers                           # Cloudflare Pages cache headers
  sw.js / manifest.json              # PWA (minimal — no offline caching)
  *.json                             # All static data files
wrangler.jsonc                       # CF Pages config (smart placement APAC, nodejs_compat)
open-next.config.ts                  # OpenNext adapter (R2 cache commented out)
next.config.ts                       # ignoreBuildErrors: true, strictMode: false
scripts/build-holidays.js            # Build-time: MyCal API → public/holidays-*.json
  scripts/process_parquet.py          # Data refresh: parquet → public/*.json (GitHub Actions daily)
  scripts/refresh-headline.js         # Data refresh: live API → public/headline-recent.json (monthly)
```

### Color system — custom CSS variables (NOT Tailwind defaults)

```
Dark:  --bg-base: #070e07  |  --accent-primary: #85AB8B  |  --accent-heading: #336443
Light: --bg-base: #f5f5f0  |  --accent-primary: #3d7a4f  |  --accent-heading: #1a3d25
```

Always use `var(--text-primary)`, `var(--bg-surface-1)`, `var(--accent-primary)` etc. — never raw Tailwind color classes for theme colors.

### Service chart colors

MRT Kajang=`amber-400` | MRT Putrajaya=`sky-400` | LRT Kelana Jaya=`violet-400` | LRT Ampang=`rose-400` | Monorail=`emerald-400` | KTM Komuter=`teal-400` | ETS=`cyan-400` | KTM Intercity=`lime-400` | KTM Komuter Utara=`pink-400` | Shuttle Tebrau=`yellow-400` | RapidKL Bus=`orange-400` | Rapid Bus Kuantan=`fuchsia-400` | Rapid Bus Penang=`stone-400` | BRT Sunway=`orange-300`

---

## Anti-Patterns (violating these means you didn't read this file)

| Wrong Assumption | Reality |
|---|---|
| "Data is stale / 2 months old" | Static JSONs refreshed daily via GitHub Actions cron. Live APIs extend data at runtime. Badge shows actual chart date. |
| "Fix the fetch interval" | Already 5-min polling + cascade refresh via `pendingRefresh`. Working. |
| "Use parquet-wasm at runtime" | Pre-generated JSON at build time. Runtime parquet parsing is unnecessary. |
| "This is Cloudflare Workers" | **Cloudflare Pages via OpenNext.** Different model. |
| "Use Chart.js / D3" | **Recharts** exclusively. |
| "Replace colors with blues/indigo" | Custom sage-green theme. Don't destroy it. |
| "Add WebSocket for live data" | data.gov.my is batch-published. 5-min polling is correct. |
| "Migrate to plain Next.js server" | Already on CF Pages. Moving breaks CDN deployment. |
| "Add R2 caching" | Bucket doesn't exist yet. Don't add R2 code without infrastructure. |
| "Create a new Zustand store" | Add fields to existing `useAppStore`. |
| "Create a new API route" | Extend existing 8 routes first. |
| "Install a new package" | Use what's installed. Ask only if nothing covers it. |
| "Add tests" | No test framework installed. Don't add one unless asked. |
| "Add i18n / auth" | Not in scope unless explicitly requested. |
| "Use fs.readFileSync" | Cloudflare Workers have no filesystem. Use `fetch()` to read local JSON. |

---

## Coding Conventions

- **Indentation:** 2 spaces
- **Quotes:** Single for imports, double for JSX attributes
- **Naming:** camelCase functions, PascalCase components, kebab-case CSS classes
- **Import paths:** Always `@/` alias. Never `../../lib/utils`.
- **CSS:** Custom properties (`var(--text-primary)`), not Tailwind color classes for theme colors
- **Components:** shadcn/ui primitives (`<Card>`, `<Badge>`, `<Tooltip>`), not custom divs
- **Charts:** Recharts (`<AreaChart>`, `<BarChart>`), never Chart.js or D3
- **No `console.log`** in production code
- **No `any`** unless absolutely necessary — comment why if used
- **Bug fix = root cause, not symptom.** Grep every caller. Fix the shared function once.
- **`ponytail:` comment** on intentional shortcuts: `// ponytail: <ceiling>, <upgrade path>`

---

## Execution Protocol

### Phase 0: Read before touching

1. **Read every file you'll modify.** List them.
2. **State assumptions:**
   ```
   // ASSUMPTION: [what you assume]
   // VERIFIED: [yes, and how]
   // RISK: [what could break]
   ```
3. **Search for existing patterns.** Don't reimplement.
4. **Identify blast radius.** How many components/hooks/APIs/types are affected?

### Phase 1: Plan the change

```
TASK: [one line]
FILES TO MODIFY: [exact list]
FILES TO CREATE: [exact list — prefer zero]
DATA SHAPES CHANGED: [before → after, or "none"]
API CONTRACT CHANGES: [before → after, or "none"]
BREAKING CHANGES: [yes/no and what]
ROLLBACK: [how to undo]
ESTIMATED DIFF: [lines +/−]
```

Present tradeoffs for: new deps, new routes, shape changes, new state, style changes.

### Phase 2: Implement surgically

1. Match existing style exactly (2 spaces, quote conventions, naming)
2. One concern per diff — don't mix refactoring with feature work
3. Prefer modifying over creating — extend existing components/hooks
4. Import paths: `@/` alias always
5. CSS: custom properties, not Tailwind color classes for theme
6. Components: shadcn/ui primitives, not custom divs
7. Charts: Recharts only
8. No `console.log`, no `any` without comment

### Phase 3: Verify

- [ ] `bun run lint` passes
- [ ] Dev server starts without errors
- [ ] Dark mode renders correctly
- [ ] Light mode renders correctly
- [ ] Mobile (375px) doesn't break
- [ ] Desktop (1280px+) doesn't break
- [ ] 3 pipeline freshness badges still work
- [ ] Auto-refresh cascade still works
- [ ] No new `any` types
- [ ] No new dependencies
- [ ] All new API routes have `Cache-Control` headers
- [ ] All new fetches handle errors gracefully (empty state, never crash)

### Phase 4: Surface confusion immediately

If you don't understand something, STOP and report:
```
CONFUSION: [what]
EVIDENCE: [what you observed]
FILES: [which files]
HYPOTHESIS: [best guess]
DECISION NEEDED: [what the human must decide]
```

Never guess. Never silently work around confusion.

---

## Deployment

```bash
# Build (NOT "next build" alone — holidays must be built first)
node scripts/build-holidays.js && opennextjs-cloudflare build

# Deploy
npx wrangler deploy
```

**Cloudflare free tier CPU limit: 10ms.** Cold path optimized to ~4-6ms. Don't add heavy computation to API routes. Every millisecond matters.

---

## Output Format

Code first. Then at most three short lines: what was skipped, when to add it.

```
[code]
→ skipped: [X], add when [Y].
```

No essays. No design notes. If the explanation is longer than the code, delete the explanation. User-requested explanations (reports, walkthroughs) are NOT debt — give them in full.