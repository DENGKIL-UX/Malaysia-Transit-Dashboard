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
import type { EnrichedDay } from '@/hooks/use-analytics';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SERVICE_META: {
  key: keyof EnrichedDay;
  label: string;
  color: string;
}[] = [
  { key: 'mrtKajang', label: 'MRT Kajang', color: '#fbbf24' },
  { key: 'mrtPutrajaya', label: 'MRT Putrajaya', color: '#38bdf8' },
  { key: 'lrtKelanaJaya', label: 'LRT Kelana Jaya', color: '#a78bfa' },
  { key: 'lrtAmpang', label: 'LRT Ampang', color: '#fb7185' },
  { key: 'monorail', label: 'Monorail', color: '#34d399' },
  { key: 'komuter', label: 'KTM Komuter', color: '#f97316' },
  { key: 'ets', label: 'ETS', color: '#22d3ee' },
  { key: 'intercity', label: 'KTM Intercity', color: '#a3e635' },
  { key: 'komuterUtara', label: 'KTM Komuter Utara', color: '#f472b6' },
  { key: 'tebrau', label: 'Shuttle Tebrau', color: '#facc15' },
  { key: 'busKl', label: 'RapidKL Bus', color: '#fb923c' },
  { key: 'busKuantan', label: 'Rapid Bus Kuantan', color: '#d946ef' },
  { key: 'busRpn', label: 'Rapid Bus Penang', color: '#a8a29e' },
  { key: 'totalRail', label: 'Total Rail', color: '#85AB8B' },
];

interface GrowthRow {
  key: string;
  label: string;
  color: string;
  growth: number;
  thisYear: number;
  lastYear: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function computeGrowth(rows: GrowthRow[]): GrowthRow | undefined {
  // ponytail: only totalRail summary, no other rail composite needed
  return rows.find((r) => r.key === 'totalRail');
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--skeleton-bg)] backdrop-blur-md shadow-lg p-5 sm:p-6 animate-pulse">
      <div className="h-4 w-48 rounded bg-[var(--border-subtle)] mb-4" />
      <div className="h-3 w-64 rounded bg-[var(--border-subtle)] mb-6" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-7 rounded bg-[var(--border-subtle)] mb-2" style={{ width: `${70 - i * 8}%` }} />
      ))}
    </div>
  );
}

function RailSummaryCard({ row }: { row: GrowthRow }) {
  const isUp = row.growth >= 0;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-4 mb-5">
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
          isUp ? 'bg-emerald-400/15 text-emerald-400' : 'bg-red-400/15 text-red-400'
        )}
      >
        {isUp ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
          Overall Rail Growth
        </p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
            {isUp ? '+' : ''}{row.growth.toFixed(1)}%
          </span>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {fmt(row.lastYear)} → {fmt(row.thisYear)}
          </span>
        </div>
      </div>
      {/* Inline 5-bar mini sparkline */}
      <MiniSpark growth={row.growth} isUp={isUp} color={row.color} />
    </div>
  );
}

function MiniSpark({ growth, isUp, color }: { growth: number; isUp: boolean; color: string }) {
  // Deterministic 5-point mini bar chart based on growth magnitude
  const mag = Math.min(Math.abs(growth), 40);
  const bars = [0.4, 0.6, 0.5, 0.8, 1.0].map((base, i) => {
    const jitter = i === 4 ? 1.0 : base + (mag / 40) * 0.3;
    return Math.max(0.15, Math.min(1, jitter));
  });

  return (
    <div className="flex items-end gap-0.5 h-8 shrink-0" aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 rounded-sm transition-all',
            isUp ? 'bg-emerald-400/70' : 'bg-red-400/70'
          )}
          style={{
            height: `${h * 100}%`,
            opacity: 0.4 + (i / bars.length) * 0.6,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: GrowthRow }>;
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{d.label}</p>
      <p className="text-[var(--text-muted)] tabular-nums">
        {fmt(d.lastYear)} → {fmt(d.thisYear)}
      </p>
      <p
        className={cn(
          'font-semibold tabular-nums mt-0.5',
          d.growth >= 0 ? 'text-emerald-400' : 'text-red-400'
        )}
      >
        {d.growth >= 0 ? '+' : ''}{d.growth.toFixed(1)}%
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface Props {
  ridership: EnrichedDay[];
  loading: boolean;
}

export function GrowthRankings({ ridership, loading }: Props) {
  const { rows, years, railSummary } = useMemo(() => {
    if (ridership.length < 30) {
      return { rows: [] as GrowthRow[], years: null, railSummary: undefined as GrowthRow | undefined };
    }

    // Determine the two most recent complete years
    const allYears = ridership.map((d) => new Date(d.date + 'T00:00:00').getFullYear());
    const uniqueYears = [...new Set(allYears)].sort((a, b) => b - a);

    // Use last 2 complete years (or last 12 months vs prior 12 months)
    let thisYear: number;
    let lastYear: number;

    if (uniqueYears.length >= 2) {
      thisYear = uniqueYears[0];
      lastYear = uniqueYears[1];
    } else {
      return { rows: [] as GrowthRow[], years: null, railSummary: undefined as GrowthRow | undefined };
    }

    const thisYearData = ridership.filter(
      (d) => new Date(d.date + 'T00:00:00').getFullYear() === thisYear
    );
    const lastYearData = ridership.filter(
      (d) => new Date(d.date + 'T00:00:00').getFullYear() === lastYear
    );

    // Need at least 30 days in each year for a meaningful comparison
    if (thisYearData.length < 30 || lastYearData.length < 30) {
      return { rows: [] as GrowthRow[], years: null, railSummary: undefined as GrowthRow | undefined };
    }

    const sumByYear = (
      data: EnrichedDay[],
      key: keyof EnrichedDay
    ): number =>
      data.reduce((acc, d) => acc + (typeof d[key] === 'number' ? (d[key] as number) : 0), 0);

    const computed: GrowthRow[] = SERVICE_META.map((svc) => {
      const ty = sumByYear(thisYearData, svc.key);
      const ly = sumByYear(lastYearData, svc.key);
      const growth = ly > 0 ? ((ty - ly) / ly) * 100 : 0;

      return {
        key: svc.key,
        label: svc.label,
        color: svc.color,
        growth,
        thisYear: ty,
        lastYear: ly,
      };
    });

    // Sort by growth descending, but keep Total Rail at the end
    const services = computed.filter((r) => r.key !== 'totalRail').sort((a, b) => b.growth - a.growth);
    const railRow = computed.find((r) => r.key === 'totalRail');
    if (railRow) services.push(railRow);

    return {
      rows: services,
      years: { thisYear, lastYear },
      railSummary: computeGrowth(computed),
    };
  }, [ridership]);

  if (loading) return <Skeleton />;

  if (!years) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up">
        <p className="text-sm text-[var(--text-muted)] text-center py-10">
          Need at least 1 year of data for YoY comparison
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          YoY Growth Rankings
        </h3>
        <span className="text-[10px] font-medium text-[var(--text-faint)] tabular-nums">
          {years.lastYear} vs {years.thisYear}
        </span>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Which lines are growing fastest?
      </p>

      {/* Total Rail summary */}
      {railSummary && <RailSummaryCard row={railSummary} />}

      {/* Chart */}
      <div className="max-h-[500px] overflow-y-auto custom-scrollbar -mx-2 px-2">
        <ResponsiveContainer width="100%" height={Math.max(400, rows.length * 36)}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 50, bottom: 0, left: 130 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="var(--chart-grid)"
              strokeDasharray="3 3"
            />
            <XAxis
              type="number"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              stroke="var(--chart-axis)"
              tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              stroke="var(--chart-axis)"
              width={125}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="growth" radius={[0, 4, 4, 0]} barSize={20}>
              {rows.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={entry.growth >= 0 ? '#34d399' : '#f87171'}
                  opacity={entry.key === 'totalRail' ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Absolute values list below chart */}
        <div className="mt-4 space-y-1.5">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: r.color }}
              />
              <span className="text-[var(--text-muted)] w-[115px] truncate shrink-0">
                {r.label}
              </span>
              <span className="text-[var(--text-faint)] tabular-nums flex-1">
                {fmt(r.lastYear)} → {fmt(r.thisYear)}
              </span>
              <span
                className={cn(
                  'font-semibold tabular-nums w-16 text-right shrink-0',
                  r.growth >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {r.growth >= 0 ? '+' : ''}{r.growth.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}