# Agent Build Prompt — Malaysia Transit Dashboard

> **Karpathy-inspired execution protocol** for AI agents modifying this codebase.
> Follow these principles ruthlessly. Every deviation must be justified.

---

## Core Principles (non-negotiable)

1. **Think Before Coding** — State assumptions, surface tradeoffs, don't hide confusion
2. **Simplicity First** — Minimum code, no speculative features, no premature abstraction
3. **Surgical Changes** — Touch only what you must, match existing style, every line traces to request
4. **Goal-Driven Execution** — Define verifiable success criteria, loop until verified

---

## Codebase Reality (ground truth — use THIS, not assumptions)

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16 |
| UI | React | 19 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Component library | shadcn/ui (New York style) | 46 components |
| Icons | Lucide React | 0.525 |
| Charts | **Recharts** | 2.15 |
| Client state | Zustand | 5 |
| Data fetching | SWR (via custom hooks) | — |
| Animations | Framer Motion | 12 |
| Theming | next-themes (class-based, default dark) | 0.4 |
| Deployment | **Cloudflare Pages via OpenNext** | `@opennextjs/cloudflare` 1.19 |
| Package manager | Bun | — |

### Data Architecture (three pipelines, NOT stale)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Pipeline             │  Services  │  Lag     │  Granularity       │
├───────────────────────┼────────────┼──────────┼────────────────────┤
│  Tier 1: KTMB OD      │  5 rail    │  T-1→T-2 │  Daily batch       │
│  Tier 1: Prasarana OD │  5 rail+BRT│  T-1→T-2 │  Daily batch       │
│  Tier 2: Headline     │  14 total  │  ~T-26   │  Monthly audited   │
└─────────────────────────────────────────────────────────────────────┘
```

**Key facts:**
- **Tier 1 (OD daily)**: KTMB 5 services + Prasarana 5 lines + BRT. Sourced from parquet on data.gov.my, converted to JSON at build time. T-1 to T-2 lag. Covers ~57 days.
- **Tier 2 (Headline monthly)**: All 14 services (rail + bus). Audited monthly by DOSM. ~T-26 lag. Historical span ~2,677 days (2019→2026).
- **Static JSON in `public/`**:
  - `headline-recent.json` (241KB) — 2024+ headline subset
  - `ktmb-daily.json` (8KB) — KTMB daily totals
  - `prasarana-daily.json` (7.5KB) — Prasarana daily totals
  - `prasarana-daily-totals.json` — per-line breakdown
  - Station/route JSONs (`ktmb-stations.json`, `prasarana-stations.json`, etc.)
- **Holiday-aware freshness**: Prebuilt JSON from MyCal API, Nager.Date fallback, weekend-only fallback. 4-state badges: `fresh` / `expected` / `delayed` / `overdue`. Blackout day logic for non-working days.
- **Auto-refresh**: 5-min polling → `pendingRefresh` in Zustand → cascade refetch all consumers → `DataUpdateToast` notification.

### API Routes (8 total)

| Route | Purpose | Cache |
|-------|---------|-------|
| `/api/comparison-data` | Merges headline + prasarana + KTMB; 6h in-memory; `nocache` param | `s-maxage=21600` |
| `/api/metadata` | Holiday context + 3 pipeline freshness + prasarana meta; parallel fetches | `s-maxage=1800` |
| `/api/notifications` | Anomaly detection (8x Z-score sliding window), trend regression, 3-day forecast | No HTTP cache |
| `/api/ridership` | Merged KTMB + Prasarana daily | — |
| `/api/holidays` | Prebuilt JSON → MyCal fallback → Nager fallback → weekend-only | — |
| `/api/mcp` | POST tool router for ridership queries | — |
| `/api/ridership-ktmb-daily` | Pure proxy to data.gov.my | — |
| `/api/route.ts` | Catch-all | — |

### Dashboard Components (26 custom + 46 shadcn/ui)

**Navigation & Status:**
- `NavBar` — Fixed top, pill nav, mobile drawer
- `DataStatusBar` — 3 pipeline freshness badges (Headline / KTMB / Prasarana)
- `PipelineStatusPanel` — 3-column detailed freshness
- `OfflineBanner`, `InstallPrompt`, `DataUpdateToast`

**Hero & Feature:**
- `CinematicTrain` — 12s CSS animation hero
- `FeatureCards` — 3 gradient-border feature cards

**Data Panels:**
- `KpiCards` — 6 per-line KPI cards
- `RidershipChart` — 30-day stacked area chart with zoom/brush
- `TransitBreakdown` — 13 horizontal bars for all services
- `KtmbWeeklyChart` — Mon-Sun stacked bars for KTMB
- `PrasaranaWeeklyChart` — Mon-Sun stacked bars for Prasarana
- `DayTypeAnalytics` — Day-of-week pattern analysis

**Station & Route Analytics:**
- `BusiestStationsRapidRail` — Top-20 Rapid Rail stations, windowed
- `BusiestStationsKTMB` — Top-20 KTMB stations
- `TopRoutesRapidRail`, `TopRoutesKTMB` — Origin→destination pairs

**Comparison & Analytics:**
- `CalendarPicker` — Month view with holiday dots
- `ComparisonChart` — Side-by-side bar chart for 2 selected dates
- `AnalyticsTable` — Statistical insights (anomaly counts, trends, forecasts)

**Utilities:**
- `CommandPalette` — ⌘K
- `NotificationBell` — Anomaly/notification inbox
- `SettingsPanel` — Theme toggle, font size
- `ExportDropdown` — CSV/PNG export
- `DataIntegrityBanner` — Holiday confidence warnings

### Color System (custom CSS variables — NOT Tailwind defaults)

```
Dark mode:
  --bg-base:        #070e07        (near-black green)
  --accent-primary: #85AB8B        (sage green)
  --accent-heading: #336443        (deep green)
  --text-primary:   #ffffff
  --bg-surface-1:   #0a120a
  --bg-surface-2:   #1f2a1d

Light mode:
  --bg-base:        #f5f5f0        (warm off-white)
  --accent-primary: #3d7a4f        (forest green)
  --accent-heading: #1a3d25
  --text-primary:   #1a1a1a
```

**Service colors** (used in charts):
- `amber-400` = MRT Kajang (SBK)
- `sky-400` = MRT Putrajaya (SSP)
- `violet-400` = LRT Kelana Jaya
- `rose-400` = LRT Ampang
- `emerald-400` = Monorail
- `teal-400` = KTM Komuter
- `cyan-400` = ETS
- `lime-400` = KTM Intercity
- `pink-400` = KTM Komuter Utara
- `yellow-400` = Shuttle Tebrau
- `orange-400` = RapidKL Bus (KL)
- `fuchsia-400` = Rapid Bus (Kuantan)
- `stone-400` = Rapid Bus (Penang)
- `orange-300` = BRT Sunway

### Deployment (Cloudflare Pages via OpenNext)

```bash
# Build (NOT "next build" alone)
npx opennextjs-cloudflare build

# Deploy
npx wrangler deploy
```

**`wrangler.jsonc` configuration:**
- Smart placement: APAC hint
- Assets binding: `.open-next/assets`
- Self-reference service binding (required for OpenNext caching)
- Image optimization binding
- `nodejs_compat` compatibility flag
- **No R2 cache** (bucket not yet created)
- Static JSON served from `/public` via CDN

---

## Known Anti-Patterns (DO NOT do these)

> These are things that previous plans got wrong. Violating any of these means you didn't read this document.

| Assumption | Reality | Why it matters |
|-----------|---------|----------------|
| "Data is 2 months old" | **FALSE.** Three pipelines with different lags. OD data is T-1, Headline is T-26 (monthly audited). The freshness system (`DataStatusBar`) shows exact lag per pipeline. This is **BY DESIGN**, not a bug. | "Fixing" this would mean misunderstanding the data source cadence. |
| "Fix the fetch interval" | Already has 5-min polling with cascade refresh via `pendingRefresh` in Zustand. Working correctly. | Don't reinvent the wheel. |
| "Use parquet-wasm at runtime" | Already uses pre-generated JSON from parquet at build time (`generate-prasarana.js`, `process_parquet.py`). Runtime parquet parsing is unnecessary complexity. | The JSON files are already small and CDN-cached. |
| "Cloudflare Workers" | **Cloudflare Pages via OpenNext.** Different deployment model. Workers are stateless; Pages uses asset binding + service worker. | Wrong target means wrong build commands and wrong config. |
| "Use Chart.js" | Project uses **Recharts** exclusively. Don't introduce another charting library. | Would duplicate dependencies and break visual consistency. |
| "Replace color scheme with #003893" | Project has a sophisticated custom sage-green theme with full dark/light mode. Don't replace with random blues. | Destroys the design system. |
| "Add WebSocket for live data" | data.gov.my has no real-time API. It's batch-published. 5-min polling is the right approach. | Architectural mismatch. |
| "Migrate to plain Next.js server" | Already on Cloudflare Pages. Moving to Node.js server would break the CDN deployment model. | Deployment regression. |

---

## Execution Protocol

### Phase 0: Understand Before Touching

**Before writing a single line, you MUST:**

1. **Read the relevant files first.** Identify every file that will be affected. List them.
2. **State your assumptions** in a code comment or in your response:
   ```
   // ASSUMPTION: The ridership-chart expects data shape { date, total, mrtKajang, ... }
   // VERIFIED: Yes — src/hooks/use-ridership.ts returns this shape
   // RISK: If data.gov.my changes column names, this breaks
   ```
3. **Check for existing patterns.** Search for similar functionality already in the codebase. Don't reimplement.
4. **Identify the blast radius.** How many components, hooks, API routes, and types will this change affect?

**Checkpoint:** Can you explain what every affected file does in one sentence? If not, read more.

### Phase 1: Plan the Change

**Write a change plan with these fields:**

```
TASK: [one-line description]
FILES TO MODIFY: [exact list]
FILES TO CREATE: [exact list, if any — prefer zero]
DATA SHAPES CHANGED: [before → after, or "none"]
API CONTRACT CHANGES: [before → after, or "none"]
BREAKING CHANGES: [yes/no and what]
ROLLBACK STRATEGY: [how to undo if it breaks]
ESTIMATED DIFF SIZE: [lines added/removed]
```

**Tradeoffs to present (NOT decide alone):**
- If adding a new dependency → Why can't we use existing ones?
- If adding a new API route → Why can't we extend an existing one?
- If changing data shapes → What downstream consumers break?
- If adding state → Can this be derived from existing state?
- If changing styles → Does it work in both dark and light mode?

**Checkpoint:** A peer could implement this from your plan without asking questions.

### Phase 2: Implement Surgically

**Rules:**

1. **Match existing style exactly.** Check indentation (2 spaces), quote style (single for imports, double for JSX attrs), naming conventions (camelCase for functions, PascalCase for components, kebab-case for CSS classes).
2. **One concern per diff.** Don't mix refactoring with feature work.
3. **Prefer modifying over creating.** If a component already does 80% of what's needed, extend it.
4. **Import paths use `@/` alias.** Never relative paths like `../../lib/utils`.
5. **CSS uses custom properties.** Use `var(--text-primary)` not `text-gray-900`. Use `var(--bg-surface-1)` not `bg-gray-900`.
6. **Components use shadcn/ui primitives.** Use `<Card>` not a custom `<div className="rounded-xl ...">`. Use `<Badge>` not custom pill spans.
7. **Charts use Recharts.** `<AreaChart>`, `<BarChart>`, etc. Never Chart.js or D3 directly.
8. **TypeScript strict mode.** No `any` unless absolutely necessary, and if so, comment why.
9. **No console.log in production code.** Remove all debugging statements before finishing.

**Checkpoint:** `bun run lint` passes. TypeScript compiles with zero errors.

### Phase 3: Verify Goal Completion

**After implementation, verify ALL of these:**

- [ ] `bun run lint` — zero errors
- [ ] `bun run build` — compiles successfully (or `npx opennextjs-cloudflare build`)
- [ ] Dark mode — all new/changed elements render correctly
- [ ] Light mode — all new/changed elements render correctly
- [ ] Mobile (< 640px) — layout doesn't break
- [ ] Desktop (1280px+) — layout doesn't break
- [ ] No new `any` types introduced
- [ ] No new dependencies added unless explicitly approved
- [ ] All new API routes have `Cache-Control` headers
- [ ] All new data fetching handles errors gracefully (fallback to empty state, never crash)
- [ ] No regression in existing functionality (check the 3 pipeline freshness badges still work)
- [ ] `useEffect` hooks have proper dependency arrays
- [ ] Zustand store changes don't break existing consumers

**Checkpoint:** `dev` server runs without errors, and the specific feature works end-to-end.

### Phase 4: Surface Confusion Immediately

**If at ANY point you encounter something you don't understand, STOP and report it:**

```
CONFUSION: [what you don't understand]
EVIDENCE: [what you observed that caused the confusion]
FILES INVOLVED: [which files]
HYPOTHESIS: [your best guess at what's happening]
DECISION NEEDED: [what the human needs to decide]
```

**Examples of when to stop:**
- The data shape from an API doesn't match what the component expects
- You find two components that seem to do the same thing
- A dependency is imported but you can't find where it's used
- The color system uses a value that doesn't match the theme variables
- A hook has side effects you can't trace

**Never:** Guess, assume, or silently work around confusion.
**Always:** Ask, explain what you know, and present options.

---

## Success Criteria (define before starting, verify before finishing)

Every task must have at least one **verifiable** success criterion:

| Criterion | How to Verify |
|-----------|--------------|
| Build passes | `bun run build` exits 0 |
| Lint clean | `bun run lint` exits 0 |
| No type errors | `tsc --noEmit` exits 0 |
| Visual regression test | Screenshot comparison in dark + light mode |
| Data pipeline integrity | All 3 freshness badges show correct state |
| Auto-refresh works | `pendingRefresh` triggers cascade refetch within 5 min |
| Mobile responsive | No horizontal scroll at 375px viewport |
| Chart renders | Recharts renders without `undefined` data errors |
| API responds | `/api/comparison-data` returns valid JSON under 2s |
| Deploy succeeds | `npx opennextjs-cloudflare build && npx wrangler deploy` works |

---

## Don't Overcomplicate — Red Flags

Stop and reassess if you're about to:

- [ ] **Add a new dependency** — Can you use what's already installed? (46 shadcn components, Recharts, Framer Motion, Zustand, SWR, date-fns)
- [ ] **Create a new API route** — Can you extend `/api/comparison-data` or `/api/metadata`?
- [ ] **Add a new Zustand store** — Can you add fields to the existing `useAppStore`?
- [ ] **Write a utility function** — Check if it exists in `src/lib/utils.ts` or any hook
- [ ] **Add complex state management** — Can this be derived from URL params or existing store?
- [ ] **Add a build step** — The current pipeline is `build-holidays.js → next build → opennext build`. Don't add steps.
- [ ] **Change the data format** — The JSON files in `public/` have consumers. Check all of them.
- [ ] **Add CSS animations** — Check `globals.css` first — `fadeInUp`, `pulse-glow`, `train-pass`, `shimmer` already exist.
- [ ] **Add a new hook** — Check existing hooks in `src/hooks/` — most data patterns are already abstracted.
- [ ] **Modify the theme** — The color system is carefully tuned. Test both modes if you touch CSS variables.
- [ ] **Add R2 caching** — The bucket doesn't exist yet. Don't add R2 code without infrastructure setup.
- [ ] **Add a new chart type** — Recharts supports many. Use existing patterns from `RidershipChart`, `TransitBreakdown`, etc.
- [ ] **Add internationalization** — Not in scope unless explicitly requested.
- [ ] **Add authentication** — Not in scope unless explicitly requested.
- [ ] **Add tests** — Don't add a test framework unless explicitly requested. (None currently exists.)

---

## Quick Reference: File Map

```
src/
  app/
    page.tsx                    # Main dashboard page (single-page app)
    layout.tsx                  # Root layout with ThemeProvider
    globals.css                 # ALL custom CSS variables, animations, scrollbar
    api/
      comparison-data/route.ts  # 3-tier merge: headline + prasarana + KTMB
      metadata/route.ts         # Holiday context + 3 pipeline freshness
      notifications/route.ts    # Anomaly detection, trend, forecast
      ridership/route.ts        # Merged KTMB + Prasarana daily
      holidays/route.ts         # MyCal → Nager → weekend fallback
      mcp/route.ts              # POST tool router
      ridership-ktmb-daily/route.ts  # Proxy to data.gov.my
  components/
    dashboard/                   # 26 custom dashboard components
      nav-bar.tsx
      data-status-bar.tsx
      kpi-cards.tsx
      ridership-chart.tsx
      transit-breakdown.tsx
      cinematic-train.tsx
      feature-cards.tsx
      ktmb-weekly-chart.tsx
      prasarana-weekly-chart.tsx
      day-type-analytics.tsx
      busiest-stations-rapid.tsx
      busiest-stations-ktmb.tsx
      top-routes.tsx
      calendar-picker.tsx
      comparison-chart.tsx
      analytics-table.tsx
      pipeline-status.tsx
      command-palette.tsx
      notification-bell.tsx
      settings-panel.tsx
      export-dropdown.tsx
      data-update-toast.tsx
      data-integrity-banner.tsx
      offline-banner.tsx
      install-prompt.tsx
    ui/                          # 46 shadcn/ui components (DO NOT modify without reason)
  hooks/
    use-ridership.ts            # Main ridership data fetch
    use-analytics.ts            # Analytics engine (anomaly, trend, forecast)
    use-notifications.ts        # 5-min polling + cascade refresh trigger
    use-data-metadata.ts        # Centralized metadata fetch
    use-ktmb-daily.ts           # KTMB daily hook
    use-prasarana-daily.ts       # Prasarana daily hook
    use-ktmb-stations.ts        # Station data hook
    use-prasarana-stations.ts   # Station data hook
    use-mobile.ts                # Viewport detection
    use-toast.ts                 # Toast notifications
  lib/
    store.ts                    # Zustand store (single store, all state)
    utils.ts                    # cn() helper + utility functions
    parse-ridership.ts          # Data parsing utilities
    holidays.ts                 # Holiday logic utilities
  components/
    theme-provider.tsx           # next-themes provider wrapper
public/
  headline-recent.json           # ~241KB, 2024+ headline data
  headline-daily.json           # Full headline historical
  ktmb-daily.json               # KTMB daily totals
  prasarana-daily.json          # Prasarana daily totals
  prasarana-daily-totals.json   # Per-line Prasarana breakdown
  ktmb-stations.json             # KTMB station list
  prasarana-stations.json        # Prasarana station list
  ktmb-routes.json              # KTMB routes
  prasarana-routes.json         # Prasarana routes
  holidays-2025.json            # Prebuilt holiday data
  holidays-2026.json
  holidays-2027.json
  sw.js                          # Service worker (PWA)
  manifest.json                  # PWA manifest
wrangler.jsonc                   # Cloudflare Pages config
open-next.config.ts              # OpenNext adapter config
tailwind.config.ts               # Tailwind 4 config
next.config.ts                   # Next.js config
package.json                     # Dependencies and scripts
```

---

## Before You Start: Mandatory Checklist

- [ ] I have read the file(s) I'm about to modify
- [ ] I understand what the current code does
- [ ] I can explain the change in one sentence
- [ ] I know exactly which files to touch (and which NOT to)
- [ ] I have stated my assumptions
- [ ] I have identified tradeoffs
- [ ] I have defined verifiable success criteria
- [ ] I have NOT assumed anything from the "Known Anti-Patterns" table

**Go.**
