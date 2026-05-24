'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Analytics } from '@/hooks/use-analytics';

interface Metric {
  label: string;
  value: number;
  delta: number;
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  warning?: string;
}

interface Props {
  analytics: Analytics | null;
  loading: boolean;
}

function DeltaBadge({ delta }: { delta: number }) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <span
      className={`
        flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
        ${
          isPositive
            ? 'bg-green-500/15 text-green-400'
            : isNegative
              ? 'bg-red-500/15 text-red-400'
              : 'bg-[var(--surface-active)] text-[var(--text-muted)]'
        }
      `}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : isNegative ? (
        <TrendingDown className="w-3 h-3" />
      ) : (
        <Minus className="w-3 h-3" />
      )}
      {isPositive ? '+' : ''}
      {delta.toFixed(1)}%
    </span>
  );
}

export function AnalyticsTable({ analytics, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md overflow-hidden animate-fade-in-up">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="h-4 w-36 bg-[var(--skeleton-bg)] rounded animate-pulse" />
        </div>
        <div className="divide-y divide-[var(--border-faint)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <div className="h-3 w-32 bg-[var(--skeleton-bg)] rounded animate-pulse" />
              <div className="h-3 w-24 bg-[var(--skeleton-bg)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const metrics: Metric[] = [
    {
      label: 'Holiday Avg (Kajang)',
      value: analytics.holiday_kajang_avg,
      delta:
        analytics.weekday_kajang_avg > 0
          ? ((analytics.holiday_kajang_avg / analytics.weekday_kajang_avg - 1) * 100)
          : 0,
      confidence: 'medium',
      warning: 'Based on available holiday data in 90-day window',
    },
    {
      label: 'Weekday Avg (Kajang)',
      value: analytics.weekday_kajang_avg,
      delta: 0,
      confidence: 'high',
    },
    {
      label: 'Friday Peak (Kajang)',
      value: analytics.friday_kajang_avg,
      delta:
        analytics.weekday_kajang_avg > 0
          ? ((analytics.friday_kajang_avg / analytics.weekday_kajang_avg - 1) * 100)
          : 0,
      confidence: 'high',
    },
    {
      label: 'Holiday Avg (Putrajaya)',
      value: analytics.holiday_putrajaya_avg,
      delta:
        analytics.weekday_putrajaya_avg > 0
          ? ((analytics.holiday_putrajaya_avg / analytics.weekday_putrajaya_avg - 1) * 100)
          : 0,
      confidence: 'medium',
      warning: 'Based on available holiday data in 90-day window',
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Day-Type Analytics
        </h3>
        <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
          Averages computed over 90-day window · Baseline: Weekday Avg
        </p>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[var(--border-faint)]">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--surface-card)] transition-colors duration-200"
            style={{
              animationDelay: `${i * 80}ms`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">
                {m.label}
              </span>
              {m.confidence !== 'high' && m.warning && (
                <span
                  className="text-[9px] text-orange-400/80 cursor-help"
                  title={m.warning}
                >
                  ⚠ est.
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                {m.value.toLocaleString()}
              </span>
              <DeltaBadge delta={m.delta} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[var(--border-faint)]">
        <span className="text-[9px] text-[var(--text-ghost)]">
          Green = above weekday baseline · Red = below weekday baseline · Lower holiday ridership is expected · Delta vs weekday avg
        </span>
      </div>
    </div>
  );
}
