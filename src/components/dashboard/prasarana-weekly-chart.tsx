'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { format, startOfWeek, subWeeks, endOfWeek, isSameWeek, parseISO } from 'date-fns';
import { usePrasaranaDaily } from '@/hooks/use-prasarana-daily';
import { TrendingUp, TrendingDown, Bus } from 'lucide-react';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SKELETON_HEIGHTS = [55, 80, 42, 88, 72, 50, 85, 48, 70, 60, 82, 52, 68, 38];

function ChartSkeleton() {
  return (
    <div className="h-[420px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--skeleton-bg)] backdrop-blur-md animate-pulse flex items-end gap-1 p-6">
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

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  payload?: {
    dayLabel?: string;
    weekLabel?: string;
    daily?: number;
    previousDaily?: number;
  };
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const pl = payload[0]?.payload;

  return (
    <div className="bg-[var(--bg-tooltip)] backdrop-blur-md border border-[var(--border-subtle)] rounded-xl p-3 shadow-xl min-w-[180px]">
      <p className="text-[10px] font-medium text-[#85AB8B] uppercase tracking-widest mb-1">
        {pl?.dayLabel ?? label}
      </p>
      {pl?.weekLabel && (
        <p className="text-[9px] text-[var(--text-faint)] mb-2">{pl.weekLabel}</p>
      )}
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11px] text-[var(--text-muted)]">{item.name}</span>
            </div>
            <span className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrasaranaWeeklyChart() {
  const { data, loading, error } = usePrasaranaDaily();

  const { chartData, currentWeekTotal, previousWeekTotal, weekDates, dailyAvg, weekDelta, brtWeekTotal } = useMemo(() => {
    if (!data.length) {
      return {
        chartData: [], currentWeekTotal: 0, previousWeekTotal: 0,
        weekDates: { current: '', previous: '' }, dailyAvg: 0, weekDelta: 0, brtWeekTotal: 0,
      };
    }

    const latestDate = data[data.length - 1].date;
    const latest = parseISO(latestDate);
    const currentMonday = startOfWeek(latest, { weekStartsOn: 1 });
    const prevMonday = subWeeks(currentMonday, 1);
    const currentSunday = endOfWeek(currentMonday, { weekStartsOn: 1 });
    const prevSunday = endOfWeek(prevMonday, { weekStartsOn: 1 });

    const dailyMap = new Map<number, number>();
    const prevDailyMap = new Map<number, number>();
    const brtCurrent: number[] = [];
    const allWeeksData: number[][] = [[], []];

    for (const d of data) {
      const dt = parseISO(d.date);
      const dow = dt.getDay() === 0 ? 6 : dt.getDay() - 1;

      if (isSameWeek(dt, currentMonday, { weekStartsOn: 1 })) {
        dailyMap.set(dow, d.total);
        brtCurrent.push(d.brt);
        allWeeksData[0].push(d.total);
      } else if (isSameWeek(dt, prevMonday, { weekStartsOn: 1 })) {
        prevDailyMap.set(dow, d.total);
        allWeeksData[1].push(d.total);
      }
    }

    const bars = DAY_NAMES.map((day, i) => {
      const daily = dailyMap.get(i) ?? 0;
      const prevDaily = prevDailyMap.get(i) ?? 0;
      const dt = new Date(currentMonday.getTime() + i * 864e5);
      const dateStr = format(dt, 'dd MMM');

      return {
        day,
        dayLabel: `${DAY_FULL[i]}, ${dateStr}`,
        daily,
        previousDaily: prevDaily,
        weekLabel: `${format(currentMonday, 'dd MMM')} – ${format(currentSunday, 'dd MMM')}`,
        hasData: dailyMap.has(i),
        hasPrevData: prevDailyMap.has(i),
      };
    });

    const currentWeekTotal = allWeeksData[0].reduce((a, b) => a + b, 0);
    const previousWeekTotal = allWeeksData[1].reduce((a, b) => a + b, 0);
    const dailyAvg = allWeeksData[0].length > 0
      ? Math.round(currentWeekTotal / allWeeksData[0].length) : 0;
    const weekDelta = previousWeekTotal > 0
      ? ((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100 : 0;
    const brtWeekTotal = brtCurrent.reduce((a, b) => a + b, 0);

    return {
      chartData: bars, currentWeekTotal, previousWeekTotal,
      weekDates: {
        current: `${format(currentMonday, 'dd MMM')} – ${format(currentSunday, 'dd MMM')}`,
        previous: `${format(prevMonday, 'dd MMM')} – ${format(prevSunday, 'dd MMM')}`,
      },
      dailyAvg, weekDelta, brtWeekTotal,
    };
  }, [data]);

  if (loading) return <ChartSkeleton />;

  if (error || !chartData.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md flex items-center justify-center h-[420px]">
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
    <div
      data-chart
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Rapid Rail Daily Ridership
          </h3>
          <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
            Mon – Sun daily totals · {weekDates.current}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] text-[var(--text-muted)] font-medium">This Week</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#85AB8B]/40" />
            <span className="text-[10px] text-[var(--text-muted)] font-medium">Prev Week</span>
          </div>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">Weekly Total</span>
          <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums tracking-tight mt-0.5">
            {currentWeekTotal.toLocaleString()}
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

      {/* Chart */}
      <div className="h-56 sm:h-72 md:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            barCategoryGap="20%"
          >
            <defs>
              <linearGradient id="prasaranaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="prasaranaPrevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#85AB8B" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#85AB8B" stopOpacity={0.15} />
              </linearGradient>
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
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="previousDaily" fill="url(#prasaranaPrevGrad)" radius={[4, 4, 0, 0]} maxBarSize={36} name="Previous Week" />
            <Bar dataKey="daily" radius={[4, 4, 0, 0]} maxBarSize={36} name="This Week">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.hasData ? '#fbbf24' : '#fbbf2433'} opacity={entry.hasData ? 1 : 0.3} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--border-faint)]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[10px] text-[var(--text-faint)]">
            <span className="text-[var(--text-muted)] font-medium">This week:</span> {weekDates.current}
          </span>
          <span className="text-[10px] text-[var(--text-faint)]">
            <span className="text-[var(--text-muted)] font-medium">Prev week:</span> {weekDates.previous}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-sky-400/15 text-sky-300/70 font-medium">
            ● real-time · ~1 day lag
          </span>
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
            Source: data.gov.my · Prasarana
          </span>
        </div>
      </div>
    </div>
  );
}
