'use client';

import { useRidership, type RidershipDay } from '@/hooks/use-ridership';
import { usePrasaranaDaily } from '@/hooks/use-prasarana-daily';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

function TrendIcon({ value }: { value: string }) {
  const num = parseFloat(value);
  if (num > 0) return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (num < 0) return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-[var(--text-faint)]" />;
}

export function TransitBreakdown() {
  const { data, loading } = useRidership();
  const { data: prasaranaData, loading: prasaranaLoading } = usePrasaranaDaily();
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];
  const latestPrasarana = prasaranaData.length > 0 ? prasaranaData[prasaranaData.length - 1] : null;
  const prevPrasarana = prasaranaData.length > 1 ? prasaranaData[prasaranaData.length - 2] : null;

  const delta = (curr: number, last: number) =>
    last ? (((curr - last) / last) * 100).toFixed(1) : '0.0';

  const maxVal = latest
    ? Math.max(...lines.map((l) => latest[l.key]), latestPrasarana?.brt ?? 0)
    : 0;

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
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up flex flex-col"
      style={{ animationDelay: '550ms', opacity: 0 }}
    >
      <div className="mb-4 shrink-0">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Line Breakdown
        </h3>
        <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
          Latest day — {latest?.date}
        </p>
      </div>

      {/* Scrollable line list */}
      <div className="space-y-3 overflow-y-auto flex-1 min-h-0 max-h-[320px] pr-1 custom-scrollbar">
        {lines.map((line) => {
          const value = latest?.[line.key] ?? 0;
          const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
          const d = latest && prev ? delta(latest[line.key], prev[line.key]) : '0.0';

          return (
            <div key={line.key} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={cn('w-1.5 h-1.5 rounded-full', line.bgColor)} />
                  <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    {line.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
                    {value.toLocaleString()}
                  </span>
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
                </div>
              </div>
              <div className="h-1 bg-[var(--surface-card)] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700 ease-out', line.bgColor, 'opacity-60')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {/* BRT Sunway - Batch data */}
        {latestPrasarana && (
          <div className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={cn('w-1.5 h-1.5 rounded-full', BRT_LINE.bgColor)} />
                <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  {BRT_LINE.label}
                </span>
                <span className="text-[8px] px-1 py-0.5 rounded bg-sky-400/15 text-sky-300/70 font-medium">T-1</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
                  {latestPrasarana.brt.toLocaleString()}
                </span>
                {prevPrasarana && (
                  <div className="flex items-center gap-0.5">
                    <TrendIcon value={delta(latestPrasarana.brt, prevPrasarana.brt)} />
                    <span
                      className={cn(
                        'text-[10px] tabular-nums font-medium',
                        parseFloat(delta(latestPrasarana.brt, prevPrasarana.brt)) > 0 && 'text-emerald-400',
                        parseFloat(delta(latestPrasarana.brt, prevPrasarana.brt)) < 0 && 'text-red-400',
                        parseFloat(delta(latestPrasarana.brt, prevPrasarana.brt)) === 0 && 'text-[var(--text-faint)]'
                      )}
                    >
                      {Math.abs(parseFloat(delta(latestPrasarana.brt, prevPrasarana.brt))).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="h-1 bg-[var(--surface-card)] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700 ease-out', BRT_LINE.bgColor, 'opacity-60')}
                style={{ width: `${maxVal > 0 ? (latestPrasarana.brt / maxVal) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
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
