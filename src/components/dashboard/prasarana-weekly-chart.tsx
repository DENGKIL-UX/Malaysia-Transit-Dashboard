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
import { usePrasaranaDaily } from '@/hooks/use-prasarana-daily';
import { TrendingUp, TrendingDown, Bus, ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const LINES = [
  { key: 'mrt_pjy', label: 'MRT Putrajaya', color: '#38bdf8' },
  { key: 'lrt_kj', label: 'LRT Kelana Jaya', color: '#a78bfa' },
  { key: 'lrt_ampang', label: 'LRT Ampang', color: '#fb7185' },
  { key: 'monorail', label: 'Monorail', color: '#34d399' },
  { key: 'brt', label: 'BRT Sunway', color: '#fdba74' },
] as const;

const SKELETON_HEIGHTS = [55, 80, 42, 88, 72, 50, 85, 48, 70, 60, 82, 52, 68, 38];

function ChartSkeleton() {
  return (
    <div className="h-[460px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--skeleton-bg)] backdrop-blur-md animate-pulse flex items-end gap-1 p-6">
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
    <div className="bg-[var(--bg-tooltip)] backdrop-blur-md border border-[var(--border-subtle)] rounded-xl p-3 shadow-xl min-w-[220px]">
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

export function PrasaranaWeeklyChart() {
  const { data, loading, error } = usePrasaranaDaily();
  const [weekOffset, setWeekOffset] = useState(0);

  // Compute all available week boundaries from the data
  const { weeks, currentWeekIndex } = useMemo(() => {
    if (!data.length) return { weeks: [] as Date[], currentWeekIndex: 0 };

    const latestDate = data[data.length - 1].date;
    const latest = parseISO(latestDate);
    const currentMonday = startOfWeek(latest, { weekStartsOn: 1 });

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

    weekMondays.sort((a, b) => b.getTime() - a.getTime());

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
  const { chartData, weekTotal, prevWeekTotal, dailyAvg, weekDelta, brtWeekTotal, weekLabel, prevWeekLabel } = useMemo(() => {
    if (!activeMonday || !data.length) {
      return {
        chartData: [], weekTotal: 0, prevWeekTotal: 0, dailyAvg: 0,
        weekDelta: 0, brtWeekTotal: 0, weekLabel: '', prevWeekLabel: '',
      };
    }

    type LineKey = 'mrt_pjy' | 'lrt_kj' | 'lrt_ampang' | 'monorail' | 'brt';

    const currentSunday = endOfWeek(activeMonday, { weekStartsOn: 1 });
    const prevMonday = subWeeks(activeMonday, 1);
    const prevSunday = endOfWeek(prevMonday, { weekStartsOn: 1 });

    const currentMap = new Map<number, Record<LineKey, number>>();
    const prevMap = new Map<number, Record<LineKey, number>>();
    const currentTotals: number[] = [];
    const prevTotals: number[] = [];
    const brtCurrent: number[] = [];

    for (const d of data) {
      const dt = parseISO(d.date);
      const dow = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
      const entry: Record<LineKey, number> = {
        mrt_pjy: d.mrt_pjy,
        lrt_kj: d.lrt_kj,
        lrt_ampang: d.lrt_ampang,
        monorail: d.monorail,
        brt: d.brt,
      };

      if (isSameWeek(dt, activeMonday, { weekStartsOn: 1 })) {
        currentMap.set(dow, entry);
        currentTotals.push(d.total);
        brtCurrent.push(d.brt);
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
        mrt_pjy: cur?.mrt_pjy ?? 0,
        lrt_kj: cur?.lrt_kj ?? 0,
        lrt_ampang: cur?.lrt_ampang ?? 0,
        monorail: cur?.monorail ?? 0,
        brt: cur?.brt ?? 0,
        total: cur ? (cur.mrt_pjy + cur.lrt_kj + cur.lrt_ampang + cur.monorail + cur.brt) : 0,
        hasData: !!cur,
      };
    });

    const wTotal = currentTotals.reduce((a, b) => a + b, 0);
    const pTotal = prevTotals.reduce((a, b) => a + b, 0);
    const avg = currentTotals.length > 0 ? Math.round(wTotal / currentTotals.length) : 0;
    const delta = pTotal > 0 ? ((wTotal - pTotal) / pTotal) * 100 : 0;
    const brtTotal = brtCurrent.reduce((a, b) => a + b, 0);

    return {
      chartData: bars,
      weekTotal: wTotal,
      prevWeekTotal: pTotal,
      dailyAvg: avg,
      weekDelta: delta,
      brtWeekTotal: brtTotal,
      weekLabel: `${format(activeMonday, 'dd MMM')} – ${format(currentSunday, 'dd MMM yyyy')}`,
      prevWeekLabel: `${format(prevMonday, 'dd MMM')} – ${format(prevSunday, 'dd MMM yyyy')}`,
    };
  }, [activeMonday, data]);

  if (loading) return <ChartSkeleton />;
  if (error || !chartData.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md flex items-center justify-center h-[460px]">
        <div className="text-center">
          <p className="text-[var(--text-faint)] text-sm">No Prasarana daily data available</p>
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
            Rapid Rail & BRT Daily Ridership — By Line
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
            <span className="text-[9px] text-amber-400 font-medium">~1 day lag</span>
          </div>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
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
        <div className="rounded-xl bg-orange-400/5 border border-orange-400/10 p-3">
          <div className="flex items-center gap-1 mb-1">
            <Bus className="w-3 h-3 text-orange-400" />
            <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">BRT Sunway</span>
          </div>
          <div className="text-lg font-semibold text-orange-400 tabular-nums tracking-tight">
            {brtWeekTotal.toLocaleString()}
          </div>
          <span className="text-[9px] text-[var(--text-faint)]">this week</span>
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="h-64 sm:h-72 md:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barCategoryGap="16%">
            <defs>
              {LINES.map((l) => (
                <linearGradient key={l.key} id={`prsa-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={l.color} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={l.color} stopOpacity={0.55} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="day" stroke="var(--chart-axis)" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={8} />
            <YAxis
              stroke="var(--chart-axis)"
              fontSize={10}
              tickFormatter={(v: number) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                return v.toString();
              }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<StackedTooltip />} cursor={{ fill: 'var(--chart-hover)', radius: 4 }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
              formatter={(value: string) => <span className="text-[var(--text-muted)]">{value}</span>}
            />
            {LINES.map((l) => (
              <Bar
                key={l.key}
                dataKey={l.key}
                name={l.label}
                fill={`url(#prsa-${l.key})`}
                stackId="prasarana"
                maxBarSize={52}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--border-faint)]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[10px] text-[var(--text-faint)]">
            <span className="text-[var(--text-muted)] font-medium">Showing:</span> {weekLabel}
          </span>
          {prevWeekTotal > 0 && (
            <span className="text-[10px] text-[var(--text-faint)]">
              <span className="text-[var(--text-muted)] font-medium">Prev:</span> {prevWeekLabel} · <span className="text-emerald-400">{prevWeekTotal.toLocaleString()}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
            {weeks.length} weeks available
          </span>
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">Source: data.gov.my · parquet</span>
        </div>
      </div>
    </div>
  );
}
