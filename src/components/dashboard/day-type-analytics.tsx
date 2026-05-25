'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Eye,
  EyeOff,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────

interface KtmbRow {
  date: string;
  ets: number;
  intercity: number;
  komuter: number;
  komuter_utara: number;
  tebrau: number;
  total: number;
}

interface PrasaranaRow {
  date: string;
  brt: number;
  lrt_ampang: number;
  lrt_kj: number;
  monorail: number;
  mrt_pjy: number;
  total: number;
}

interface Metadata {
  ktmb: { latest_date: string; lag_days: number };
  prasarana_od: { latest_date: string; lag_days: number };
  headline: { latest_date: string; lag_days: number };
  freshest_date: string;
  freshest_source: string;
}

interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

interface DayTypeResult {
  chartData: Array<Record<string, number | string>>;
  weekdayAvg: number;
  peakDay: string;
  peakValue: number;
  lowDay: string;
  lowValue: number;
  weekendWeekdayRatio: number;
  windowDays: number;
  windowStart: string;
  windowEnd: string;
  perServiceWeekdayAvg: Record<string, number>;
}

// ─── Constants ───────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const KTMB_SERVICES: SeriesDef[] = [
  { key: 'komuter', label: 'Komuter', color: '#2dd4bf' },
  { key: 'ets', label: 'ETS', color: '#06b6d4' },
  { key: 'komuter_utara', label: 'Komuter Utara', color: '#f472b6' },
  { key: 'intercity', label: 'Intercity', color: '#a3e635' },
  { key: 'tebrau', label: 'Shuttle Tebrau', color: '#facc15' },
];

const PRASARANA_LINES: SeriesDef[] = [
  { key: 'mrt_pjy', label: 'MRT Putrajaya', color: '#38bdf8' },
  { key: 'lrt_kj', label: 'LRT Kelana Jaya', color: '#a78bfa' },
  { key: 'lrt_ampang', label: 'LRT Ampang', color: '#fb7185' },
  { key: 'monorail', label: 'Monorail', color: '#34d399' },
  { key: 'brt', label: 'BRT Sunway', color: '#fdba74' },
];

const SKELETON_HEIGHTS = [60, 82, 48, 90, 74, 52, 68, 56, 80, 44, 70, 62, 84, 50];

// ─── Skeleton ───────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="h-[520px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--skeleton-bg)] backdrop-blur-md animate-pulse flex items-end gap-1 p-6">
      {SKELETON_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-[var(--skeleton-bg)] rounded-t"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

// ─── Computation ─────────────────────────────────────────────────────

function computeDayTypeAverages<T extends { date: string }>(
  data: T[],
  keys: string[],
  windowDays = 90
): DayTypeResult {
  if (!data.length) {
    return {
      chartData: [],
      weekdayAvg: 0,
      peakDay: 'N/A',
      peakValue: 0,
      lowDay: 'N/A',
      lowValue: 0,
      weekendWeekdayRatio: 0,
      windowDays: 0,
      windowStart: '',
      windowEnd: '',
      perServiceWeekdayAvg: {},
    };
  }

  const cutoff = subDays(new Date(), windowDays);

  // Filter to window
  const filtered = data.filter((d) => {
    const dateStr = d.date.split(' ')[0];
    const dt = new Date(dateStr + 'T00:00:00');
    return dt >= cutoff;
  });

  // Group by day-of-week (Mon=0, Sun=6)
  const buckets: Array<{
    day: number;
    values: Record<string, number[]>;
  }> = DAY_NAMES.map((_, i) => ({
    day: i,
    values: Object.fromEntries(keys.map((k) => [k, [] as number[]])),
  }));

  for (const row of filtered) {
    const dateStr = row.date.split(' ')[0];
    const dt = new Date(dateStr + 'T00:00:00');
    let dow = dt.getDay() - 1;
    if (dow < 0) dow = 6;

    for (const key of keys) {
      const val = (row as unknown as Record<string, unknown>)[key];
      if (typeof val === 'number') {
        buckets[dow].values[key].push(val);
      }
    }
  }

  // Compute averages per day
  const chartData = DAY_NAMES.map((day, i) => {
    const entry: Record<string, number | string> = {
      day,
      dayLabel: DAY_FULL[i],
    };
    for (const key of keys) {
      const vals = buckets[i].values[key];
      entry[key] =
        vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
    }
    entry.total = keys.reduce((s, k) => s + (entry[k] as number), 0);
    return entry;
  });

  // Weekday average (Mon-Fri, indices 0-4)
  const weekdayTotals = chartData.slice(0, 5).map((d) => d.total as number);
  const weekdayAvg = Math.round(
    weekdayTotals.reduce((s, v) => s + v, 0) / weekdayTotals.length
  );

  // Per-service weekday averages (for reference line label)
  const perServiceWeekdayAvg: Record<string, number> = {};
  for (const key of keys) {
    const vals = chartData.slice(0, 5).map((d) => d[key] as number);
    perServiceWeekdayAvg[key] =
      vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  }

  // Stats
  const totals = chartData.map((d) => d.total as number);
  const peakIdx = totals.indexOf(Math.max(...totals));
  const lowIdx = totals.indexOf(Math.min(...totals));

  const weekendTotals = [chartData[5].total, chartData[6].total] as number[];
  const weekendAvg =
    weekendTotals.reduce((s, v) => s + v, 0) / weekendTotals.length;
  const weekendWeekdayRatio =
    weekdayAvg > 0 ? Math.round((weekendAvg / weekdayAvg) * 100) / 100 : 0;

  return {
    chartData,
    weekdayAvg,
    peakDay: DAY_FULL[peakIdx],
    peakValue: totals[peakIdx],
    lowDay: DAY_FULL[lowIdx],
    lowValue: totals[lowIdx],
    weekendWeekdayRatio,
    windowDays: filtered.length,
    windowStart: filtered[0]?.date.split(' ')[0] ?? '',
    windowEnd: filtered[filtered.length - 1]?.date.split(' ')[0] ?? '',
    perServiceWeekdayAvg,
  };
}

// ─── Tooltip ─────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  payload?: {
    dayLabel?: string;
    total?: number;
  };
}

function DayTypeTooltip({
  active,
  payload,
  weekdayAvg,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  weekdayAvg: number;
}) {
  if (!active || !payload?.length) return null;
  const pl = payload[0]?.payload;
  const total = payload.reduce((sum, p) => sum + p.value, 0);
  const totalVsAvg =
    weekdayAvg > 0 ? Math.round(((total - weekdayAvg) / weekdayAvg) * 100) / 100 : 0;

  return (
    <div className="bg-[var(--bg-tooltip)] backdrop-blur-md border border-[var(--border-subtle)] rounded-xl p-3 shadow-xl min-w-[240px]">
      <p className="text-[10px] font-medium text-[#85AB8B] uppercase tracking-widest mb-1">
        {pl?.dayLabel ?? ''}
      </p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11px] text-[var(--text-muted)]">
                {item.name}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
        <div className="border-t border-[var(--border-faint)] pt-1 mt-1">
          <div className="flex items-center justify-between gap-6">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Total
            </span>
            <span className="text-[11px] font-bold text-[var(--text-primary)] tabular-nums">
              {total.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6 mt-0.5">
            <span className="text-[10px] text-[var(--text-faint)]">vs Wkday Avg</span>
            <span
              className={`text-[10px] font-semibold tabular-nums ${
                totalVsAvg >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {totalVsAvg >= 0 ? '+' : ''}
              {(totalVsAvg * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function DayTypeAnalytics() {
  const [ktmbData, setKtmbData] = useState<KtmbRow[]>([]);
  const [prasData, setPrasData] = useState<PrasaranaRow[]>([]);
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [activeTab, setActiveTab] = useState<'ktmb' | 'prasarana'>('ktmb');
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch data on mount
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ktmb, pras, metadata] = await Promise.all([
        fetch('/ktmb-daily.json').then((r) => r.json()),
        fetch('/prasarana-daily.json').then((r) => r.json()),
        fetch('/api/metadata').then((r) => r.json()).catch(() => null),
      ]);
      setKtmbData(ktmb);
      setPrasData(pras);
      setMeta(metadata);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute KTMB day-type averages
  const ktmbResult = useMemo(
    () =>
      computeDayTypeAverages<KtmbRow>(
        ktmbData,
        KTMB_SERVICES.map((s) => s.key)
      ),
    [ktmbData]
  );

  // Compute Prasarana day-type averages
  const prasResult = useMemo(
    () =>
      computeDayTypeAverages<PrasaranaRow>(
        prasData,
        PRASARANA_LINES.map((s) => s.key)
      ),
    [prasData]
  );

  // Current result based on active tab
  const result = activeTab === 'ktmb' ? ktmbResult : prasResult;
  const series = activeTab === 'ktmb' ? KTMB_SERVICES : PRASARANA_LINES;

  // Toggle line visibility
  const toggleLine = useCallback((key: string) => {
    setHiddenLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const showAll = useCallback(() => setHiddenLines(new Set()), []);
  const hideAll = useCallback(
    () => setHiddenLines(new Set(series.map((s) => s.key))),
    [series]
  );

  // Format helper for Y-axis
  const formatY = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return v.toString();
  };

  // Dynamic lag label
  const lagLabel = useMemo(() => {
    if (!meta?.freshest_date) return '';
    const dateMs = new Date(meta.freshest_date + 'T00:00:00').getTime();
    const hoursAgo = Math.round((Date.now() - dateMs) / 36e5);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    return `${Math.round(hoursAgo / 24)}d ago`;
  }, [meta]);

  if (loading) return <ChartSkeleton />;

  if (!result.chartData.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md flex items-center justify-center h-[520px]">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-[var(--text-ghost)] mx-auto mb-2" />
          <p className="text-[var(--text-faint)] text-sm">
            No daily data available for day-type analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-chart
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up"
    >
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4 text-[#85AB8B]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Day-Type Analytics
              </h3>
            </div>
            <p className="text-[10px] text-[var(--text-faint)] mt-1 ml-[26px]">
              Averages computed over{' '}
              <span className="text-[var(--text-muted)] font-medium">
                {result.windowDays}-day window
              </span>
              {result.windowStart && (
                <>
                  {' '}
                  ·{' '}
                  <span className="text-[var(--text-muted)] font-medium tabular-nums">
                    {result.windowStart}
                  </span>{' '}
                  →{' '}
                  <span className="text-[var(--text-muted)] font-medium tabular-nums">
                    {result.windowEnd}
                  </span>
                </>
              )}{' '}
              · Baseline:{' '}
              <span className="text-[#85AB8B] font-medium">Weekday Avg</span>
            </p>
          </div>

          {/* Dynamic timestamp badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {meta?.freshest_date && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#85AB8B]/10 border border-[#85AB8B]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#85AB8B] animate-pulse" />
                <span className="text-[9px] text-[#85AB8B] font-medium tabular-nums">
                  {meta.freshest_date}
                </span>
                {lagLabel && (
                  <span className="text-[9px] text-[#85AB8B]/60">({lagLabel})</span>
                )}
              </div>
            )}
            <button
              onClick={fetchData}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:border-[var(--border-subtle)] transition-all"
              title="Refresh data"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab('ktmb');
              setHiddenLines(new Set());
            }}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              activeTab === 'ktmb'
                ? 'bg-teal-400/10 text-teal-400 border border-teal-400/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-subtle)]'
            }`}
          >
            KTMB Services
          </button>
          <button
            onClick={() => {
              setActiveTab('prasarana');
              setHiddenLines(new Set());
            }}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              activeTab === 'prasarana'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-subtle)]'
            }`}
          >
            Rapid Rail Lines
          </button>

          <div className="w-px h-5 bg-[var(--border-subtle)] mx-1" />

          <button
            onClick={showAll}
            className="p-1.5 rounded-lg text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-all"
            title="Show all lines"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={hideAll}
            className="p-1.5 rounded-lg text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-all"
            title="Hide all lines"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Line toggles ── */}
        <div className="flex flex-wrap items-center gap-2">
          {series.map((s) => {
            const isHidden = hiddenLines.has(s.key);
            return (
              <button
                key={s.key}
                onClick={() => toggleLine(s.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border ${
                  isHidden
                    ? 'bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-ghost)] opacity-50'
                    : 'bg-[var(--bg-elevated)] border-[var(--border-faint)] text-[var(--text-muted)] hover:border-[var(--border-subtle)]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 transition-opacity"
                  style={{
                    backgroundColor: s.color,
                    opacity: isHidden ? 0.3 : 1,
                  }}
                />
                <span className={isHidden ? 'line-through' : ''}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">
              Peak Day
            </span>
          </div>
          <div className="text-base font-semibold text-[var(--text-primary)] tabular-nums tracking-tight">
            {result.peakDay}
          </div>
          <span className="text-[10px] text-[var(--text-faint)] tabular-nums">
            {result.peakValue.toLocaleString()} avg
          </span>
        </div>

        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">
              Lowest Day
            </span>
          </div>
          <div className="text-base font-semibold text-[var(--text-primary)] tabular-nums tracking-tight">
            {result.lowDay}
          </div>
          <span className="text-[10px] text-[var(--text-faint)] tabular-nums">
            {result.lowValue.toLocaleString()} avg
          </span>
        </div>

        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">
            Weekend / Weekday
          </span>
          <div className="text-base font-semibold text-[var(--text-primary)] tabular-nums tracking-tight mt-1">
            {result.weekendWeekdayRatio.toFixed(2)}
          </div>
          <span className="text-[10px] text-[var(--text-faint)]">ratio</span>
        </div>

        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <div className="flex items-center gap-1 mb-1">
            <CalendarDays className="w-3 h-3 text-[#85AB8B]" />
            <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">
              Weekday Avg
            </span>
          </div>
          <div className="text-base font-semibold text-[#85AB8B] tabular-nums tracking-tight">
            {result.weekdayAvg.toLocaleString()}
          </div>
          <span className="text-[10px] text-[var(--text-faint)]">baseline</span>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="h-64 sm:h-72 md:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={result.chartData}
            margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
            barCategoryGap="14%"
          >
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={s.key}
                  id={`dt-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--chart-grid)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              stroke="var(--chart-axis)"
              fontSize={11}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              stroke="var(--chart-axis)"
              fontSize={10}
              tickFormatter={formatY}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={
                <DayTypeTooltip weekdayAvg={result.weekdayAvg} />
              }
              cursor={{ fill: 'var(--chart-hover)', radius: 4 }}
            />

            {/* Weekday Average reference line */}
            <ReferenceLine
              y={result.weekdayAvg}
              stroke="#85AB8B"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              strokeOpacity={0.6}
              label={{
                value: `Weekday Avg: ${result.weekdayAvg.toLocaleString()}`,
                position: 'insideTopRight',
                fill: '#85AB8B',
                fontSize: 10,
                fontWeight: 500,
              }}
            />

            {/* Stacked bars — only show visible series */}
            {series.map((s) =>
              !hiddenLines.has(s.key) ? (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={`url(#dt-${s.key})`}
                  stackId="daytype"
                  maxBarSize={52}
                  radius={
                    series.filter((x) => !hiddenLines.has(x.key)).indexOf(s) ===
                    series.filter((x) => !hiddenLines.has(x.key)).length - 1
                      ? [4, 4, 0, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ) : null
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--border-faint)]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[10px] text-[var(--text-faint)]">
            <span className="text-[var(--text-muted)] font-medium">
              Window:
            </span>{' '}
            {result.windowDays} days
            {result.windowStart && (
              <>
                {' '}
                ·{' '}
                <span className="tabular-nums">
                  {result.windowStart} → {result.windowEnd}
                </span>
              </>
            )}
          </span>
          <span className="text-[10px] text-[var(--text-faint)]">
            <span className="text-[var(--text-muted)] font-medium">
              {activeTab === 'ktmb' ? 'Services' : 'Lines'}:
            </span>{' '}
            {series.filter((s) => !hiddenLines.has(s.key)).length}/
            {series.length} visible
          </span>
        </div>
        <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
          Source: data.gov.my · parquet
        </span>
      </div>
    </div>
  );
}
