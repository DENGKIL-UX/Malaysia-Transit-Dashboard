'use client';

import { useAppStore } from '@/lib/store';
import { Lightbulb, TrendingUp, Sparkles } from 'lucide-react';

export function QuickInsights() {
  const analyticsState = useAppStore((s) => s.analyticsState);
  const trendDirection = analyticsState?.trendDirection;
  const weeklyGrowth = analyticsState?.weeklyGrowthRate;

  const insight = analyticsState?.insights?.[0];

  // Build a rich insight line from analytics state when no insight string exists
  const richInsight = insight ?? (() => {
    if (!analyticsState || analyticsState.anomalyCount === undefined) return null;
    const parts: string[] = [];
    if (analyticsState.anomalyCount > 0) {
      parts.push(`${analyticsState.anomalyCount} anomaly detected`);
    }
    if (trendDirection && trendDirection !== 'stable') {
      const pct = weeklyGrowth !== null && weeklyGrowth !== undefined
        ? ` (${weeklyGrowth > 0 ? '+' : ''}${(weeklyGrowth * 100).toFixed(1)}%)`
        : '';
      parts.push(`Trend: ${trendDirection}${pct}`);
    }
    if (analyticsState.peakDayOfWeek) {
      parts.push(`Peak: ${analyticsState.peakDayOfWeek}`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  })();

  const iconColor = analyticsState?.anomalyCount && analyticsState.anomalyCount > 0
    ? 'text-orange-400'
    : trendDirection === 'up'
      ? 'text-emerald-400'
      : trendDirection === 'down'
        ? 'text-amber-400'
        : 'text-[#85AB8B]';

  const IconComponent = analyticsState?.anomalyCount && analyticsState.anomalyCount > 0
    ? Sparkles
    : trendDirection === 'up' || trendDirection === 'down'
      ? TrendingUp
      : Lightbulb;

  return (
    <div className="mt-[100px] sm:mt-[108px] mx-4 sm:mx-6 md:mx-10 animate-fade-in-up">
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)]/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 group hover:border-[var(--border-subtle)]/80 transition-all duration-300">
        <div className="shrink-0 w-7 h-7 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center">
          <IconComponent className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed truncate">
            {richInsight ?? 'Tracking 14 transit services across Malaysia'}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {analyticsState?.weeklyGrowthRate !== null && analyticsState?.weeklyGrowthRate !== undefined && (
            <span className={`text-[10px] font-medium tabular-nums ${
              analyticsState.weeklyGrowthRate > 0 ? 'text-emerald-400' :
              analyticsState.weeklyGrowthRate < 0 ? 'text-red-400' :
              'text-[var(--text-faint)]'
            }`}>
              {analyticsState.weeklyGrowthRate > 0 ? '↑' : analyticsState.weeklyGrowthRate < 0 ? '↓' : '→'}
              {(analyticsState.weeklyGrowthRate * 100).toFixed(1)}%
            </span>
          )}
          <span className="text-[9px] text-[var(--text-ghost)] font-medium px-1.5 py-0.5 rounded bg-[var(--surface-active)]/50">
            AI
          </span>
        </div>
      </div>
    </div>
  );
}