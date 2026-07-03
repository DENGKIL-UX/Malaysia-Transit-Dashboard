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
  eachDayOfInterval,
  getDaysInMonth,
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
  /** Human-readable current-period label, e.g. "Jul 2026 (3 days)" */
  currentLabel: string;
  /** Human-readable previous-period label, e.g. "Jun 2026" */
  previousLabel: string;
  /** Previous period total for display */
  previousValue: number;
  /** Accent colour key consumed by the component */
  accent: 'amber' | 'teal' | 'emerald';
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
    total += Number(row[key] ?? 0);
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
 * Month-over-Month: This Month (partial) vs Last Month (full)
 */
function buildMoM(rows: RawRow[], now: Date): PeriodResult {
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = now;
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const currentValue = sumRowsInRange(rows, thisMonthStart, thisMonthEnd);
  const currentDays = countRowsInRange(rows, thisMonthStart, thisMonthEnd);
  const previousValue = sumRowsInRange(rows, lastMonthStart, lastMonthEnd);
  const previousDays = countRowsInRange(rows, lastMonthStart, lastMonthEnd);

  const pctChange = calcPctChange(currentValue, previousValue);

  return {
    label: 'Month-over-Month',
    value: currentValue,
    days: currentDays,
    pctChange,
    trend: toTrend(pctChange),
    currentLabel: `${format(thisMonthStart, 'MMM yyyy')} (${currentDays} day${currentDays !== 1 ? 's' : ''})`,
    previousLabel: format(lastMonthStart, 'MMM yyyy'),
    previousValue,
    accent: 'amber',
  };
}

/**
 * Week-over-Week: This Week (Mon-Sun) vs Last Week (Mon-Sun)
 */
function buildWoW(rows: RawRow[], now: Date): PeriodResult {
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  const currentValue = sumRowsInRange(rows, thisWeekStart, thisWeekEnd);
  const currentDays = countRowsInRange(rows, thisWeekStart, thisWeekEnd);
  const previousValue = sumRowsInRange(rows, lastWeekStart, lastWeekEnd);
  const previousDays = countRowsInRange(rows, lastWeekStart, lastWeekEnd);

  const pctChange = calcPctChange(currentValue, previousValue);

  return {
    label: 'Week-over-Week',
    value: currentValue,
    days: currentDays,
    pctChange,
    trend: toTrend(pctChange),
    currentLabel: `${format(thisWeekStart, 'd MMM')} – ${format(thisWeekEnd, 'd MMM yyyy')} (${currentDays} day${currentDays !== 1 ? 's' : ''})`,
    previousLabel: `${format(lastWeekStart, 'd MMM')} – ${format(lastWeekEnd, 'd MMM yyyy')}`,
    previousValue,
    accent: 'teal',
  };
}

/**
 * Year-over-Year: This Month (partial, annualized) vs Same Month Last Year (full)
 *
 * Annualization: daily avg of this month so far × total days in this month
 */
function buildYoY(rows: RawRow[], now: Date): PeriodResult {
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = now;
  const sameMonthLastYearStart = startOfMonth(subYears(now, 1));
  const sameMonthLastYearEnd = endOfMonth(subYears(now, 1));

  const rawThisMonth = sumRowsInRange(rows, thisMonthStart, thisMonthEnd);
  const currentDays = countRowsInRange(rows, thisMonthStart, thisMonthEnd);
  const previousValue = sumRowsInRange(rows, sameMonthLastYearStart, sameMonthLastYearEnd);
  const previousDays = countRowsInRange(rows, sameMonthLastYearStart, sameMonthLastYearEnd);

  // Annualize: project partial month to full month
  const daysInMonth = getDaysInMonth(now);
  const projectedValue =
    currentDays > 0 ? Math.round((rawThisMonth / currentDays) * daysInMonth) : 0;

  const pctChange = calcPctChange(projectedValue, previousValue);

  return {
    label: 'Year-over-Year',
    value: projectedValue,
    days: daysInMonth,
    pctChange,
    trend: toTrend(pctChange),
    currentLabel: `${format(thisMonthStart, 'MMM yyyy')} (projected, ${daysInMonth} days)`,
    previousLabel: format(sameMonthLastYearStart, 'MMM yyyy'),
    previousValue,
    accent: 'emerald',
  };
}