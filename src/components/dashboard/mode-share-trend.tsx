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
import type { EnrichedDay } from '@/hooks/use-analytics';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function fmtMonth(ym: string): string {
  const m = ym.substring(5, 7);
  const y = ym.substring(2, 4);
  return `${MONTH_NAMES[m] ?? m} ${y}`;
}

// Rail services — bottom-to-top stack order (~largest share first)
const SERVICES = [
  { key: 'lrtKelanaJaya', label: 'LRT Kelana Jaya', color: '#a78bfa', group: 'rapid' },
  { key: 'mrtKajang', label: 'MRT Kajang', color: '#fbbf24', group: 'rapid' },
  { key: 'lrtAmpang', label: 'LRT Ampang', color: '#fb7185', group: 'rapid' },
  { key: 'mrtPutrajaya', label: 'MRT Putrajaya', color: '#38bdf8', group: 'rapid' },
  { key: 'monorail', label: 'Monorail', color: '#34d399', group: 'rapid' },
  { key: 'komuter', label: 'KTM Komuter', color: '#f97316', group: 'ktmb' },
  { key: 'ets', label: 'ETS', color: '#22d3ee', group: 'ktmb' },
  { key: 'intercity', label: 'KTM Intercity', color: '#a3e635', group: 'ktmb' },
  { key: 'komuterUtara', label: 'KTM Komuter Utara', color: '#f472b6', group: 'ktmb' },
  { key: 'tebrau', label: 'Shuttle Tebrau', color: '#facc15', group: 'ktmb' },
] as const;

type ServiceKey = (typeof SERVICES)[number]['key'];

interface MonthlyPoint {
  label: string;
  ym: string;
  [K: string]: string | number;
}

interface Props {
  ridership: EnrichedDay[];
  loading: boolean;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  payload: MonthlyPoint;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  const label = point.label as string;
  const totalRail = (point.totalRail_abs as number) ?? 0;

  const rapidKeys = new Set(SERVICES.filter((s) => s.group === 'rapid').map((s) => s.key));
  const ktmbKeys = new Set(SERVICES.filter((s) => s.group === 'ktmb').map((s) => s.key));

  const rapidItems = payload.filter((p) => {
    const svc = SERVICES.find((s) => s.label === p.name);
    return svc && rapidKeys.has(svc.key);
  });
  const ktmbItems = payload.filter((p) => {
    const svc = SERVICES.find((s) => s.label === p.name);
    return svc && ktmbKeys.has(svc.key);
  });

  const renderRow = (item: TooltipPayloadItem) => {
    const svc = SERVICES.find((s) => s.label === item.name);
    const absVal = svc ? ((point[`${svc.key}_abs`] as number) ?? 0) : 0;
    return (
      <div key={item.name} className="flex items-center justify-between gap-4 py-0.5">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-[11px] text-[var(--text-muted)]">{item.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
            {item.value.toFixed(1)}%
          </span>
          <span className="text-[10px] text-[var(--text-faint)] tabular-nums w-16 text-right">
            {absVal.toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[var(--bg-tooltip)] backdrop-blur-md border border-[var(--border-subtle)] rounded-xl p-3 shadow-xl max-h-[320px] overflow-y-auto custom-scrollbar">
      <p className="text-[10px] font-medium text-[#85AB8B] uppercase tracking-widest mb-2">
        {label}
      </p>
      <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-semibold text-[var(--text-primary)]">Total Rail</span>
        <span className="text-xs font-bold text-[#85AB8B] tabular-nums">
          {totalRail.toLocaleString()}
        </span>
      </div>

      {rapidItems.length > 0 && (
        <div className="mb-2">
          <p className="text-[9px] text-[var(--text-faint)] uppercase tracking-wider mb-1">
            Rapid Rail
          </p>
          {rapidItems.map(renderRow)}
        </div>
      )}

      {ktmbItems.length > 0 && (
        <div>
          <p className="text-[9px] text-[var(--text-faint)] uppercase tracking-wider mb-1">
            KTMB
          </p>
          {ktmbItems.map(renderRow)}
        </div>
      )}
    </div>
  );
}

const SKELETON_HEIGHTS = [65, 72, 55, 80, 60, 70, 50, 75, 58, 82, 45, 68];

function ChartSkeleton() {
  return (
    <div className="h-[360px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--skeleton-bg)] backdrop-blur-md animate-pulse flex items-end gap-1 p-6">
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

const WINDOW_MONTHS = 24;

export function ModeShareTrend({ ridership, loading }: Props) {
  // Aggregate daily data to monthly resolution
  const monthlyData = useMemo<MonthlyPoint[]>(() => {
    if (!ridership.length) return [];

    const buckets = new Map<string, Map<ServiceKey, number>>();
    const monthTotals = new Map<string, number>();

    for (const day of ridership) {
      const ym = day.date.substring(0, 7);
      if (!buckets.has(ym)) {
        buckets.set(ym, new Map());
        monthTotals.set(ym, 0);
      }
      const bucket = buckets.get(ym)!;

      for (const svc of SERVICES) {
        const val = (day[svc.key] as number) ?? 0;
        bucket.set(svc.key, (bucket.get(svc.key) ?? 0) + val);
      }
      monthTotals.set(ym, (monthTotals.get(ym) ?? 0) + day.totalRail);
    }

    const months = Array.from(buckets.keys()).sort();

    return months.map((ym) => {
      const bucket = buckets.get(ym)!;
      const total = monthTotals.get(ym)!;
      const point: MonthlyPoint = {
        label: fmtMonth(ym),
        ym,
        totalRail_abs: total,
      };

      for (const svc of SERVICES) {
        const abs = bucket.get(svc.key) ?? 0;
        point[`${svc.key}_pct`] = total > 0 ? (abs / total) * 100 : 0;
        point[`${svc.key}_abs`] = abs;
      }

      return point;
    });
  }, [ridership]);

  // Build 24-month page windows (latest first)
  const { windows, maxPages } = useMemo(() => {
    if (!monthlyData.length) return { windows: [] as string[][], maxPages: 0 };

    const yms = monthlyData.map((d) => d.ym);
    const result: string[][] = [];
    let idx = yms.length;

    while (idx > 0) {
      const start = Math.max(0, idx - WINDOW_MONTHS);
      result.push([yms[start], yms[idx - 1]]);
      idx = start;
    }

    return { windows: result, maxPages: Math.max(0, result.length - 1) };
  }, [monthlyData]);

  const [pageOffset, setPageOffset] = useState(0);
  const safeOffset = Math.min(pageOffset, maxPages);
  const activeWindow = windows[safeOffset];

  const chartData = useMemo(() => {
    if (!activeWindow) return [];
    const [start, end] = activeWindow;
    return monthlyData.filter((d) => d.ym >= start && d.ym <= end);
  }, [activeWindow, monthlyData]);

  const canGoPrev = safeOffset < maxPages;
  const canGoNext = safeOffset > 0;

  const goPrev = useCallback(() => {
    if (canGoPrev) setPageOffset((o) => o + 1);
  }, [canGoPrev]);

  const goNext = useCallback(() => {
    if (canGoNext) setPageOffset((o) => o - 1);
  }, [canGoNext]);

  const windowLabel =
    safeOffset === 0
      ? 'Latest 24 Months'
      : `${fmtMonth(chartData[0]?.ym ?? '')} – ${fmtMonth(chartData[chartData.length - 1]?.ym ?? '')}`;

  if (loading) return <ChartSkeleton />;

  if (!chartData.length) {
    return (
      <div className="h-[360px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md flex items-center justify-center">
        <p className="text-[var(--text-faint)] text-sm">No data available</p>
      </div>
    );
  }

  return (
    <div
      data-chart
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up"
      style={{ animationDelay: '600ms', opacity: 0 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Mode Share Trend
          </h3>
          <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
            {windowLabel} · 100% stacked by rail service
          </p>
        </div>
        <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="flex items-center justify-center w-8 h-8 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-active)] active:bg-[var(--border-subtle)]"
            aria-label="Previous 24 months"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
          <div className="flex items-center px-2.5 min-w-[120px] justify-center">
            <span className="text-[10px] font-medium text-[var(--text-secondary)] tabular-nums">
              {safeOffset === 0
                ? 'Latest'
                : `Page ${maxPages - safeOffset + 1}`}{' '}
              of {windows.length}
            </span>
          </div>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="flex items-center justify-center w-8 h-8 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-active)] active:bg-[var(--border-subtle)]"
            aria-label="Next 24 months"
          >
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-3 border-r border-[var(--border-faint)]">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-wider font-medium">
            Rapid Rail
          </span>
          {SERVICES.filter((s) => s.group === 'rapid').map((svc) => (
            <div key={svc.key} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: svc.color }}
              />
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                {svc.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-wider font-medium">
            KTMB
          </span>
          {SERVICES.filter((s) => s.group === 'ktmb').map((svc) => (
            <div key={svc.key} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: svc.color }}
              />
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                {svc.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-56 sm:h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              {SERVICES.map((svc) => (
                <linearGradient
                  key={svc.key}
                  id={`msGrad-${svc.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={svc.color} stopOpacity={0.7} />
                  <stop
                    offset="95%"
                    stopColor={svc.color}
                    stopOpacity={0.35}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--chart-grid)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="var(--chart-axis)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={8}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="var(--chart-axis)"
              fontSize={10}
              tickFormatter={(v: number) => `${v}%`}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            {SERVICES.map((svc) => (
              <Area
                key={svc.key}
                type="monotone"
                dataKey={`${svc.key}_pct`}
                stroke={svc.color}
                strokeWidth={1}
                fill={`url(#msGrad-${svc.key})`}
                name={svc.label}
                stackId="modeShare"
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
        <span className="text-[10px] text-[var(--text-faint)]">
          {chartData.length} months · Areas sum to 100%
        </span>
      </div>
    </div>
  );
}