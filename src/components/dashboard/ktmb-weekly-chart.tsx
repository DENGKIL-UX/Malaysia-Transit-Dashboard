'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { format, startOfWeek, subWeeks, endOfWeek, isSameWeek, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useKtmbDaily } from '@/hooks/use-ktmb-daily';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SERVICES = [
  { key: 'komuter', label: 'Komuter', color: '#2dd4bf' },
  { key: 'ets', label: 'ETS', color: '#06b6d4' },
  { key: 'komuterUtara', label: 'Komuter Utara', color: '#f472b6' },
  { key: 'intercity', label: 'Intercity', color: '#a3e635' },
  { key: 'shuttleTebrau', label: 'Shuttle Tebrau', color: '#facc15' },
] as const;

// Deterministic skeleton heights
const SKELETON_HEIGHTS = [62, 78, 45, 85, 70, 55, 90, 48, 72, 60, 82, 50, 68, 40];

function ChartSkeleton() {
  return (
    <div className="h-[440px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--skeleton-bg)] backdrop-blur-md animate-pulse flex items-end gap-1 p-6">
      {SKELETON_HEIGHTS.map((h, i) => (
        <div key={i} className="flex-1 bg-[var(--skeleton-bg)] rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  payload?: {
    dayLabel?: string;
    weekLabel?: string;
  };
}

function StackedTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const pl = payload[0]?.payload;
  const total = payload.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="bg-[var(--bg-tooltip)] backdrop-blur-md border border-[var(--border-subtle)] rounded-xl p-3 shadow-xl min-w-[200px]">
      <p className="text-[10px] font-medium text-[#85AB8B] uppercase tracking-widest mb-1">
        {pl?.dayLabel ?? label}
      </p>
      {pl?.weekLabel && (
        <p className="text-[9px] text-[var(--text-faint)] mb-2">{pl.weekLabel}</p>
      )}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-[var(--text-muted)]">{item.name}</span>
            </div>
            <span className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
        <div className="border-t border-[var(--border-faint)] pt-1 mt-1 flex items-center justify-between gap-6">
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">Total</span>
          <span className="text-[11px] font-bold text-[var(--text-primary)] tabular-nums">
            {total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function KtmbWeeklyChart() {
  const { data, loading, error } = useKtmbDaily(8);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = last week, etc.

  // Compute all available week boundaries from the data
  const { weeks, currentWeekIndex } = useMemo(() => {
    if (!data.length) return { weeks: [], currentWeekIndex: 0 };

    const latestDate = data[data.length - 1].date;
    const latest = parseISO(latestDate);
    const currentMonday = startOfWeek(latest, { weekStartsOn: 1 });

    // Build list of all weeks that have data
    const weekMondays: Date[] = [];
    const seen = new Set<string>();

    for (const d of data) {
      const dt = parseISO(d.date);
      const monday = startOfWeek(dt, { weekStartsOn: 1 });
      const key = format(monday, 'yyyy-MM-dd');
      if (!seen.has(key)) {
        seen.add(key);
        weekMondays.push(monday);
      }
    }

    // Sort descending (newest first)
    weekMondays.sort((a, b) => b.getTime() - a.getTime());

    // Find current week index
    const currentKey = format(currentMonday, 'yyyy-MM-dd');
    const idx = weekMondays.findIndex((w) => format(w, 'yyyy-MM-dd') === currentKey);

    return { weeks: weekMondays, currentWeekIndex: idx >= 0 ? idx : 0 };
  }, [data]);

  // Clamp offset to available weeks
  const safeOffset = Math.min(weekOffset, Math.max(0, weeks.length - 1));
  const activeMonday = weeks[safeOffset] ?? weeks[0];

  const canGoPrev = safeOffset < weeks.length - 1;
  const canGoNext = safeOffset > 0;

  const goPrev = useCallback(() => {
    if (canGoPrev) setWeekOffset((o) => o + 1);
  }, [canGoPrev]);

  const goNext = useCallback(() => {
    if (canGoNext) setWeekOffset((o) => o - 1);
  }, [canGoNext]);

  // Build chart data for the active week and the previous week
  const { chartData, weekTotal, prevWeekTotal, dailyAvg, weekDelta, weekLabel, prevWeekLabel } = useMemo(() => {
    if (!activeMonday || !data.length) {
      return { chartData: [], weekTotal: 0, prevWeekTotal: 0, dailyAvg: 0, weekDelta: 0, weekLabel: '', prevWeekLabel: '' };
    }

    type ServiceKey = 'ets' | 'intercity' | 'komuter' | 'komuterUtara' | 'shuttleTebrau';

    const currentSunday = endOfWeek(activeMonday, { weekStartsOn: 1 });
    const prevMonday = subWeeks(activeMonday, 1);
    const prevSunday = endOfWeek(prevMonday, { weekStartsOn: 1 });

    const currentMap = new Map<number, Record<ServiceKey, number>>();
    const prevMap = new Map<number, Record<ServiceKey, number>>();
    const currentTotals: number[] = [];
    const prevTotals: number[] = [];

    for (const d of data) {
      const dt = parseISO(d.date);
      const dow = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
      const entry = { ets: d.ets, intercity: d.intercity, komuter: d.komuter, komuterUtara: d.komuterUtara, shuttleTebrau: d.shuttleTebrau };

      if (isSameWeek(dt, activeMonday, { weekStartsOn: 1 })) {
        currentMap.set(dow, entry);
        currentTotals.push(d.total);
      } else if (isSameWeek(dt, prevMonday, { weekStartsOn: 1 })) {
        prevMap.set(dow, entry);
        prevTotals.push(d.total);
      }
    }

    const bars = DAY_NAMES.map((day, i) => {
      const cur = currentMap.get(i);
      const dt = new Date(activeMonday.getTime() + i * 864e5);
      const dateStr = format(dt, 'dd MMM');

      return {
        day,
        dayLabel: `${DAY_FULL[i]}, ${dateStr}`,
        weekLabel: `${format(activeMonday, 'dd MMM')} – ${format(currentSunday, 'dd MMM yyyy')}`,
        ets: cur?.ets ?? 0,
        intercity: cur?.intercity ?? 0,
        komuter: cur?.komuter ?? 0,
        komuterUtara: cur?.komuterUtara ?? 0,
        shuttleTebrau: cur?.shuttleTebrau ?? 0,
        total: cur ? (cur.ets + cur.intercity + cur.komuter + cur.komuterUtara + cur.shuttleTebrau) : 0,
        hasData: !!cur,
      };
    });

    const wTotal = currentTotals.reduce((a, b) => a + b, 0);
    const pTotal = prevTotals.reduce((a, b) => a + b, 0);
    const avg = currentTotals.length > 0 ? Math.round(wTotal / currentTotals.length) : 0;
    const delta = pTotal > 0 ? ((wTotal - pTotal) / pTotal) * 100 : 0;

    return {
      chartData: bars,
      weekTotal: wTotal,
      prevWeekTotal: pTotal,
      dailyAvg: avg,
      weekDelta: delta,
      weekLabel: `${format(activeMonday, 'dd MMM')} – ${format(currentSunday, 'dd MMM yyyy')}`,
      prevWeekLabel: `${format(prevMonday, 'dd MMM')} – ${format(prevSunday, 'dd MMM yyyy')}`,
    };
  }, [activeMonday, data]);

  if (loading) return <ChartSkeleton />;
  if (error || !chartData.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md flex items-center justify-center h-[440px]">
        <div className="text-center">
          <p className="text-[var(--text-faint)] text-sm">No KTMB daily data available</p>
          {error && <p className="text-red-400/60 text-[10px] mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  const isPositive = weekDelta > 0;
  const isNegative = weekDelta < 0;

  return (
    <div data-chart className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            KTMB Daily Ridership — By Service
          </h3>
          <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
            Stacked Mon – Sun · {weekLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pagination */}
          <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
            <button
              onClick={goPrev}
              disabled={!canGoPrev}
              className="flex items-center justify-center w-8 h-8 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-active)] active:bg-[var(--border-subtle)]"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
            <div className="flex items-center px-2.5 min-w-[120px] justify-center">
              <span className="text-[10px] font-medium text-[var(--text-secondary)] tabular-nums">
                {safeOffset === 0 ? 'This Week' : `${weeks.length - safeOffset} / ${weeks.length}`}
              </span>
            </div>
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className="flex items-center justify-center w-8 h-8 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-active)] active:bg-[var(--border-subtle)]"
              aria-label="Next week"
            >
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          </div>
          {/* Status badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[9px] text-amber-400 font-medium">T-1 to T-3 (calendar dependent)</span>
          </div>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">Weekly Total</span>
          <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums tracking-tight mt-0.5">
            {weekTotal.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">Daily Avg</span>
          <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums tracking-tight mt-0.5">
            {dailyAvg.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">vs Prev Week</span>
          <div className={`text-lg font-semibold tabular-nums tracking-tight mt-0.5 flex items-center gap-1 ${
            isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-[var(--text-muted)]'
          }`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : isNegative ? <TrendingDown className="w-4 h-4" /> : null}
            {Math.abs(weekDelta).toFixed(1)}%
          </div>
          {prevWeekLabel && (
            <span className="text-[9px] text-[var(--text-faint)]">
              {prevWeekLabel}
            </span>
          )}
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="h-64 sm:h-72 md:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barCategoryGap="16%">
            <defs>
              {SERVICES.map((s) => (
                <linearGradient key={s.key} id={`ktmb-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.55} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="day" stroke="var(--chart-axis)" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={8} />
            <YAxis stroke="var(--chart-axis)" fontSize={10} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString())} tickLine={false} axisLine={false} />
            <Tooltip content={<StackedTooltip />} cursor={{ fill: 'var(--chart-hover)', radius: 4 }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
              formatter={(value: string) => <span className="text-[var(--text-muted)]">{value}</span>}
            />
            {SERVICES.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={`url(#ktmb-${s.key})`}
                stackId="ktmb"
                maxBarSize={52}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-faint)]">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-[var(--text-faint)]">
            <span className="text-[var(--text-muted)] font-medium">Showing:</span> {weekLabel}
          </span>
          {prevWeekTotal > 0 && (
            <span className="text-[10px] text-[var(--text-faint)]">
              <span className="text-[var(--text-muted)] font-medium">Prev:</span> {prevWeekLabel} · <span className="text-emerald-400">{prevWeekTotal.toLocaleString()}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
            {weeks.length} weeks available
          </span>
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">Source: data.gov.my · parquet</span>
        </div>
      </div>
    </div>
  );
}
