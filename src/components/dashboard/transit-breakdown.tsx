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
  /** Hex equivalent of `color` — used for SVG sparkline strokes. */
  hex: string;
}

const lines: LineData[] = [
  { label: 'MRT Kajang Line', key: 'mrtKajang', color: 'text-amber-400', bgColor: 'bg-amber-400', hex: '#fbbf24' },
  { label: 'MRT Putrajaya Line', key: 'mrtPutrajaya', color: 'text-sky-400', bgColor: 'bg-sky-400', hex: '#38bdf8' },
  { label: 'LRT Kelana Jaya', key: 'lrtKelanaJaya', color: 'text-violet-400', bgColor: 'bg-violet-400', hex: '#a78bfa' },
  { label: 'LRT Ampang', key: 'lrtAmpang', color: 'text-rose-400', bgColor: 'bg-rose-400', hex: '#fb7185' },
  { label: 'Monorail', key: 'monorail', color: 'text-emerald-400', bgColor: 'bg-emerald-400', hex: '#34d399' },
  { label: 'KTM Komuter', key: 'komuter', color: 'text-teal-400', bgColor: 'bg-teal-400', hex: '#2dd4bf' },
  { label: 'ETS', key: 'ets', color: 'text-cyan-400', bgColor: 'bg-cyan-400', hex: '#22d3ee' },
  { label: 'KTM Intercity', key: 'intercity', color: 'text-lime-400', bgColor: 'bg-lime-400', hex: '#a3e635' },
  { label: 'KTM Komuter Utara', key: 'komuterUtara', color: 'text-pink-400', bgColor: 'bg-pink-400', hex: '#f472b6' },
  { label: 'Shuttle Tebrau', key: 'tebrau', color: 'text-yellow-400', bgColor: 'bg-yellow-400', hex: '#facc15' },
  { label: 'Rapid Bus (KL)', key: 'busKl', color: 'text-orange-400', bgColor: 'bg-orange-400', hex: '#fb923c' },
  { label: 'Rapid Bus (Kuantan)', key: 'busKuantan', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-400', hex: '#e879f9' },
  { label: 'Rapid Bus (Penang)', key: 'busRpn', color: 'text-stone-400', bgColor: 'bg-stone-400', hex: '#a8a29e' },
];

const BRT_LINE = { label: 'BRT Sunway', color: 'text-orange-300', bgColor: 'bg-orange-300', hex: '#fdba74' };

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

/**
 * Compact 7-day trend sparkline — pure SVG, mirrors the KPI card sparkline
 * language (cubic-bezier smoothing + gradient fill + end dot).
 */
function LineSparkline({ data, color, id }: { data: number[]; color: string; id: string }) {
  if (data.length < 2) return null;

  const W = 72;
  const H = 20;
  const PAD_X = 2;
  const PAD_Y = 3;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_Y * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points: [number, number][] = data.map((v, i) => [
    PAD_X + (i / (data.length - 1)) * plotW,
    PAD_Y + plotH - ((v - min) / range) * plotH,
  ]);

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const cpx = (x1 + x2) / 2;
    d += ` C ${cpx} ${y1}, ${cpx} ${y2}, ${x2} ${y2}`;
  }
  const [lastX, lastY] = points[points.length - 1];
  const fillPath = `${d} L ${lastX} ${H} L ${points[0][0]} ${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-[72px] h-5 shrink-0"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${id})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
      <circle cx={lastX} cy={lastY} r="0.9" fill="var(--surface-card, #0a120a)" />
    </svg>
  );
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

  // BRT anchor: freshest day BRT actually published — the KTMB-only tail
  // days (bus_rkl null → mapped 0) must not stand in as "zero ridership"
  let brtIdx = -1;
  for (let i = prasaranaData.length - 1; i >= 0; i--) {
    if ((prasaranaData[i].brt ?? 0) > 0) { brtIdx = i; break; }
  }
  const latestPrasarana = brtIdx >= 0 ? prasaranaData[brtIdx] : null;
  const prevPrasarana = brtIdx > 0 ? prasaranaData[brtIdx - 1] : null;

  const delta = (curr: number | null, last: number | null) =>
    last ? ((((curr ?? 0) - last) / last) * 100).toFixed(1) : '0.0';

  const totalValue = latest
    ? lines.reduce((s, l) => s + (latest[l.key] ?? 0), 0) + (latestPrasarana?.brt ?? 0)
    : 0;
  const maxVal = totalValue;

  // 7-day series per line for inline sparklines (oldest → newest)
  const sparkSeries = (key: keyof RidershipDay) =>
    data
      .slice(-7)
      .map((d) => d[key])
      .filter((v): v is number => v !== null);
  const brtSparkSeries = prasaranaData
    .slice(-7)
    .map((d) => d.brt)
    .filter((v) => v > 0);

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
              Latest day — {latest?.date} · 7-day trend curves
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
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all duration-200 shrink-0',
                      line.bgColor,
                      isHighlighted && 'scale-[1.8] ring-2 ring-offset-1 ring-offset-[var(--surface-card)]',
                      isHighlighted && line.bgColor.replace('bg-', 'ring-')
                    )}
                  />
                  <span className={cn(
                    'text-xs font-medium transition-colors truncate',
                    isHighlighted
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  )}>
                    {line.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {raw !== null && (
                    <span className="hidden md:block opacity-60 group-hover:opacity-100 transition-opacity" title="7-day trend">
                      <LineSparkline
                        data={sparkSeries(line.key)}
                        color={line.hex}
                        id={`spark-${line.key}`}
                      />
                    </span>
                  )}
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums',
                      raw === null ? 'text-[var(--text-faint)] italic font-normal' : 'text-[var(--text-primary)]'
                    )}
                    title={raw === null ? 'Not published by data.gov.my for this date' : undefined}
                  >
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
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden md:block opacity-60 group-hover:opacity-100 transition-opacity" title="7-day trend">
                    <LineSparkline data={brtSparkSeries} color={BRT_LINE.hex} id="spark-brt" />
                  </span>
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
