'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Brain, AlertTriangle, Zap, Calendar } from 'lucide-react';
import { useAppStore, type AnalyticsState } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import type { Analytics } from '@/hooks/use-analytics';

// ─── Types ──────────────────────────────────────────────────────────

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

// ─── Delta Badge ────────────────────────────────────────────────────

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

// ─── ML Insights Panel ──────────────────────────────────────────────

function MLInsightsPanel({ analyticsState }: { analyticsState: AnalyticsState | null }) {
  const relativeTime = useMemo(() => {
    if (!analyticsState?.lastComputed) return 'just now';
    try {
      return formatDistanceToNow(new Date(analyticsState.lastComputed), { addSuffix: true });
    } catch {
      return '';
    }
  }, [analyticsState]);

  if (!analyticsState) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md overflow-hidden animate-fade-in-up">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="h-4 w-48 bg-[var(--skeleton-bg)] rounded animate-pulse" />
          <div className="h-3 w-32 bg-[var(--skeleton-bg)] rounded animate-pulse mt-2" />
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-[var(--skeleton-bg)] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const {
    trendDirection,
    weeklyGrowthRate,
    anomalyCount,
    forecastNext,
    peakDayOfWeek,
    lowDayOfWeek,
    weekendWeekdayRatio,
    anomalies,
  } = analyticsState;

  const trendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor = trendDirection === 'up' ? 'text-emerald-400' : trendDirection === 'down' ? 'text-amber-400' : 'text-[var(--text-muted)]';
  const trendBg = trendDirection === 'up' ? 'bg-emerald-400/10 border-emerald-400/20' : trendDirection === 'down' ? 'bg-amber-400/10 border-amber-400/20' : 'bg-[var(--surface-active)] border-[var(--border-subtle)]';
  const trendLabel = trendDirection === 'up' ? 'Upward' : trendDirection === 'down' ? 'Downward' : 'Stable';

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#85AB8B]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            ML Analytics Insights
          </h3>
        </div>
        <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
          Last computed: {relativeTime} · Auto-refreshes every 5 min
        </p>
      </div>

      {/* Summary metric cards */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Trend Direction */}
          <div className={`rounded-xl border p-3.5 ${trendBg}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
              <span className="text-[10px] text-[var(--text-muted)] font-medium">Trend</span>
            </div>
            <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
              {trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'} {trendLabel}
            </div>
            <span className="text-[9px] text-[var(--text-faint)]">14-day regression</span>
          </div>

          {/* Growth Rate */}
          <div className={`rounded-xl border p-3.5 ${
            weeklyGrowthRate > 0 ? 'bg-emerald-400/5 border-emerald-400/15' : weeklyGrowthRate < 0 ? 'bg-amber-400/5 border-amber-400/15' : 'bg-[var(--surface-active)] border-[var(--border-subtle)]'
          }`}>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-[var(--text-muted)] font-medium">Growth</span>
            </div>
            <div className={`text-lg font-semibold tabular-nums ${
              weeklyGrowthRate > 0 ? 'text-emerald-400' : weeklyGrowthRate < 0 ? 'text-amber-400' : 'text-[var(--text-primary)]'
            }`}>
              {weeklyGrowthRate > 0 ? '+' : ''}{weeklyGrowthRate}%
            </div>
            <span className="text-[9px] text-[var(--text-faint)]">weekly WoW change</span>
          </div>

          {/* Anomaly Count */}
          <div className={`rounded-xl border p-3.5 ${
            anomalyCount > 0 ? 'bg-red-400/5 border-red-400/15' : 'bg-[var(--surface-active)] border-[var(--border-subtle)]'
          }`}>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className={`w-3.5 h-3.5 ${anomalyCount > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
              <span className="text-[10px] text-[var(--text-muted)] font-medium">Anomalies</span>
            </div>
            <div className={`text-lg font-semibold tabular-nums ${anomalyCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {anomalyCount} found
            </div>
            <span className="text-[9px] text-[var(--text-faint)]">z-score detection</span>
          </div>

          {/* Forecast */}
          <div className="rounded-xl border bg-sky-400/5 border-sky-400/15 p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[10px] text-[var(--text-muted)] font-medium">Forecast</span>
            </div>
            <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
              {forecastNext ? `▲ ${Math.round(forecastNext / 1000)}K` : '—'}
            </div>
            <span className="text-[9px] text-[var(--text-faint)]">next day KTMB total</span>
          </div>
        </div>
      </div>

      {/* Weekly Pattern */}
      <div className="px-5 py-3 border-t border-[var(--border-faint)]">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-3.5 h-3.5 text-[#85AB8B]" />
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">Weekly Pattern</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
          <span className="text-[var(--text-muted)]">
            Peak: <span className="font-semibold text-[var(--text-primary)]">{peakDayOfWeek}</span>
          </span>
          <span className="text-[var(--text-ghost)]">·</span>
          <span className="text-[var(--text-muted)]">
            Low: <span className="font-semibold text-[var(--text-primary)]">{lowDayOfWeek}</span>
          </span>
          <span className="text-[var(--text-ghost)]">·</span>
          <span className="text-[var(--text-muted)]">
            Wknd ratio: <span className="font-semibold text-[var(--text-primary)]">{weekendWeekdayRatio.toFixed(2)}</span>
          </span>
        </div>
      </div>

      {/* Anomaly List */}
      {anomalies.length > 0 && (
        <div className="px-5 py-3 border-t border-[var(--border-faint)]">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Anomalies Detected ({anomalies.length})
            </span>
          </div>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
            {anomalies.slice(0, 6).map((a, i) => (
              <div
                key={`${a.date}-${a.field}-${a.source}-${i}`}
                className={`flex items-start gap-2 text-[10px] px-2.5 py-2 rounded-lg ${
                  a.severity === 'critical'
                    ? 'bg-red-400/5 border border-red-400/10'
                    : 'bg-amber-400/5 border border-amber-400/10'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 shrink-0 ${
                  a.severity === 'critical' ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="text-[var(--text-secondary)] font-medium">
                    {a.date}
                  </span>{' '}
                  <span className="text-[var(--text-faint)]">
                    {a.source} {a.field}
                  </span>{' '}
                  <span className={a.deviation > 0 ? 'text-red-400' : 'text-emerald-400'}>
                    {a.deviation > 0 ? '+' : ''}{a.deviation.toFixed(2)}σ
                  </span>
                  <span className="text-[var(--text-ghost)]">
                    {' '}({a.value.toLocaleString()} vs {a.expected.toLocaleString()})
                  </span>
                </div>
              </div>
            ))}
            {anomalies.length > 6 && (
              <p className="text-[9px] text-[var(--text-ghost)] px-2.5">
                +{anomalies.length - 6} more anomalies detected
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Analytics Table Component ─────────────────────────────────

export function AnalyticsTable({ analytics, loading }: Props) {
  const analyticsState = useAppStore((s) => s.analyticsState);

  if (loading) {
    return (
      <div className="space-y-5">
        <MLInsightsPanel analyticsState={null} />
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
      </div>
    );
  }

  if (!analytics) return null;

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
    <div className="space-y-5">
      {/* ML Insights Panel */}
      <MLInsightsPanel analyticsState={analyticsState} />

      {/* Existing Day-Type Analytics Table */}
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
    </div>
  );
}
