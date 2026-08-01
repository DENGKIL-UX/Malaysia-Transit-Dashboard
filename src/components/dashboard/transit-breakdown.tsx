'use client';

import { useRidership, type RidershipDay } from '@/hooks/use-ridership';
import { usePrasaranaDaily } from '@/hooks/use-prasarana-daily';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react';

interface LineData {
  label: string;
  key: keyof RidershipDay;
  color: string;
  bgColor: string;
}

const lines: LineData[] = [
  { label: 'MRT Kajang Line', key: 'mrtKajang', color: 'text-amber-400', bgColor: 'bg-amber-400' },
  { label: 'MRT Putrajaya Line', key: 'mrtPutrajaya', color: 'text-sky-400', bgColor: 'bg-sky-400' },
  { label: 'LRT Kelana Jaya', key: 'lrtKelanaJaya', color: 'text-violet-400', bgColor: 'bg-violet-400' },
  { label: 'LRT Ampang', key: 'lrtAmpang', color: 'text-rose-400', bgColor: 'bg-rose-400' },
  { label: 'Monorail', key: 'monorail', color: 'text-emerald-400', bgColor: 'bg-emerald-400' },
  { label: 'KTM Komuter', key: 'komuter', color: 'text-teal-400', bgColor: 'bg-teal-400' },
  { label: 'ETS', key: 'ets', color: 'text-cyan-400', bgColor: 'bg-cyan-400' },
  { label: 'KTM Intercity', key: 'intercity', color: 'text-lime-400', bgColor: 'bg-lime-400' },
  { label: 'KTM Komuter Utara', key: 'komuterUtara', color: 'text-pink-400', bgColor: 'bg-pink-400' },
  { label: 'Shuttle Tebrau', key: 'tebrau', color: 'text-yellow-400', bgColor: 'bg-yellow-400' },
  { label: 'Rapid Bus (KL)', key: 'busKl', color: 'text-orange-400', bgColor: 'bg-orange-400' },
  { label: 'Rapid Bus (Kuantan)', key: 'busKuantan', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-400' },
  { label: 'Rapid Bus (Penang)', key: 'busRpn', color: 'text-stone-400', bgColor: 'bg-stone-400' },
];

const BRT_LINE = { label: 'BRT Sunway', color: 'text-orange-300', bgColor: 'bg-orange-300' };

// Services that determine a "fully published" day. Pipelines publish on
// different cadences (KTMB ~T+1, Rapid Rail OD ~T+1…3, headline monthly),
// so the furthest-right row of merged data can be KTMB-only. Using it
// directly renders rail lines as 0 — fake data. Instead, the breakdown
// anchors to the freshest day where every core service is present.
// MRT Kajang / bus_rkn / bus_rpn are excluded: they are absent by design
// outside the monthly headline audit window.
const CORE_KEYS: (keyof RidershipDay)[] = [
  'mrtPutrajaya', 'lrtKelanaJaya', 'lrtAmpang', 'monorail',
  'komuter', 'ets', 'intercity', 'komuterUtara', 'tebrau',
];

function TrendIcon({ value }: { value: string }) {
  const num = parseFloat(value);
  if (num > 0) return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (num < 0) return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-[var(--text-faint)]" />;
}

export function TransitBreakdown() {
  const { data, loading } = useRidership();
  const { data: prasaranaData, loading: prasaranaLoading } = usePrasaranaDaily();
  const highlightedLine = useAppStore((s) => s.highlightedLine);
  const setHighlightedLine = useAppStore((s) => s.setHighlightedLine);

  // Freshest day with ALL core services published (avoid zero-painted
  // days where only one pipeline has landed — see CORE_KEYS above)
  let completeIdx = -1;
  for (let i = data.length - 1; i >= 0; i--) {
    if (CORE_KEYS.every((k) => data[i][k] !== null)) { completeIdx = i; break; }
  }
  const latest = completeIdx >= 0 ? data[completeIdx] : data[data.length - 1];
  const prev = completeIdx >= 1 ? data[completeIdx - 1] : undefined;
  const latestPrasarana = prasaranaData.length > 0 ? prasaranaData[prasaranaData.length - 1] : null;
  const prevPrasarana = prasaranaData.length > 1 ? prasaranaData[prasaranaData.length - 2] : null;

  const delta = (curr: number | null, last: number | null) =>
    last ? ((((curr ?? 0) - last) / last) * 100).toFixed(1) : '0.0';

  const totalValue = latest
    ? lines.reduce((s, l) => s + (latest[l.key] ?? 0), 0) + (latestPrasarana?.brt ?? 0)
    : 0;
  const maxVal = totalValue;

  if (loading) {
    return (
      <div
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--skeleton-bg)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up"
        style={{ animationDelay: '550ms', opacity: 0 }}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 bg-[var(--skeleton-bg)] rounded" />
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-24 bg-[var(--skeleton-bg)] rounded" />
                <div className="h-3 w-16 bg-[var(--skeleton-bg)] rounded" />
              </div>
              <div className="h-2 bg-[var(--skeleton-bg)] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up flex flex-col card-hover"
      style={{ animationDelay: '550ms', opacity: 0 }}
    >
      <div className="mb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Line Breakdown
            </h3>
            <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
              Latest day — {latest?.date}
            </p>
          </div>
          {highlightedLine && (
            <button
              onClick={() => setHighlightedLine(null)}
              className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              aria-label="Clear line selection"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Scrollable line list */}
      <div className="space-y-3 overflow-y-auto flex-1 min-h-0 max-h-[320px] pr-1 custom-scrollbar">
        {lines.map((line, lineIdx) => {
          const raw = (latest?.[line.key] ?? null) as number | null;
          const value = raw ?? 0;
          const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
          const d = latest && prev ? delta(latest[line.key] as number | null, prev[line.key] as number | null) : '0.0';

          const isHighlighted = highlightedLine === line.key;
          const isDimmed = highlightedLine !== null && !isHighlighted;
          const isEven = lineIdx % 2 === 0;

          return (
            <div
              key={line.key}
              className={cn(
                'group cursor-pointer rounded-lg px-2 py-1.5 -mx-2 transition-all duration-200',
                isHighlighted && 'bg-[var(--bg-elevated)] ring-1 ring-[var(--border-subtle)]',
                isDimmed && 'opacity-40',
                !highlightedLine && !isHighlighted && isEven && 'bg-[var(--surface-hover)]/30',
                !highlightedLine && !isHighlighted && !isEven && 'hover:bg-[var(--bg-elevated)]',
              )}
              onClick={() =>
                setHighlightedLine(highlightedLine === line.key ? null : line.key)
              }
              role="button"
              tabIndex={0}
              aria-pressed={isHighlighted}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  setHighlightedLine(highlightedLine === line.key ? null : line.key);
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all duration-200',
                      line.bgColor,
                      isHighlighted && 'scale-[1.8] ring-2 ring-offset-1 ring-offset-[var(--surface-card)]',
                      isHighlighted && line.bgColor.replace('bg-', 'ring-')
                    )}
                  />
                  <span className={cn(
                    'text-xs font-medium transition-colors',
                    isHighlighted
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  )}>
                    {line.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs font-semibold tabular-nums',
                    raw === null ? 'text-[var(--text-faint)] italic font-normal' : 'text-[var(--text-primary)]'
                  )}>
                    {raw === null ? '—' : value.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-[var(--text-ghost)] tabular-nums min-w-[32px] text-right">
                    {raw !== null && totalValue > 0 ? `${((value / totalValue) * 100).toFixed(1)}%` : ''}
                  </span>
                  {raw !== null && (
                  <div className="flex items-center gap-0.5">
                    <TrendIcon value={d} />
                    <span
                      className={cn(
                        'text-[10px] tabular-nums font-medium',
                        parseFloat(d) > 0 && 'text-emerald-400',
                        parseFloat(d) < 0 && 'text-red-400',
                        parseFloat(d) === 0 && 'text-[var(--text-faint)]'
                      )}
                    >
                      {Math.abs(parseFloat(d)).toFixed(1)}%
                    </span>
                  </div>
                  )}
                </div>
              </div>
              <div className="h-1 bg-[var(--surface-card)] rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700 ease-out',
                    line.bgColor,
                    isHighlighted ? 'opacity-100' : 'opacity-60'
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {/* BRT Sunway - Batch data */}
        {latestPrasarana && (() => {
          const brtKey = 'brt';
          const isHighlighted = highlightedLine === brtKey;
          const isDimmed = highlightedLine !== null && !isHighlighted;
          const brtPct = maxVal > 0 ? (latestPrasarana.brt / maxVal) * 100 : 0;
          const brtDelta = prevPrasarana ? delta(latestPrasarana.brt, prevPrasarana.brt) : '0.0';

          return (
            <div
              className={cn(
                'group cursor-pointer rounded-lg px-2 py-1.5 -mx-2 transition-all duration-200',
                isHighlighted && 'bg-[var(--bg-elevated)] ring-1 ring-[var(--border-subtle)]',
                isDimmed && 'opacity-40',
                !highlightedLine && 'hover:bg-[var(--bg-elevated)]'
              )}
              onClick={() =>
                setHighlightedLine(highlightedLine === brtKey ? null : brtKey)
              }
              role="button"
              tabIndex={0}
              aria-pressed={isHighlighted}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  setHighlightedLine(highlightedLine === brtKey ? null : brtKey);
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all duration-200',
                      BRT_LINE.bgColor,
                      isHighlighted && 'scale-[1.8] ring-2 ring-offset-1 ring-offset-[var(--surface-card)]'
                    )}
                  />
                  <span className={cn(
                    'text-xs font-medium transition-colors',
                    isHighlighted
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  )}>
                    {BRT_LINE.label}
                  </span>
                  <span className="text-[8px] px-1 py-0.5 rounded bg-sky-400/15 text-sky-300/70 font-medium">T-1</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
                    {latestPrasarana.brt.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-[var(--text-ghost)] tabular-nums min-w-[32px] text-right">
                    {totalValue > 0 ? ((latestPrasarana.brt / totalValue) * 100).toFixed(1) : '0.0'}%
                  </span>
                  {prevPrasarana && (
                    <div className="flex items-center gap-0.5">
                      <TrendIcon value={brtDelta} />
                      <span
                        className={cn(
                          'text-[10px] tabular-nums font-medium',
                          parseFloat(brtDelta) > 0 && 'text-emerald-400',
                          parseFloat(brtDelta) < 0 && 'text-red-400',
                          parseFloat(brtDelta) === 0 && 'text-[var(--text-faint)]'
                        )}
                      >
                        {Math.abs(parseFloat(brtDelta)).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-1 bg-[var(--surface-card)] rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700 ease-out',
                    BRT_LINE.bgColor,
                    isHighlighted ? 'opacity-100' : 'opacity-60'
                  )}
                  style={{ width: `${brtPct}%` }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-faint)] shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest">
            Total Ridership
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {latest?.total.toLocaleString() ?? '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
