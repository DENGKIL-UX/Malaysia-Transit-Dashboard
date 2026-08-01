import { NextRequest, NextResponse } from 'next/server';

// ─── Date validation ─────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

// ─── Types ────────────────────────────────────────────────────────────

interface HeadlineRow {
  date: string;
  bus_rkl: number | null;
  bus_rkn: number | null;
  bus_rpn: number | null;
  rail_lrt_ampang: number | null;
  rail_mrt_kajang: number | null;
  rail_lrt_kj: number | null;
  rail_monorail: number | null;
  rail_mrt_pjy: number | null;
  rail_ets: number | null;
  rail_intercity: number | null;
  rail_komuter_utara: number | null;
  rail_tebrau: number | null;
  rail_komuter: number | null;
}

interface KtmbDailyRow {
  date: string;
  service: string;
  ridership: number;
}

// Raw format from old prasarana-daily-totals.json (old dashboard parquet)
interface PrasaranaRawRow {
  date: string;
  lrt_ampang: number;
  lrt_kj: number;
  mrt_pjy: number;
  monorail: number;
  brt: number;
  total: number;
}

// Raw format from dosm-od-daily-totals.json (new DOSM OD annual parquet — SUPERSET)
interface DosmOdRawRow {
  date: string;
  lrt_ampang: number;
  mrt_kajang: number;
  lrt_kj: number;
  monorail: number;
  mrt_pjy: number;
  lrt_sri_petaling: number;
  total_rail: number;
  brt: number;
  total: number;
  od_source: boolean;
}

// Mapped to headline-compatible field names
interface PrasaranaDailyRow {
  date: string;
  rail_lrt_ampang: number;
  rail_lrt_kj: number;
  rail_mrt_kajang: number | null;
  rail_mrt_pjy: number;
  rail_monorail: number;
  bus_rkl: number;
}

// KTMB service → headline column mapping
const KTMB_SERVICE_MAP: Record<string, keyof HeadlineRow> = {
  ets: 'rail_ets',
  intercity: 'rail_intercity',
  komuter: 'rail_komuter',
  komuter_utara: 'rail_komuter_utara',
  shuttle_tebrau: 'rail_tebrau',
};

// ─── Cache ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes (data updates daily, keep fresh)

let cachedResponse: { data: HeadlineRow[]; timestamp: number } | null = null;

// ─── Data fetchers ────────────────────────────────────────────────────

/**
 * Fetch Prasarana/Rapid Rail per-line daily totals.
 * Prefers DOSM OD Daily (new annual parquet) which includes MRT Kajang.
 * Falls back to old prasarana-daily-totals.json if DOSM data unavailable.
 */
async function fetchPrasaranaDaily(
  startDate: string,
  origin: string
): Promise<Map<string, PrasaranaDailyRow>> {
  const byDate = new Map<string, PrasaranaDailyRow>();

  // 1. Try DOSM OD Daily first (has MRT Kajang, Sri Petaling, proper line mapping)
  try {
    const res = await fetch(`${origin}/dosm-od-daily-totals.json`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const json = await res.json() as { data?: DosmOdRawRow[] };
      const raw: DosmOdRawRow[] = json.data ?? [];
      if (raw.length > 0) {
        for (const row of raw) {
          if (row.date > startDate) {
            byDate.set(row.date, {
              date: row.date,
              rail_lrt_ampang: (row.lrt_ampang ?? 0) + (row.lrt_sri_petaling ?? 0),
              rail_lrt_kj: row.lrt_kj ?? 0,
              rail_mrt_kajang: row.mrt_kajang ?? null,
              rail_mrt_pjy: row.mrt_pjy ?? 0,
              rail_monorail: row.monorail ?? 0,
              bus_rkl: row.brt ?? 0,
            });
          }
        }
        console.log(`Prasarana daily: using DOSM OD (${raw.length} rows, has Kajang=${raw.some(r => (r.mrt_kajang ?? 0) > 0)})`);
        return byDate;
      }
    }
  } catch (err) {
    console.warn('DOSM OD daily fetch failed, falling back to old parquet:', err);
  }

  // 2. Fallback: old prasarana-daily-totals.json (no MRT Kajang)
  try {
    const res = await fetch(`${origin}/prasarana-daily-totals.json`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return byDate;

    const raw: PrasaranaRawRow[] = await res.json();
    for (const row of raw) {
      if (row.date > startDate) {
        byDate.set(row.date, {
          date: row.date,
          rail_lrt_ampang: row.lrt_ampang ?? 0,
          rail_lrt_kj: row.lrt_kj ?? 0,
          rail_mrt_kajang: null,
          rail_mrt_pjy: row.mrt_pjy ?? 0,
          rail_monorail: row.monorail ?? 0,
          bus_rkl: row.brt ?? 0,
        });
      }
    }
    console.log(`Prasarana daily: fallback to old parquet (${raw.length} rows)`);
  } catch (err) {
    console.warn('Prasarana daily fetch failed:', err);
  }

  return byDate;
}

/**
 * Fetch headline rows beyond the static file from the live API.
 * Returns rows that are NEWER than the static headline-recent.json.
 * ponytail: This is the same API the metadata route already calls for freshness.
 * Adding it here extends chart data without any new infrastructure.
 */
async function fetchHeadlineLive(
  afterDate: string,
  today: string
): Promise<HeadlineRow[]> {
  try {
    const url = new URL('https://api.data.gov.my/data-catalogue/');
    url.searchParams.set('id', 'ridership_headline');
    url.searchParams.set('date_start', `${afterDate}@date`);
    url.searchParams.set('date_end', `${today}@date`);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const raw: HeadlineRow[] = await res.json();
    if (!Array.isArray(raw)) return [];

    // API columns match HeadlineRow interface exactly (snake_case).
    // Only take rows newer than the static file.
    return raw.filter((r) => r.date && r.date > afterDate);
  } catch (err) {
    console.warn('Headline live fetch failed:', err);
    return [];
  }
}

async function fetchKtmbDaily(
  startDate: string,
  endDate: string
): Promise<Map<string, Record<string, number>>> {
  try {
    const url = new URL('https://api.data.gov.my/data-catalogue/');
    url.searchParams.set('id', 'ridership_ktmb_daily');
    url.searchParams.set('date_start', `${startDate}@date`);
    url.searchParams.set('date_end', `${endDate}@date`);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return new Map();

    const ktmbData: KtmbDailyRow[] = await res.json();
    const byDate = new Map<string, Record<string, number>>();

    for (const row of ktmbData) {
      if (!byDate.has(row.date)) byDate.set(row.date, {});
      const col = KTMB_SERVICE_MAP[row.service];
      if (col) byDate.get(row.date)![col] = row.ridership;
    }

    return byDate;
  } catch (err) {
    console.warn('KTMB daily fetch failed:', err);
    return new Map();
  }
}

// ─── GET handler ─────────────────────────────────────────────────────

/**
 * Returns ridership data for the date comparison feature.
 *
 * Three-tier data merge:
 *   1. Local headline-daily.json — All 14 services, 2019 → 2026-04-30 (audited monthly)
 *   2. Prasarana per-line JSON — Rapid Rail + BRT daily totals from OD parquet (pre-audit, updated ~daily)
 *   3. data.gov.my KTMB Daily API — 5 KTMB services (updated daily)
 *
 * Query params:
 *   - start_date / end_date / dates: optional filters
 *   - nocache=1: bypass in-memory cache
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const datesParam = searchParams.get('dates');
  const noCache = searchParams.get('nocache') === '1' && request.headers.get('x-debug') === 'true';

  if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
    return NextResponse.json(
      { error: 'start_date and end_date must be valid YYYY-MM-DD dates' },
      { status: 400, headers: { 'Cache-Control': 'no-cache' } }
    );
  }

  try {
    // Check cache
    if (
      !noCache &&
      cachedResponse &&
      Date.now() - cachedResponse.timestamp < CACHE_TTL_MS
    ) {
      const filtered = filterData(
        cachedResponse.data,
        startDate,
        endDate,
        datesParam
      );
      // For cached responses, we don't have the exact headlineBoundaryDate.
      // Use the data to find the last row where MRT Kajang is non-null (headline-sourced).
      const cachedHeadlineBoundary = cachedResponse.data.findLastIndex(
        (d) => d.rail_mrt_kajang != null && d.rail_mrt_kajang > 0
      );
      const cachedBoundaryDate = cachedHeadlineBoundary >= 0
        ? cachedResponse.data[cachedHeadlineBoundary].date
        : null;
      return NextResponse.json(buildResponse(filtered, cachedResponse.data, cachedBoundaryDate), {
        headers: noCache
          ? { 'Cache-Control': 'no-cache' }
          : { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' },
      });
    }

    // 1. Load base headline data from local JSON
    // Uses headline-recent.json (2024+, ~241KB) instead of full file (~736KB)
    // to reduce CPU time from JSON.parse on cold cache miss.
    const baseUrl = new URL(request.url).origin;
    const res = await fetch(`${baseUrl}/headline-recent.json`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to load headline data' },
        { status: 500, headers: { 'Cache-Control': 'no-cache' } }
      );
    }

    const data: HeadlineRow[] = await res.json();

    // 2. Determine the last date in headline data
    const headlineMaxDate = data[data.length - 1]?.date ?? '2026-04-30';
    const today = new Date().toISOString().split('T')[0];

    // 3. Fetch extension data in parallel
    // Headline live API extends audited data beyond the static file.
    // ponytail: The live headline API returns data through ~T-26 (monthly audit lag).
    // Static file may lag behind by weeks if not recently rebuilt.
    const [headlineLive, prasaranaDaily, ktmbDaily] = await Promise.all([
      fetchHeadlineLive(headlineMaxDate, today),
      fetchPrasaranaDaily(headlineMaxDate, baseUrl),
      fetchKtmbDaily(headlineMaxDate, today),
    ]);

    // 4. Merge live headline extension into base data
    if (headlineLive.length > 0) {
      const existingDates = new Set(data.map((r) => r.date));
      for (const row of headlineLive) {
        if (!existingDates.has(row.date)) {
          data.push(row);
        }
      }
    }

    // 5. Build extension rows (dates beyond headline + live headline)
    // Only add dates that neither the static file nor the live API cover.
    // ponytail: Without this guard, extension rows would duplicate/override
    // the richer headline live data for overlapping date ranges.
    const newHeadlineMax = data[data.length - 1]?.date ?? headlineMaxDate;
    const headlineDates = new Set(data.map((r) => r.date));
    const extensionDates = new Set<string>();
    for (const d of prasaranaDaily.keys()) {
      if (!headlineDates.has(d)) extensionDates.add(d);
    }
    for (const d of ktmbDaily.keys()) {
      if (!headlineDates.has(d)) extensionDates.add(d);
    }

    const extension: HeadlineRow[] = [];
    for (const date of extensionDates) {
      const pras = prasaranaDaily.get(date);
      const ktmb = ktmbDaily.get(date);

      // NULL SEMANTICS: when a pipeline has not published a date yet
      // (e.g., OD lags KTMB by 1-2 days over weekends/holidays), use null
      // — NOT 0. Zero claims "nobody rode the train", which is false data.
      // null means "not published yet" and the UI renders it as a gap.
      extension.push({
        date,
        bus_rkl: pras ? pras.bus_rkl : null,
        bus_rkn: null,    // No OD source for RapidKuantan bus
        bus_rpn: null,    // No OD source for RapidPenang bus
        rail_lrt_ampang: pras ? pras.rail_lrt_ampang : null,
        rail_mrt_kajang: pras?.rail_mrt_kajang ?? null, // SBK not in OD parquet
        rail_lrt_kj: pras ? pras.rail_lrt_kj : null,
        rail_monorail: pras ? pras.rail_monorail : null,
        rail_mrt_pjy: pras ? pras.rail_mrt_pjy : null,
        rail_ets: ktmb?.['rail_ets'] ?? null,
        rail_intercity: ktmb?.['rail_intercity'] ?? null,
        rail_komuter_utara: ktmb?.['rail_komuter_utara'] ?? null,
        rail_tebrau: ktmb?.['rail_tebrau'] ?? null,
        rail_komuter: ktmb?.['rail_komuter'] ?? null,
      });
    }

    // 6. Merge: headline data + extension
    const merged = [...data, ...extension].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // 7. Cache the result
    cachedResponse = { data: merged, timestamp: Date.now() };

    // 8. Filter and return
    const filtered = filterData(merged, startDate, endDate, datesParam);
    return NextResponse.json(buildResponse(filtered, merged, newHeadlineMax), {
      headers: noCache
        ? { 'Cache-Control': 'no-cache' }
        : { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' },
    });
  } catch (error) {
    console.error('Comparison data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison data' },
      { status: 502, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function filterData(
  data: HeadlineRow[],
  startDate: string | null,
  endDate: string | null,
  datesParam: string | null
): HeadlineRow[] {
  let targetDates: Set<string> | null = null;
  if (datesParam) {
    targetDates = new Set(datesParam.split(',').map((d) => d.trim()));
  }

  return data.filter((row) => {
    if (targetDates && !targetDates.has(row.date)) return false;
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return true;
  });
}

function buildResponse(filtered: HeadlineRow[], full: HeadlineRow[], headlineBoundaryDate: string | null) {
  // Use the actual headline boundary date from the merge logic, not findLastIndex.
  // findLastIndex was incorrect because Prasarana OD also populates KJ/Ampang/PJY,
  // making it impossible to distinguish headline-sourced rows from extension rows.
  const headlineMax = headlineBoundaryDate;

  // Prasarana: find last row with any Rapid Rail OD data (excludes KTMB).
  // MRT Kajang is excluded since it's never in OD — we check the other 4 lines.
  const prasaranaEnd = full.findLastIndex(
    (d) =>
      (d.rail_lrt_kj ?? 0) > 0 ||
      (d.rail_lrt_ampang ?? 0) > 0 ||
      (d.rail_monorail ?? 0) > 0 ||
      (d.rail_mrt_pjy ?? 0) > 0
  );
  const prasaranaMax = prasaranaEnd >= 0 ? full[prasaranaEnd].date : headlineMax;

  const ktmbEnd = full.findLastIndex(
    (d) =>
      (d.rail_ets ?? 0) > 0 ||
      (d.rail_komuter ?? 0) > 0 ||
      (d.rail_intercity ?? 0) > 0 ||
      (d.rail_komuter_utara ?? 0) > 0 ||
      (d.rail_tebrau ?? 0) > 0
  );
  const ktmbMax = ktmbEnd >= 0 ? full[ktmbEnd].date : null;

  return {
    count: filtered.length,
    date_range: {
      min: filtered[0]?.date ?? null,
      max: filtered[filtered.length - 1]?.date ?? null,
    },
    full_range: {
      min: full[0]?.date ?? null,
      max: full[full.length - 1]?.date ?? null,
      total_days: full.length,
      headline_through: headlineMax,
      prasarana_through: prasaranaMax,
      ktmb_through: ktmbMax,
    },
    data: filtered,
  };
}
