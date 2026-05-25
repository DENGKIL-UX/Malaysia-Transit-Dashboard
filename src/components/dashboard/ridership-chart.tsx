'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useRidership } from '@/hooks/use-ridership';
import { TrainFront, Train, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays } from 'date-fns';

// Deterministic pseudo-random heights (no Math.random to avoid hydration mismatch)
const SKELETON_HEIGHTS = [
  42, 65, 38, 72, 55, 80, 45, 60, 75, 50, 68, 35, 58, 82, 48, 63, 70, 40, 76, 53,
];

function ChartSkeleton() {
  return (
    <div className="h-[400px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--skeleton-bg)] backdrop-blur-md animate-pulse flex items-end gap-1 p-6">
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
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  // Group by operator
  const rapidRailItems = payload.filter((p) =>
    ['MRT Kajang', 'MRT Putrajaya', 'LRT Kelana Jaya', 'LRT Ampang', 'Monorail'].includes(p.name)
  );
  const ktmbItems = payload.filter((p) =>
    ['Komuter', 'ETS', 'Intercity', 'Komuter Utara', 'Tebrau'].includes(p.name)
  );
  const total = payload.reduce((s, p) => s + p.value, 0);

  return (
    <div className="bg-[var(--bg-tooltip)] backdrop-blur-md border border-[var(--border-subtle)] rounded-xl p-3 shadow-xl max-h-[340px] overflow-y-auto custom-scrollbar">
      <p className="text-[10px] font-medium text-[#85AB8B] uppercase tracking-widest mb-2">
        {label}
      </p>
      {/* Total */}
      <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-semibold text-[var(--text-primary)]">Total Rail</span>
        <span className="text-xs font-bold text-[#85AB8B] tabular-nums">
          {total.toLocaleString()}
        </span>
      </div>

      {rapidRailItems.length > 0 && (
        <div>
          <p className="text-[9px] text-[var(--text-faint)] uppercase tracking-wider mb-1 flex items-center gap-1">
            <TrainFront className="w-2.5 h-2.5" /> Rapid Rail
          </p>
          <div className="space-y-0.5 mb-2">
            {rapidRailItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-[var(--text-muted)]">{item.name}</span>
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                  {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ktmbItems.length > 0 && (
        <div>
          <p className="text-[9px] text-[var(--text-faint)] uppercase tracking-wider mb-1 flex items-center gap-1">
            <Train className="w-2.5 h-2.5" /> KTMB
          </p>
          <div className="space-y-0.5">
            {ktmbItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-[var(--text-muted)]">{item.name}</span>
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                  {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Rail lines ordered bottom-to-top for stacked area (largest volume first)
const RAIL_LINES = [
  // Rapid Rail — largest volume at bottom
  { key: 'lrtKelanaJaya', label: 'LRT Kelana Jaya', color: '#a78bfa', group: 'rapid' },
  { key: 'mrtKajang', label: 'MRT Kajang', color: '#fbbf24', group: 'rapid' },
  { key: 'lrtAmpang', label: 'LRT Ampang', color: '#fb7185', group: 'rapid' },
  { key: 'mrtPutrajaya', label: 'MRT Putrajaya', color: '#38bdf8', group: 'rapid' },
  { key: 'monorail', label: 'Monorail', color: '#34d399', group: 'rapid' },
  // KTMB — on top of Rapid Rail
  { key: 'komuter', label: 'Komuter', color: '#f97316', group: 'ktmb' },
  { key: 'ets', label: 'ETS', color: '#ef4444', group: 'ktmb' },
  { key: 'komuterUtara', label: 'Komuter Utara', color: '#fb923c', group: 'ktmb' },
  { key: 'tebrau', label: 'Tebrau', color: '#c084fc', group: 'ktmb' },
  { key: 'intercity', label: 'Intercity', color: '#94a3b8', group: 'ktmb' },
] as const;

const WINDOW_DAYS = 30;

export function RidershipChart() {
  const { data: allData, loading } = useRidership(90);
  const [pageOffset, setPageOffset] = useState(0); // 0 = latest 30 days, 1 = previous, etc.

  // Compute all available 30-day windows from the data
  const { windows, maxPages } = useMemo(() => {
    if (!allData.length) return { windows: [] as string[][], maxPages: 0 };

    const dates = allData.map((d) => d.date);
    const latestDate = dates[dates.length - 1];

    // Build non-overlapping 30-day windows counting back from latest
    const result: string[][] = [];
    let windowEnd = latestDate;

    while (true) {
      const windowStart = subDays(new Date(windowEnd + 'T00:00:00'), WINDOW_DAYS - 1);
      const startStr = format(windowStart, 'yyyy-MM-dd');
      // Find earliest date in this window from our data
      const matchingDates = dates.filter((d) => d >= startStr && d <= windowEnd);
      if (matchingDates.length === 0) break;
      result.push([startStr, windowEnd]);
      // Move window back
      windowEnd = format(subDays(new Date(startStr + 'T00:00:00'), 1), 'yyyy-MM-dd');
    }

    return { windows: result, maxPages: Math.max(0, result.length - 1) };
  }, [allData]);

  // Clamp offset
  const safeOffset = Math.min(pageOffset, maxPages);
  const activeWindow = windows[safeOffset];

  // Slice data for the active window
  const chartData = useMemo(() => {
    if (!activeWindow || !allData.length) return [];
    const [start, end] = activeWindow;
    return allData.filter((d) => d.date >= start && d.date <= end);
  }, [activeWindow, allData]);

  // Compute averages for the active window
  const stats = useMemo(() => {
    if (!chartData.length) return { avgTotalRail: 0, minDate: '', maxDate: '', dayCount: 0 };
    const avgTotalRail = chartData.reduce((s, d) => s + d.totalRail, 0) / chartData.length;
    return {
      avgTotalRail,
      minDate: chartData[0].date,
      maxDate: chartData[chartData.length - 1].date,
      dayCount: chartData.length,
    };
  }, [chartData]);

  const canGoPrev = safeOffset < maxPages;
  const canGoNext = safeOffset > 0;

  const goPrev = useCallback(() => { if (canGoPrev) setPageOffset((o) => o + 1); }, [canGoPrev]);
  const goNext = useCallback(() => { if (canGoNext) setPageOffset((o) => o - 1); }, [canGoNext]);

  const fmtAvg = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return Math.round(v).toLocaleString();
  };

  const fmtDate = (d: string) => {
    try {
      return format(new Date(d + 'T00:00:00'), 'dd MMM');
    } catch {
      return d;
    }
  };

  if (loading) return <ChartSkeleton />;

  if (!chartData.length) {
    return (
      <div className="h-[400px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md flex items-center justify-center">
        <p className="text-[var(--text-faint)] text-sm">No data available</p>
      </div>
    );
  }

  const windowLabel = safeOffset === 0
    ? 'Latest 30 Days'
    : `${fmtDate(stats.minDate)} – ${fmtDate(stats.maxDate)}`;

  return (
    <div
      data-chart
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up"
      style={{ animationDelay: '400ms', opacity: 0 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            30-Day Rail Ridership
          </h3>
          <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
            {windowLabel} · Stacked by service
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pagination controls */}
          <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
            <button
              onClick={goPrev}
              disabled={!canGoPrev}
              className="flex items-center justify-center w-8 h-8 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-active)] active:bg-[var(--border-subtle)]"
              aria-label="Previous 30 days"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
            <div className="flex items-center px-2.5 min-w-[120px] justify-center">
              <span className="text-[10px] font-medium text-[var(--text-secondary)] tabular-nums">
                {safeOffset === 0 ? 'Latest' : `Page ${maxPages - safeOffset + 1}`} of {windows.length}
              </span>
            </div>
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className="flex items-center justify-center w-8 h-8 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-active)] active:bg-[var(--border-subtle)]"
              aria-label="Next 30 days"
            >
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          </div>
          {/* Avg badge */}
          <span
            className="text-xs font-bold text-[#85AB8B] px-2.5 py-1 rounded-lg bg-[#85AB8B]/10 border border-[#85AB8B]/20 whitespace-nowrap"
          >
            Avg: {fmtAvg(stats.avgTotalRail)}/day
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
        {/* Rapid Rail group */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-3 border-r border-[var(--border-faint)]">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-wider font-medium">Rapid Rail</span>
          {RAIL_LINES.filter((l) => l.group === 'rapid').map((line) => (
            <div key={line.key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: line.color }} />
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                {line.label}
              </span>
            </div>
          ))}
        </div>
        {/* KTMB group */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-wider font-medium">KTMB</span>
          {RAIL_LINES.filter((l) => l.group === 'ktmb').map((line) => (
            <div key={line.key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: line.color }} />
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                {line.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 sm:h-72 md:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              {RAIL_LINES.map((line) => (
                <linearGradient key={line.key} id={`stackGrad-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={line.color} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={line.color} stopOpacity={0.3} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--chart-grid)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="var(--chart-axis)"
              fontSize={10}
              tickFormatter={(d: string) => {
                const parts = d.split('-');
                return `${parts[1]}/${parts[2]}`;
              }}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              stroke="var(--chart-axis)"
              fontSize={10}
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                return v.toString();
              }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Stacked areas: each rail line stacks on top of previous */}
            {RAIL_LINES.map((line) => (
              <Area
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                strokeWidth={1}
                fill={`url(#stackGrad-${line.key})`}
                name={line.label}
                dot={false}
                stackId="rail"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-faint)]">
        <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest">
          Source: data.gov.my · CC-BY 4.0
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--text-faint)]">
            {stats.dayCount} days · Stacked areas sum to total rail
          </span>
          {windows.length > 1 && (
            <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
              {windows.length} windows available
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
