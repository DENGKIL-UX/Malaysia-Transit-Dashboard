import { NextRequest, NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────

interface HeadlineRow {
  date: string;
  bus_rkl: number;
  bus_rkn: number;
  bus_rpn: number;
  rail_lrt_ampang: number;
  rail_mrt_kajang: number;
  rail_lrt_kj: number;
  rail_monorail: number;
  rail_mrt_pjy: number;
  rail_ets: number;
  rail_intercity: number;
  rail_komuter_utara: number;
  rail_tebrau: number;
  rail_komuter: number;
}

interface KtmbDailyRow {
  date: string;
  service: string;
  ridership: number;
}

// Service name mapping from ktmb_daily to headline columns
const KTMB_SERVICE_MAP: Record<string, keyof HeadlineRow> = {
  ets: 'rail_ets',
  intercity: 'rail_intercity',
  komuter: 'rail_komuter',
  komuter_utara: 'rail_komuter_utara',
  shuttle_tebrau: 'rail_tebrau',
};

// ─── Cache helpers ───────────────────────────────────────────────────

const CACHE_KEY = 'comparison-data-merged';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cachedResponse: { data: HeadlineRow[]; timestamp: number } | null = null;

// ─── GET handler ─────────────────────────────────────────────────────

/**
 * Returns ridership data for the date comparison feature.
 *
 * Data sources:
 *   1. Local headline-daily.json — All 14 services, 2019 → 2026-04-30
 *   2. data.gov.my KTMB Daily API — 5 KTMB services, extends to latest
 *
 * The two sources are merged so KTMB columns have the most recent data
 * (often 3-4 weeks ahead of the headline due to monthly audit lag).
 *
 * Query params:
 *   - start_date: optional, filter from date (YYYY-MM-DD)
 *   - end_date: optional, filter to date
 *   - dates: optional, comma-separated list of specific dates
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const datesParam = searchParams.get('dates');
  const noCache = searchParams.get('nocache') === '1';

  try {
    // Check cache
    if (!noCache && cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL_MS) {
      const filtered = filterData(cachedResponse.data, startDate, endDate, datesParam);
      return NextResponse.json(buildResponse(filtered, cachedResponse.data));
    }

    // 1. Load base headline data from local JSON
    const baseUrl = new URL(request.url).origin;
    const res = await fetch(`${baseUrl}/headline-daily.json`);
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to load headline data' },
        { status: 500 }
      );
    }

    let data: HeadlineRow[] = await res.json();

    // 2. Determine the last date in headline data
    const headlineMaxDate = data[data.length - 1]?.date ?? '2026-04-30';

    // 3. Fetch KTMB daily data to extend beyond headline range
    const today = new Date().toISOString().split('T')[0];
    const ktmbStart = headlineMaxDate; // Start from the day after headline ends
    const ktmbEnd = today;

    let ktmbExtension: HeadlineRow[] = [];
    try {
      const ktmbUrl = new URL('https://api.data.gov.my/data-catalogue');
      ktmbUrl.searchParams.set('id', 'ridership_ktmb_daily');
      ktmbUrl.searchParams.set('date_start', `${ktmbStart}@date`);
      ktmbUrl.searchParams.set('date_end', `${ktmbEnd}@date`);

      const ktmbRes = await fetch(ktmbUrl.toString(), {
        headers: { Accept: 'application/json' },
      });

      if (ktmbRes.ok) {
        const ktmbData: KtmbDailyRow[] = await ktmbRes.json();

        // Pivot: group by date, spread services into columns
        const byDate = new Map<string, Partial<HeadlineRow>>();
        for (const row of ktmbData) {
          if (row.date <= headlineMaxDate) continue; // Skip dates already in headline
          if (!byDate.has(row.date)) {
            byDate.set(row.date, {
              date: row.date,
              bus_rkl: 0,
              bus_rkn: 0,
              bus_rpn: 0,
              rail_lrt_ampang: 0,
              rail_mrt_kajang: 0,
              rail_lrt_kj: 0,
              rail_monorail: 0,
              rail_mrt_pjy: 0,
              rail_ets: 0,
              rail_intercity: 0,
              rail_komuter_utara: 0,
              rail_tebrau: 0,
              rail_komuter: 0,
            });
          }
          const col = KTMB_SERVICE_MAP[row.service];
          if (col) {
            (byDate.get(row.date) as Record<string, number>)[col] = row.ridership;
          }
        }

        ktmbExtension = [...byDate.values()] as HeadlineRow[];
      }
    } catch (ktmbErr) {
      console.warn('KTMB daily extension fetch failed, using headline only:', ktmbErr);
    }

    // 4. Merge: headline data + KTMB extension
    const merged = [...data, ...ktmbExtension].sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    // 5. Cache the result
    cachedResponse = { data: merged, timestamp: Date.now() };

    // 6. Filter and return
    const filtered = filterData(merged, startDate, endDate, datesParam);
    return NextResponse.json(buildResponse(filtered, merged));
  } catch (error) {
    console.error('Comparison data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison data' },
      { status: 502 }
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

function buildResponse(filtered: HeadlineRow[], full: HeadlineRow[]) {
  // Determine headline range (last date with all Prasarana data)
  const headlineEnd = full.findLastIndex(
    (d) =>
      d.rail_mrt_kajang > 0 ||
      d.rail_lrt_kj > 0 ||
      d.rail_lrt_ampang > 0
  );
  const headlineMax = headlineEnd >= 0 ? full[headlineEnd].date : null;

  // Determine KTMB range (last date with any KTMB data)
  const ktmbEnd = full.findLastIndex(
    (d) =>
      d.rail_ets > 0 ||
      d.rail_komuter > 0 ||
      d.rail_intercity > 0 ||
      d.rail_komuter_utara > 0 ||
      d.rail_tebrau > 0
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
      ktmb_through: ktmbMax,
    },
    data: filtered,
  };
}
