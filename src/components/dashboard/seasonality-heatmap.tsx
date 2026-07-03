'use client';

import { useState, useMemo } from 'react';
import { CalendarRange } from 'lucide-react';
import type { EnrichedDay } from '@/hooks/use-analytics';

// ─── Types ───────────────────────────────────────────────────────────

interface Props {
  ridership: EnrichedDay[];
  loading: boolean;
}

type DayType = EnrichedDay['day_type'];

interface CellData {
  avg: number;
  count: number;
  month: number;
  dayType: DayType;
}

// ─── Constants ───────────────────────────────────────────────────────

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const ROWS: { key: DayType; label: string }[] = [
  { key: 'weekday', label: 'Weekday' },
  { key: 'friday', label: 'Fri' },
  { key: 'weekend', label: 'Weekend' },
  { key: 'holiday', label: 'Holiday' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toFixed(0);
}

function formatPct(deviation: number): string {
  const sign = deviation >= 0 ? '+' : '';
  return `${sign}${deviation.toFixed(1)}%`;
}

function cellOpacity(value: number, min: number, max: number): number {
  if (max === min) return 0.05;
  return ((value - min) / (max - min)) * 0.7 + 0.05;
}

// ─── Sub-components ──────────────────────────────────────────────────

function HeatmapCell({
  data,
  min,
  max,
  yearAvg,
  relative,
}: {
  data: CellData | null;
  min: number;
  max: number;
  yearAvg: number;
  relative: boolean;
}) {
  if (!data) {
    return (
      <div className="rounded-md border border-transparent p-1.5 sm:p-2 min-h-[52px] sm:min-h-[60px] flex items-center justify-center">
        <span className="text-[10px] text-[var(--text-ghost)]">—</span>
      </div>
    );
  }

  const opacity = cellOpacity(data.avg, min, max);
  const deviation = yearAvg > 0 ? ((data.avg - yearAvg) / yearAvg) * 100 : 0;
  const displayValue = relative ? deviation : data.avg;
  const displayText = relative ? formatPct(deviation) : formatCompact(data.avg);

  // Text color: high opacity cells use primary text, low use muted
  const textCls = opacity > 0.35
    ? 'text-[var(--text-primary)]'
    : 'text-[var(--text-muted)]';

  // In relative mode, tint red for negative, green for positive
  const relColorCls = relative
    ? deviation >= 0
      ? 'text-emerald-400'
      : 'text-red-400'
    : textCls;

  return (
    <div className="group relative">
      <div
        className="rounded-md border border-transparent hover:border-[var(--border-subtle)] hover:scale-[1.04] transition-all duration-150 p-1.5 sm:p-2 min-h-[52px] sm:min-h-[60px] flex items-center justify-center cursor-default"
        style={{ backgroundColor: `rgba(133, 171, 139, ${opacity})` }}
      >
        <span className={`text-[10px] sm:text-[11px] font-semibold tabular-nums leading-tight text-center ${relColorCls}`}>
          {displayText}
        </span>
      </div>

      {/* Tooltip */}
      <div className="pointer-events-none absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xl px-3 py-2 whitespace-nowrap text-[10px]">
          <div className="font-semibold text-[var(--text-primary)] tabular-nums">
            {data.avg.toLocaleString()} avg daily
          </div>
          <div className="text-[var(--text-muted)] mt-0.5">
            {data.count} day{data.count !== 1 ? 's' : ''} · {MONTH_LABELS[data.month]}
          </div>
          {yearAvg > 0 && (
            <div
              className={`mt-0.5 font-medium ${deviation >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {formatPct(deviation)} vs year avg
            </div>
          )}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[var(--bg-elevated)] border-b border-r border-[var(--border-subtle)]" />
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-pulse"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-4 h-4 rounded bg-[var(--border-subtle)]" />
        <div className="h-4 w-36 rounded bg-[var(--border-subtle)]" />
      </div>
      <div className="h-3 w-56 rounded bg-[var(--border-subtle)] mb-6" />
      <div className="grid grid-cols-[60px_repeat(12,1fr)] gap-1">
        {Array.from({ length: 56 }).map((_, i) => (
          <div key={i} className="h-[52px] rounded-md bg-[var(--border-subtle)]" />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function SeasonalityHeatmap({ ridership, loading }: Props) {
  const [selectedYear, setSelectedYear] = useState<number>(0); // 0 = all years
  const [relative, setRelative] = useState(false);

  // Available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const d of ridership) {
      years.add(new Date(d.date + 'T00:00:00').getFullYear());
    }
    return Array.from(years).sort();
  }, [ridership]);

  // Default to most recent year with data
  const effectiveYear = useMemo(() => {
    if (selectedYear !== 0 && availableYears.includes(selectedYear)) return selectedYear;
    if (availableYears.length > 0) return availableYears[availableYears.length - 1];
    return 0;
  }, [selectedYear, availableYears]);

  // Filter to selected year
  const yearData = useMemo(() => {
    if (effectiveYear === 0) return ridership;
    return ridership.filter((d) => {
      return new Date(d.date + 'T00:00:00').getFullYear() === effectiveYear;
    });
  }, [ridership, effectiveYear]);

  // Build grid: 4 rows × 12 cols
  const grid = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();

    for (const d of yearData) {
      if (typeof d.total !== 'number' || d.total <= 0) continue;
      const month = new Date(d.date + 'T00:00:00').getMonth();
      const key = `${d.day_type}-${month}`;
      const existing = map.get(key);
      if (existing) {
        existing.sum += d.total;
        existing.count += 1;
      } else {
        map.set(key, { sum: d.total, count: 1 });
      }
    }

    const cells: Record<string, CellData> = {};
    let globalMin = Infinity;
    let globalMax = -Infinity;

    for (const [key, { sum, count }] of map) {
      const [dt, m] = key.split('-') as [DayType, string];
      const month = Number(m);
      const avg = sum / count;
      cells[key] = { avg, count, month, dayType: dt };
      if (avg < globalMin) globalMin = avg;
      if (avg > globalMax) globalMax = avg;
    }

    return { cells, min: globalMin === Infinity ? 0 : globalMin, max: globalMax === -Infinity ? 0 : globalMax };
  }, [yearData]);

  // Per-day-type year average (for relative mode)
  const dayTypeYearAvg = useMemo(() => {
    const sums: Record<DayType, number> = { weekday: 0, friday: 0, weekend: 0, holiday: 0 };
    const counts: Record<DayType, number> = { weekday: 0, friday: 0, weekend: 0, holiday: 0 };

    for (const d of yearData) {
      if (typeof d.total !== 'number' || d.total <= 0) continue;
      sums[d.day_type] += d.total;
      counts[d.day_type] += 1;
    }

    const result: Record<DayType, number> = { weekday: 0, friday: 0, weekend: 0, holiday: 0 };
    for (const dt of ROWS) {
      result[dt.key] = counts[dt.key] > 0 ? sums[dt.key] / counts[dt.key] : 0;
    }
    return result;
  }, [yearData]);

  const totalDays = yearData.length;

  if (loading) return <Skeleton />;

  if (!totalDays) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md flex items-center justify-center h-[400px]">
        <div className="text-center">
          <CalendarRange className="w-8 h-8 text-[var(--text-ghost)] mx-auto mb-2" />
          <p className="text-[var(--text-faint)] text-sm">
            No ridership data for seasonality analysis
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
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <CalendarRange className="w-4 h-4 text-[#85AB8B]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Seasonality Heatmap
              </h3>
            </div>
            <p className="text-[10px] text-[var(--text-faint)] mt-1 ml-[26px]">
              Monthly average ridership by day type ·{' '}
              <span className="text-[var(--text-muted)] font-medium tabular-nums">
                {totalDays.toLocaleString()} days
              </span>
              {effectiveYear > 0 && (
                <>
                  {' '}·{' '}
                  <span className="text-[var(--text-muted)] font-medium">
                    {effectiveYear}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Relative toggle */}
            <button
              onClick={() => setRelative((r) => !r)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                relative
                  ? 'bg-[#85AB8B]/10 text-[#85AB8B] border-[#85AB8B]/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-subtle)]'
              }`}
              aria-label="Toggle relative to year average"
            >
              {relative ? '% vs Year Avg' : 'Absolute'}
            </button>
          </div>
        </div>

        {/* Year selector + legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Year buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium tabular-nums transition-all shrink-0 ${
                  year === effectiveYear
                    ? 'bg-[#85AB8B]/15 text-[#85AB8B] border border-[#85AB8B]/25'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-subtle)]'
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Color legend */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
              Low
            </span>
            <div className="flex gap-0.5">
              {[0.05, 0.2, 0.35, 0.5, 0.65, 0.75].map((o) => (
                <div
                  key={o}
                  className="w-4 h-3 rounded-sm"
                  style={{ backgroundColor: `rgba(133, 171, 139, ${o})` }}
                />
              ))}
            </div>
            <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
              High
            </span>
          </div>
        </div>
      </div>

      {/* ── Heatmap Grid ── */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div
          className="grid gap-1 min-w-[540px]"
          style={{
            gridTemplateColumns: '60px repeat(12, 1fr)',
          }}
        >
          {/* Empty corner */}
          <div />

          {/* Month headers */}
          {MONTH_LABELS.map((m) => (
            <div
              key={m}
              className="text-[10px] font-semibold text-[var(--text-muted)] text-center pb-1"
            >
              {m}
            </div>
          ))}

          {/* Data rows */}
          {ROWS.map((row) => (
            <div key={row.key} className="contents">
              {/* Row label */}
              <div className="flex items-center pr-2">
                <span className="text-[10px] font-semibold text-[var(--text-muted)] text-right truncate">
                  {row.label}
                </span>
              </div>

              {/* 12 month cells */}
              {Array.from({ length: 12 }).map((_, month) => {
                const key = `${row.key}-${month}`;
                const cell = grid.cells[key] ?? null;
                return (
                  <HeatmapCell
                    key={key}
                    data={cell}
                    min={grid.min}
                    max={grid.max}
                    yearAvg={dayTypeYearAvg[row.key]}
                    relative={relative}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--border-faint)]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[10px] text-[var(--text-faint)]">
            <span className="text-[var(--text-muted)] font-medium">
              Cells:
            </span>{' '}
            avg daily total ridership
          </span>
          <span className="text-[10px] text-[var(--text-faint)]">
            <span className="text-[var(--text-muted)] font-medium">
              Day types:
            </span>{' '}
            weekday · fri · weekend · holiday
          </span>
          <span className="text-[10px] text-[var(--text-faint)]">
            <span className="text-[var(--text-muted)] font-medium">
              Data:
            </span>{' '}
            {effectiveYear > 0 ? effectiveYear : 'All years'} · {totalDays.toLocaleString()} days
          </span>
        </div>
        <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
          Source: data.gov.my · DOSM
        </span>
      </div>
    </div>
  );
}