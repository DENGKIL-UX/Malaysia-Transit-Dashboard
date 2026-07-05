import { NextRequest, NextResponse } from 'next/server';
import {
  getCachedHolidays,
  getPreviousWorkingDay,
  getNextWorkingDay,
  countBlackoutDaysBefore,
  isDataBlackout,
  getHolidayDateSet,
  type Holiday,
} from '@/lib/holidays';

// ── Types ───────────────────────────────────────────────────────────

interface PipelineFreshness {
  latest_date: string;
  lag_days: number;
  expected_lag: number;        // T-1 for OD, ~12d for headline
  lag_explained_by: string[];  // e.g. ['weekend', 'Hari Raya Haji']
  is_overdue: boolean;
  status: 'fresh' | 'expected' | 'delayed' | 'overdue' | 'unknown';
}

interface HolidayContext {
  today: string;
  todayIsBlackout: boolean;
  nextWorkingDay: string;
  prevWorkingDay: string;
  upcomingHolidays: Holiday[];
}

interface DosmOdMeta {
  rapidrail: { data_as_of: string; last_updated: string; exclude_openapi: boolean };
  brt: { data_as_of: string; last_updated: string; exclude_openapi: boolean };
}

interface MetaResult {
  headline: PipelineFreshness;
  prasarana: {
    data_as_of: string;
    last_updated: string;
    next_update: string;
    source: string;
  };
  ktmb: PipelineFreshness;
  prasarana_od: PipelineFreshness;
  dosm_od_daily: {
    meta: DosmOdMeta | null;
    freshness: PipelineFreshness;
    has_mrt_kajang: boolean;
    row_count: number;
  };
  freshest_date: string;
  freshest_source: string;
  holiday_context: HolidayContext | null;
  pipeline_insights: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  ms: number
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function getLatestDateFromLocalJson(baseUrl: string, filename: string): Promise<string | null> {
  try {
    const url = `${baseUrl}/${filename}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ date: string }>;
    if (Array.isArray(arr) && arr.length > 0) {
      const dates = arr
        .map((r) => r.date)
        .filter(Boolean)
        .sort();
      return dates[dates.length - 1] ?? null;
    }
  } catch {
    // File not found or parse error
  }
  return null;
}

/**
 * Compute holiday-aware freshness for a daily (OD) pipeline.
 * Daily pipelines should have T-1 data at minimum.
 * Weekend/holiday can push it to T-2 or T-3.
 */
function computeODFreshness(
  latestDate: string,
  today: string,
  holidaySet: Set<string>
): PipelineFreshness {
  if (!latestDate) {
    return {
      latest_date: '',
      lag_days: 0,
      expected_lag: 0,
      lag_explained_by: [],
      is_overdue: false,
      status: 'unknown',
    };
  }

  const todayMs = new Date(today + 'T00:00:00').getTime();
  const latestMs = new Date(latestDate + 'T00:00:00').getTime();
  const actualLag = Math.round((todayMs - latestMs) / 864e5);

  // Expected: walk back from yesterday to find previous working day
  // (batch processes T-1's data and publishes overnight)
  const prevWork = getPreviousWorkingDay(today, holidaySet);
  const expectedMs = new Date(prevWork + 'T00:00:00').getTime();
  const expectedLag = Math.round((todayMs - expectedMs) / 864e5);

  // Why is the lag what it is?
  const blackoutInfo = countBlackoutDaysBefore(today, holidaySet);

  // If actual lag > expected lag, it's overdue
  const isOverdue = actualLag > expectedLag + 1; // +1 day grace

  // Status
  let status: PipelineFreshness['status'] = 'fresh';
  if (!latestDate) {
    status = 'unknown';
  } else if (isOverdue) {
    status = 'overdue';
  } else if (actualLag > expectedLag) {
    status = 'delayed';
  } else if (actualLag === expectedLag) {
    status = 'expected';
  } else if (actualLag < expectedLag) {
    status = 'fresh'; // Even fresher than expected
  }

  return {
    latest_date: latestDate,
    lag_days: actualLag,
    expected_lag: expectedLag,
    lag_explained_by: blackoutInfo.reasons.length > 0
      ? blackoutInfo.reasons
      : ['normal T-1 batch'],
    is_overdue: isOverdue,
    status,
  };
}

/**
 * Compute freshness for the monthly headline pipeline.
 * Expected lag is ~12 days after month-end.
 */
function computeHeadlineFreshness(
  latestDate: string,
  today: string
): PipelineFreshness {
  if (!latestDate) {
    return {
      latest_date: '',
      lag_days: 0,
      expected_lag: 12,
      lag_explained_by: [],
      is_overdue: false,
      status: 'unknown',
    };
  }

  const todayMs = new Date(today + 'T00:00:00').getTime();
  const latestMs = new Date(latestDate + 'T00:00:00').getTime();
  const actualLag = Math.round((todayMs - latestMs) / 864e5);

  // Expected lag for headline: ~12 days
  // But if we're still within the expected window, it's fine
  const latestMonth = latestDate.substring(0, 7);
  const [yr, mo] = latestMonth.split('-').map(Number);
  const nextMonth = mo === 12 ? 1 : mo + 1;
  const nextYear = mo === 12 ? yr + 1 : yr;
  const expectedPublish = `${String(nextYear)}-${String(nextMonth).padStart(2, '0')}-12`;
  const expectedMs = new Date(expectedPublish + 'T00:00:00').getTime();
  const daysToExpected = Math.round((expectedMs - todayMs) / 864e5);

  const isOverdue = daysToExpected < -5; // 5-day grace after expected

  let status: PipelineFreshness['status'] = 'expected';
  if (isOverdue) {
    status = 'overdue';
  } else if (daysToExpected <= 0) {
    status = 'expected';
  } else {
    status = 'fresh';
  }

  return {
    latest_date: latestDate,
    lag_days: actualLag,
    expected_lag: 12,
    lag_explained_by: daysToExpected > 0
      ? [`publishes ~${daysToExpected} days from now`]
      : isOverdue
        ? ['overdue — audit cycle delayed']
        : ['normal monthly audit cycle'],
    is_overdue: isOverdue,
    status,
  };
}

// ── Main Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const baseUrl = new URL(request.url).origin;
  const today = new Date().toISOString().split('T')[0];

  // ── 0. Fetch holiday calendar (shared, cached) ──
  let holidaySet = new Set<string>();
  let allHolidays: Holiday[] = [];
  let holidayContext: HolidayContext | null = null;

  try {
    const hData = await getCachedHolidays();
    holidaySet = hData.holidaySet;
    allHolidays = hData.holidays;

    // Find upcoming holidays (next 14 days)
    const twoWeeksLater = new Date(today + 'T00:00:00');
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    const twoWeeksStr = twoWeeksLater.toISOString().split('T')[0];

    const upcoming = allHolidays
      .filter((h) => h.date > today && h.date <= twoWeeksStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    holidayContext = {
      today,
      todayIsBlackout: isDataBlackout(today, holidaySet),
      nextWorkingDay: getNextWorkingDay(today, holidaySet),
      prevWorkingDay: getPreviousWorkingDay(today, holidaySet),
      upcomingHolidays: upcoming,
    };
  } catch {
    // Holiday fetch failed — continue without holiday context
  }

  // ── 1-3. Fetch all external data in parallel ──
  // Local JSONs (small, fast) + headline API + prasarana meta run concurrently

  const threeMonthsAgo = new Date(Date.now() - 90 * 864e5)
    .toISOString()
    .split('T')[0];

  const [ktmbLocalDate, prasaranaLocalDate, headlineResult, prasaranaMetaResult, dosmOdResult] =
    await Promise.all([
      // 1a. KTMB daily — fetch LIVE from API (same as /api/ridership-ktmb-daily)
      // Falls back to local static only if API fails.
      (async (): Promise<string> => {
        // Try live API first (use date_start=30d ago to avoid fetching entire history)
        try {
          const res = await fetchWithTimeout(
            `https://api.data.gov.my/data-catalogue/?id=ridership_ktmb_daily&date_start=${threeMonthsAgo}@date`,
            8000
          );
          if (res && res.ok) {
            const rows = (await res.json()) as Array<{ date?: string }>;
            if (Array.isArray(rows) && rows.length > 0) {
              // Sort by date and take the latest
              const dates = rows
                .map((r) => (r.date ?? '').split(' ')[0])
                .filter(Boolean)
                .sort();
              return dates[dates.length - 1] ?? '';
            }
          }
        } catch { /* fall through to local */ }
        // Fallback: local static file
        return (await getLatestDateFromLocalJson(baseUrl, 'ktmb-daily.json')) ?? '';
      })(),
      // 1b. Prasarana daily — check local static (updated by GitHub Actions)
      // DOSM OD Daily metadata (fetched live above in step 4) is used for freshness instead.
      getLatestDateFromLocalJson(baseUrl, 'prasarana-daily.json'),
      // 2. Headline API (latest date from 3-month window)
      // NOTE: data.gov.my redirects to /data-catalogue/ (trailing slash)
      (async (): Promise<string> => {
        try {
          const res = await fetchWithTimeout(
            `https://api.data.gov.my/data-catalogue/?id=ridership_headline&date_start=${threeMonthsAgo}@date&date_end=${today}@date`,
            10000
          );
          if (res && res.ok) {
            const rows = (await res.json()) as Record<string, unknown>[];
            if (Array.isArray(rows) && rows.length > 0) {
              const dates = rows
                .map((r) => r.date as string)
                .filter(Boolean)
                .sort();
              return dates[dates.length - 1] ?? '';
            }
          }
        } catch { /* silently fail */ }
        return '';
      })(),
      // 3. Prasarana metadata from datagovmy-meta repo
      (async () => {
        try {
          const res = await fetchWithTimeout(
            'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/explorers/prasarana.json',
            8000
          );
          if (res && res.ok) {
            const prasarana = (await res.json()) as {
              data_last_updated?: string;
              data_next_update?: string;
              tables?: {
                PrasaranaTimeseries?: {
                  data_as_of?: string;
                  source?: string;
                };
              };
            };
            return {
              last_updated: prasarana.data_last_updated ?? '',
              next_update: prasarana.data_next_update ?? '',
              data_as_of: prasarana.tables?.PrasaranaTimeseries?.data_as_of ?? '',
              source: prasarana.tables?.PrasaranaTimeseries?.source ?? '',
            };
          }
        } catch { /* silently fail */ }
        return { data_as_of: '', last_updated: '', next_update: '', source: '' };
      })(),
      // 4. DOSM OD Daily metadata — LIVE from GitHub (not stale static file!)
      // The datagovmy-meta repo is updated by DOSM whenever data is published.
      // Fetching raw GitHub URL ensures we always get the latest data_as_of.
      (async () => {
        try {
          const [rrRes, brtRes] = await Promise.all([
            fetchWithTimeout(
              'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/data-catalogue/ridership_od_rapidrail_daily.json',
              8000
            ),
            fetchWithTimeout(
              'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/data-catalogue/ridership_od_brt_daily.json',
              8000
            ),
          ]);
          const rr: Record<string, unknown> | null = rrRes?.ok ? await rrRes.json() : null;
          const brt: Record<string, unknown> | null = brtRes?.ok ? await brtRes.json() : null;
          if (rr) {
            return {
              rapidrail: {
                data_as_of: (rr.data_as_of as string) ?? '',
                last_updated: (rr.last_updated as string) ?? '',
                exclude_openapi: (rr.exclude_openapi as boolean) ?? true,
              },
              brt: {
                data_as_of: (brt?.data_as_of as string) ?? '',
                last_updated: (brt?.last_updated as string) ?? '',
                exclude_openapi: (brt?.exclude_openapi as boolean) ?? true,
              },
            };
          }
        } catch { /* silently fail */ }
        return null;
      })(),
    ]);

  const headlineLatest = headlineResult;
  const prasaranaMeta = prasaranaMetaResult;

  // ── 4. Compute holiday-aware freshness ──
  const ktmbDate = ktmbLocalDate?.split(' ')[0] ?? '';
  const ktmbFreshness = computeODFreshness(ktmbDate, today, holidaySet);
  const prasaranaDate = prasaranaLocalDate ?? '';
  const prasaranaFreshness = computeODFreshness(prasaranaDate, today, holidaySet);
  const headlineFreshness = computeHeadlineFreshness(headlineLatest, today);

  // ── 5. Compute freshest date ──
  // ponytail: Only count data sources that the charts ACTUALLY display.
  // Prasarana Meta (GitHub) is excluded — it reflects upstream parquet publication,
  // not what the dashboard serves. Including it caused a misleading "3d ago" badge
  // when chart data was 41 days stale.
  const candidates: Array<{ date: string; source: string }> = [];
  if (ktmbFreshness.latest_date) candidates.push({ date: ktmbFreshness.latest_date, source: 'KTMB OD' });
  if (prasaranaFreshness.latest_date) candidates.push({ date: prasaranaFreshness.latest_date, source: 'Rapid Rail OD' });
  if (headlineFreshness.latest_date) candidates.push({ date: headlineFreshness.latest_date, source: 'Headline Audit' });

  // 5b. DOSM OD Daily — freshness from LIVE metadata, data from static file
  // The metadata is fetched live from GitHub (always fresh).
  // The actual chart data (dosm-od-daily-totals.json) is updated by GitHub Actions.
  let dosmOdDailyLatest = '';
  let dosmOdHasKajang = false;
  let dosmOdRowCount = 0;
  const dosmOdDate = dosmOdResult?.rapidrail?.data_as_of?.split(' ')[0] ?? '';
  if (dosmOdDate) {
    dosmOdDailyLatest = dosmOdDate;
    candidates.push({ date: dosmOdDate, source: 'DOSM OD Daily' });
    // Check if processed static data has MRT Kajang (for UI badge)
    try {
      const odData = await fetchWithTimeout(`${baseUrl}/dosm-od-daily-totals.json`, 5000);
      if (odData && odData.ok) {
        const odJson = (await odData.json()) as { data_as_of?: string; row_count?: number; data?: Array<{ mrt_kajang?: number }> };
        dosmOdRowCount = odJson.row_count ?? 0;
        if (odJson.data && odJson.data.length > 0) {
          dosmOdHasKajang = (odJson.data[odJson.data.length - 1].mrt_kajang ?? 0) > 0;
        }
      }
    } catch { /* skip */ }
  }
  const dosmOdFreshness = computeODFreshness(dosmOdDate, today, holidaySet);
  candidates.sort((a, b) => b.date.localeCompare(a.date));

  const freshest = candidates.length > 0 ? candidates[0] : { date: '', source: '' };

  // ── 6. Generate pipeline insights ──
  const insights: string[] = [];
  if (holidayContext) {
    if (holidayContext.todayIsBlackout) {
      insights.push('Today is a non-working day — next data batch expected on ' + holidayContext.nextWorkingDay);
    }
    if (ktmbFreshness.is_overdue) {
      insights.push('KTMB OD data is overdue — may indicate upstream batch failure');
    }
    if (prasaranaFreshness.is_overdue) {
      insights.push('Rapid Rail OD data is overdue — may indicate upstream batch failure');
    }
    if (holidayContext.upcomingHolidays.length > 0) {
      const next = holidayContext.upcomingHolidays[0];
      if (next.isMajor) {
        insights.push(`Major holiday upcoming: ${next.name} on ${next.date} — expect T+2 lag`);
      }
    }
    if (!ktmbFreshness.is_overdue && !prasaranaFreshness.is_overdue && !headlineFreshness.is_overdue) {
      insights.push('All pipelines operating within expected parameters');
    }
    if (dosmOdHasKajang && dosmOdDailyLatest) {
      insights.push(`DOSM OD Daily has MRT Kajang data through ${dosmOdDailyLatest} (new annual parquet source)`);
    }
  }

  const results: MetaResult = {
    headline: headlineFreshness,
    prasarana: prasaranaMeta,
    ktmb: ktmbFreshness,
    prasarana_od: prasaranaFreshness,
    dosm_od_daily: {
      meta: dosmOdResult ?? null,
      freshness: dosmOdFreshness,
      has_mrt_kajang: dosmOdHasKajang,
      row_count: dosmOdRowCount,
    },
    freshest_date: freshest.date,
    freshest_source: freshest.source,
    holiday_context: holidayContext,
    pipeline_insights: insights,
  };

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
}
