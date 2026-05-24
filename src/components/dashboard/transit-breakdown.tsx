'use client';

import { useRidership } from '@/hooks/use-ridership';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface LineData {
  label: string;
  key: 'mrtKajang' | 'mrtPutrajaya' | 'lrtKelanaJaya' | 'lrtAmpang' | 'monorail' | 'komuter';
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
];

function TrendIcon({ value }: { value: string }) {
  const num = parseFloat(value);
  if (num > 0) return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (num < 0) return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-[var(--text-faint)]" />;
}

export function TransitBreakdown() {
  const { data, loading } = useRidership();
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];

  const delta = (curr: number, last: number) =>
    last ? (((curr - last) / last) * 100).toFixed(1) : '0.0';

  const maxVal = latest
    ? Math.max(...lines.map((l) => latest[l.key]))
    : 0;

  if (loading) {
    return (
      <div
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--skeleton-bg)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up"
        style={{ animationDelay: '550ms', opacity: 0 }}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 bg-[var(--skeleton-bg)] rounded" />
          {Array.from({ length: 6 }).map((_, i) => (
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
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up"
      style={{ animationDelay: '550ms', opacity: 0 }}
    >
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Line Breakdown
        </h3>
        <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
          Latest day — {latest?.date}
        </p>
      </div>

      <div className="space-y-4">
        {lines.map((line) => {
          const value = latest?.[line.key] ?? 0;
          const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
          const d = latest && prev ? delta(latest[line.key], prev[line.key]) : '0.0';

          return (
            <div key={line.key} className="group">
              <div className="flex items-center justify-between mb-1.5">
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
              <div className="h-1.5 bg-[var(--surface-card)] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700 ease-out', line.bgColor, 'opacity-60')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-3 border-t border-[var(--border-faint)]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest">
            Total Rail
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {latest?.total.toLocaleString() ?? '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
