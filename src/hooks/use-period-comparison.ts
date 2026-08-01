'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subWeeks,
  subMonths,
  subYears,
  differenceInCalendarDays,
  addDays,
} from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Trend = 'up' | 'down' | 'neutral';

export interface PeriodResult {
  label: string;
  value: number;
  days: number;
  pctChange: number;
  trend: Trend;
  /** Human-readable current-period label, e.g. "Aug 1–3 2026 (3 days)" */
  currentLabel: string;
  /** Human-readable previous-period label, e.g. "Jul 1–3 2026" */
  previousLabel: string;
  /** Previous period total for display */
  previousValue: number;
  /** Accent colour key consumed by the component */
  accent: 'amber' | 'teal' | 'emerald';
  /** True when current window has 0 days with data */
  pending?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** The 10 rail fields we sum for "total riders". */
const RAIL_KEYS = [
  'rail_mrt_kajang',
  'rail_mrt_pjy',
  'rail_lrt_kj',
  'rail_lrt_ampang',
  'rail_monorail',
  'rail_komuter',
  'rail_ets',
  'rail_intercity',
  'rail_komuter_utara',
  'rail_tebrau',
] as const;

type RawRow = Record<string, unknown>;

function sumRail(row: RawRow): number {
  let total = 0;
  for (const key of RAIL_KEYS) {
    const v = row[key];
    if (v != null) total += Number(v);
    // null = data unavailable, excluded from sum (not treated as 0)
  }
  return total;
}

function sumRowsInRange(rows: RawRow[], start: Date, end: Date): number {
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');
  let total = 0;
  for (const row of rows) {
    const d = row.date as string;
    if (d >= startStr && d <= endStr) {
      total += sumRail(row);
    }
  }
  return total;
}

function countRowsInRange(rows: RawRow[], start: Date, end: Date): number {
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');
  let count = 0;
  for (const row of rows) {
    const d = row.date as string;
    if (d >= startStr && d <= endStr) {
      count++;
    }
  }
  return count;
}

function calcPctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function toTrend(pct: number): Trend {
  if (pct > 0.5) return 'up';
  if (pct < -0.5) return 'down';
  return 'neutral';
}

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */

let cachedRows: { rows: RawRow[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function usePeriodComparison() {
  const [comparisons, setComparisons] = useState<PeriodResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();

      // Fetch 13 months back to guarantee YoY coverage
      const startDate = format(subMonths(startOfMonth(now), 13), 'yyyy-MM-dd');
      const endDate = format(now, 'yyyy-MM-dd');

      // Check cache
      if (
        cachedRows &&
        Date.now() - cachedRows.timestamp < CACHE_TTL_MS &&
        cachedRows.rows.length > 0
      ) {
        setComparisons(buildComparisons(cachedRows.rows, now));
        setLoading(false);
        return;
      }

      const url = `/api/comparison-data?start_date=${startDate}&end_date=${endDate}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const json = await res.json();
      const rows: RawRow[] = json.data ?? [];

      cachedRows = { rows, timestamp: Date.now() };
      setComparisons(buildComparisons(rows, now));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    compute();
  }, [compute]);

  return { comparisons, loading, error, refetch: compute };
}

/* ------------------------------------------------------------------ */
/*  Comparison builder                                                 */
/* ------------------------------------------------------------------ */

function buildComparisons(rows: RawRow[], now: Date): PeriodResult[] {
  return [
    buildMoM(rows, now),
    buildWoW(rows, now),
    buildYoY(rows, now),
  ];
}

/**
 * Month-over-Month: current month day 1–today vs the SAME dates of the previous month (both N days).
 * Labels e.g. "Aug 1–3 2026 (3 days)" vs "Jul 1–3 2026".
 */
function buildMoM(rows: RawRow[], now: Date): PeriodResult {
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = now;
  const daysCount = differenceInCalendarDays(thisMonthEnd, thisMonthStart) + 1;

  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = addDays(lastMonthStart, daysCount - 1);
  const clampedLastMonthEnd = lastMonthEnd > endOfMonth(subMonths(now, 1))
    ? endOfMonth(subMonths(now, 1))
    : lastMonthEnd;

  const currentDays = countRowsInRange(rows, thisMonthStart, thisMonthEnd);
  const pending = currentDays === 0;

  const currentValue = pending ? 0 : sumRowsInRange(rows, thisMonthStart, thisMonthEnd);
  const previousValue = sumRowsInRange(rows, lastMonthStart, clampedLastMonthEnd);

  const pctChange = pending ? 0 : calcPctChange(currentValue, previousValue);

  const currentLabel = daysCount === 1
    ? `${format(thisMonthStart, 'MMM d yyyy')} (1 day)`
    : `${format(thisMonthStart, 'MMM')} 1–${format(thisMonthEnd, 'd yyyy')} (${daysCount} days)`;

  const previousLabel = daysCount === 1
    ? format(lastMonthStart, 'MMM d yyyy')
    : `${format(lastMonthStart, 'MMM')} 1–${format(clampedLastMonthEnd, 'd yyyy')}`;

  return {
    label: 'Month-over-Month',
    value: currentValue,
    days: daysCount,
    pctChange,
    trend: toTrend(pctChange),
    currentLabel,
    previousLabel,
    previousValue,
    accent: 'amber',
    pending,
  };
}

/**
 * Week-over-Week: this week Mon–today vs last week Mon–same-weekday (both N days).
 * Labels e.g. "Mon 27 Jul – Sat 1 Aug (6 days)" vs "Mon 20 – Sat 25 Jul 2026".
 */
function buildWoW(rows: RawRow[], now: Date): PeriodResult {
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = now;
  const daysCount = differenceInCalendarDays(thisWeekEnd, thisWeekStart) + 1;

  const lastWeekStart = subWeeks(thisWeekStart, 1);
  const lastWeekEnd = addDays(lastWeekStart, daysCount - 1);

  const currentDays = countRowsInRange(rows, thisWeekStart, thisWeekEnd);
  const pending = currentDays === 0;

  const currentValue = pending ? 0 : sumRowsInRange(rows, thisWeekStart, thisWeekEnd);
  const previousValue = sumRowsInRange(rows, lastWeekStart, lastWeekEnd);

  const pctChange = pending ? 0 : calcPctChange(currentValue, previousValue);

  const currentLabel = `${format(thisWeekStart, 'EEE d MMM')} – ${format(thisWeekEnd, 'EEE d MMM yyyy')} (${daysCount} day${daysCount !== 1 ? 's' : ''})`;

  const sameMonth = lastWeekStart.getMonth() === lastWeekEnd.getMonth();
  const previousLabel = sameMonth
    ? `${format(lastWeekStart, 'EEE d')} – ${format(lastWeekEnd, 'EEE d MMM yyyy')}`
    : `${format(lastWeekStart, 'EEE d MMM')} – ${format(lastWeekEnd, 'EEE d MMM yyyy')}`;

  return {
    label: 'Week-over-Week',
    value: currentValue,
    days: daysCount,
    pctChange,
    trend: toTrend(pctChange),
    currentLabel,
    previousLabel,
    previousValue,
    accent: 'teal',
    pending,
  };
}

/**
 * Year-over-Year: current month day 1–today vs same dates of the same month LAST YEAR (actual values, drop projected annualization).
 */
function buildYoY(rows: RawRow[], now: Date): PeriodResult {
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = now;
  const daysCount = differenceInCalendarDays(thisMonthEnd, thisMonthStart) + 1;

  const sameMonthLastYearStart = startOfMonth(subYears(now, 1));
  const sameMonthLastYearEnd = addDays(sameMonthLastYearStart, daysCount - 1);
  const clampedLastYearEnd = sameMonthLastYearEnd > endOfMonth(subYears(now, 1))
    ? endOfMonth(subYears(now, 1))
    : sameMonthLastYearEnd;

  const currentDays = countRowsInRange(rows, thisMonthStart, thisMonthEnd);
  const pending = currentDays === 0;

  const currentValue = pending ? 0 : sumRowsInRange(rows, thisMonthStart, thisMonthEnd);
  const previousValue = sumRowsInRange(rows, sameMonthLastYearStart, clampedLastYearEnd);

  const pctChange = pending ? 0 : calcPctChange(currentValue, previousValue);

  const currentLabel = daysCount === 1
    ? `${format(thisMonthStart, 'MMM d yyyy')} (1 day)`
    : `${format(thisMonthStart, 'MMM')} 1–${format(thisMonthEnd, 'd yyyy')} (${daysCount} days)`;

  const previousLabel = daysCount === 1
    ? format(sameMonthLastYearStart, 'MMM d yyyy')
    : `${format(sameMonthLastYearStart, 'MMM')} 1–${format(clampedLastYearEnd, 'd yyyy')}`;

  return {
    label: 'Year-over-Year',
    value: currentValue,
    days: daysCount,
    pctChange,
    trend: toTrend(pctChange),
    currentLabel,
    previousLabel,
    previousValue,
    accent: 'emerald',
    pending,
  };
}
