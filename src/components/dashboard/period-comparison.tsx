'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePeriodComparison,
  type PeriodResult,
  type Trend,
} from '@/hooks/use-period-comparison';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ACCENT_STYLES: Record<
  PeriodResult['accent'],
  { bar: string; badge: string; icon: string }
> = {
  amber: {
    bar: 'bg-amber-400',
    badge: 'text-amber-400',
    icon: 'text-amber-400/70',
  },
  teal: {
    bar: 'bg-teal-400',
    badge: 'text-teal-400',
    icon: 'text-teal-400/70',
  },
  emerald: {
    bar: 'bg-emerald-400',
    badge: 'text-emerald-400',
    icon: 'text-emerald-400/70',
  },
};

const DELAYS = ['100ms', '200ms', '300ms'];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TrendIcon({ trend, accent }: { trend: Trend; accent: PeriodResult['accent'] }) {
  const cls = ACCENT_STYLES[accent].icon;
  if (trend === 'up') return <TrendingUp className={cn('h-4 w-4', cls)} />;
  if (trend === 'down') return <TrendingDown className={cn('h-4 w-4', cls)} />;
  return <Minus className={cn('h-4 w-4', 'text-[var(--text-muted)]')} />;
}

function PctBadge({
  pct,
  trend,
  accent,
}: {
  pct: number;
  trend: Trend;
  accent: PeriodResult['accent'];
}) {
  const isUp = trend === 'up';
  const isDown = trend === 'down';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
        isUp && 'bg-emerald-400/10 text-emerald-400',
        isDown && 'bg-red-400/10 text-red-400',
        !isUp && !isDown && 'bg-[var(--border-subtle)] text-[var(--text-muted)]',
        // Override with accent colour for the number
      )}
    >
      {isUp ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  );
}

function ProportionBar({
  current,
  previous,
  accent,
}: {
  current: number;
  previous: number;
  accent: PeriodResult['accent'];
}) {
  const max = Math.max(current, previous, 1);
  const currentPct = (current / max) * 100;
  const previousPct = (previous / max) * 100;

  return (
    <div className="flex flex-col gap-1 mt-3">
      {/* Current (left-aligned bar) */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-faint)] w-10 shrink-0 text-right">Now</span>
        <div className="flex-1 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <div
            className={cn('h-full rounded-full', ACCENT_STYLES[accent].bar)}
            style={{ width: `${currentPct}%`, transition: 'width 0.6s ease' }}
          />
        </div>
      </div>
      {/* Previous (left-aligned bar) */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-faint)] w-10 shrink-0 text-right">Prev</span>
        <div className="flex-1 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--text-muted)]/40"
            style={{ width: `${previousPct}%`, transition: 'width 0.6s ease' }}
          />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] backdrop-blur-md shadow-lg p-4 animate-pulse">
      <div className="h-3 w-24 rounded bg-[var(--border-subtle)] mb-4" />
      <div className="h-5 w-32 rounded bg-[var(--border-subtle)] mb-1" />
      <div className="h-3 w-20 rounded bg-[var(--border-subtle)] mb-3" />
      <div className="h-3 w-20 rounded bg-[var(--border-subtle)] mb-1" />
      <div className="h-5 w-28 rounded bg-[var(--border-subtle)] mb-3" />
      <div className="h-4 w-14 rounded-full bg-[var(--border-subtle)]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

function ComparisonCard({
  comparison,
  delay,
}: {
  comparison: PeriodResult;
  delay: string;
}) {
  const styles = ACCENT_STYLES[comparison.accent];

  return (
    <div
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] backdrop-blur-md shadow-lg p-4 animate-fade-in-up"
      style={{ animationDelay: delay, opacity: 0 }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
          {comparison.label}
        </span>
        <TrendIcon trend={comparison.trend} accent={comparison.accent} />
      </div>

      {/* Current period */}
      <div className="mb-3">
        <p className="text-[10px] text-[var(--text-faint)] mb-0.5 leading-tight">
          {comparison.currentLabel}
        </p>
        <p className="text-lg font-semibold text-[var(--text-primary)] tabular-nums tracking-wide">
          {comparison.value.toLocaleString()}
        </p>
      </div>

      {/* Previous period */}
      <div className="mb-3">
        <p className="text-[10px] text-[var(--text-faint)] mb-0.5 leading-tight">
          {comparison.previousLabel}
        </p>
        <p className="text-sm text-[var(--text-muted)] tabular-nums">
          {comparison.previousValue.toLocaleString()}
        </p>
      </div>

      {/* % change badge */}
      <PctBadge
        pct={comparison.pctChange}
        trend={comparison.trend}
        accent={comparison.accent}
      />

      {/* Proportion bar */}
      <ProportionBar
        current={comparison.value}
        previous={comparison.previousValue}
        accent={comparison.accent}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported component                                                 */
/* ------------------------------------------------------------------ */

export function PeriodComparison() {
  const { comparisons, loading, error } = usePeriodComparison();

  if (error) {
    return (
      <div className="text-center text-sm text-red-400 py-6">
        Failed to load comparison data
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {comparisons.map((c, i) => (
        <ComparisonCard key={c.label} comparison={c} delay={DELAYS[i]} />
      ))}
    </div>
  );
}