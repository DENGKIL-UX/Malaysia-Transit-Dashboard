'use client';

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Clock, HelpCircle, X, Calendar, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface SourceStatus {
  label: string;
  lastDate: string;
  freshness: 'fresh' | 'expected' | 'delayed' | 'overdue';
  hoursAgo: number;
  lagExplainedBy: string[];
  isOverdue: boolean;
}

export function DataStatusBar() {
  const [showTooltip, setShowTooltip] = useState(false);
  const metadata = useAppStore((s) => s.metadata);
  const metadataLoading = useAppStore((s) => s.metadataLoading);

  const sources = useMemo<SourceStatus[]>(() => {
    if (!metadata) return [];

    const nowMs = Date.now();

    const buildSource = (
      label: string,
      dateStr: string,
      status: string,
      lagExplainedBy: string[] = [],
      isOverdue = false
    ): SourceStatus | null => {
      if (!dateStr) return null;
      const dateMs = new Date(dateStr + 'T00:00:00').getTime();
      const hours = Math.round((nowMs - dateMs) / 36e5);
      const freshness: SourceStatus['freshness'] =
        status === 'fresh' ? 'fresh' :
        status === 'expected' ? 'expected' :
        status === 'overdue' ? 'overdue' : 'delayed';
      return {
        label,
        lastDate: dateStr,
        freshness,
        hoursAgo: hours,
        lagExplainedBy,
        isOverdue,
      };
    };

    const srcs: SourceStatus[] = [];

    // KTMB OD (Parquet)
    const ktmb = buildSource(
      'KTMB OD',
      metadata.ktmb?.latest_date,
      metadata.ktmb?.status ?? 'unknown',
      metadata.ktmb?.lag_explained_by ?? [],
      metadata.ktmb?.is_overdue ?? false
    );
    if (ktmb) srcs.push(ktmb);

    // Rapid Rail OD (Parquet)
    const pras = buildSource(
      'Rapid Rail OD',
      metadata.prasarana_od?.latest_date,
      metadata.prasarana_od?.status ?? 'unknown',
      metadata.prasarana_od?.lag_explained_by ?? [],
      metadata.prasarana_od?.is_overdue ?? false
    );
    if (pras) srcs.push(pras);

    // Headline audit
    const headline = buildSource(
      'Headline Audit',
      metadata.headline?.latest_date,
      metadata.headline?.status ?? 'unknown',
      metadata.headline?.lag_explained_by ?? [],
      metadata.headline?.is_overdue ?? false
    );
    if (headline) srcs.push(headline);

    return srcs;
  }, [metadata]);

  const formatLag = (hours: number) => {
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  };

  const freshnessIcon = (freshness: SourceStatus['freshness']) => {
    switch (freshness) {
      case 'fresh':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'expected':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'delayed':
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
      case 'overdue':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    }
  };

  const freshnessColor = (freshness: SourceStatus['freshness']) => {
    switch (freshness) {
      case 'fresh': return 'text-emerald-400';
      case 'expected': return 'text-amber-400';
      case 'delayed': return 'text-orange-400';
      case 'overdue': return 'text-red-400';
    }
  };

  // Today's blackout status
  const todayIsBlackout = metadata?.holiday_context?.todayIsBlackout ?? false;

  if (metadataLoading) {
    return (
      <div className="w-full px-4 sm:px-6 md:px-10 py-2 flex items-center gap-3 animate-pulse">
        <div className="h-3 w-32 bg-[var(--skeleton-bg)] rounded" />
        <div className="h-3 w-28 bg-[var(--skeleton-bg)] rounded" />
      </div>
    );
  }

  if (!sources.length) return null;

  return (
    <div className="relative w-full px-4 sm:px-6 md:px-10 py-2.5 flex items-center gap-4 sm:gap-6 overflow-x-auto">
      {sources.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-2 shrink-0 rounded-lg bg-[var(--surface-card)] border border-[var(--border-faint)] px-3 py-1.5"
        >
          {freshnessIcon(s.freshness)}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] sm:text-xs text-[var(--text-muted)] font-medium">
              {s.label}
            </span>
            <span className="w-px h-3 bg-[var(--border-subtle)]" />
            <span
              className={`text-[11px] sm:text-xs font-semibold tabular-nums ${
                freshnessColor(s.freshness)
              }`}
            >
              {s.lastDate}
            </span>
            <span className="text-[10px] text-[var(--text-ghost)] tabular-nums">
              ({formatLag(s.hoursAgo)})
            </span>
          </div>
          {/* Holiday indicator when lag is explained by calendar */}
          {s.lagExplainedBy.length > 0 && s.lagExplainedBy[0] !== 'normal T-1 batch' && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-orange-400/10 text-orange-400 border border-orange-400/20 flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5" />
              {s.lagExplainedBy[0].length > 10 ? 'holiday delay' : s.lagExplainedBy[0]}
            </span>
          )}
        </div>
      ))}

      {/* Today's blackout indicator */}
      {todayIsBlackout && metadata?.holiday_context && (
        <div className="flex items-center gap-1.5 shrink-0 text-[9px] text-[var(--text-faint)]">
          <Calendar className="w-3 h-3 text-orange-400/60" />
          <span>Today: non-working day</span>
        </div>
      )}

      <button
        onClick={() => setShowTooltip((v) => !v)}
        className="ml-auto flex items-center gap-1.5 text-[var(--text-ghost)] hover:text-[var(--text-secondary)] transition-colors shrink-0 rounded-lg hover:bg-[var(--surface-card)] px-2.5 py-1.5 border border-transparent hover:border-[var(--border-faint)]"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span className="text-[10px] sm:text-[11px] hidden sm:inline font-medium">
          Why three sources?
        </span>
      </button>

      {/* Tooltip dropdown */}
      {showTooltip && (
        <div className="absolute top-full left-4 sm:left-6 md:left-10 mt-2 w-[340px] sm:w-[420px] z-50">
          <div className="rounded-xl bg-[var(--bg-tooltip)] backdrop-blur-xl border border-[var(--border-subtle)] shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Three data pipelines
              </h4>
              <button
                onClick={() => setShowTooltip(false)}
                className="text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors p-1 rounded-md hover:bg-[var(--surface-card)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg bg-emerald-400/5 border border-emerald-400/10 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">KTMB OD (Parquet)</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  KTM Berhad origin-destination data. 5 services (ETS, Intercity, Komuter, Komuter Utara, Shuttle Tebrau). Updated daily at ~03:31 MYT with T-1 data.
                </p>
              </div>

              <div className="rounded-lg bg-emerald-400/5 border border-emerald-400/10 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">Rapid Rail OD (Parquet)</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Prasarana tap-in/tap-out data. MRT, LRT, Monorail + BRT Sunway. Updated daily at ~03:45 MYT with T-1 data.
                </p>
              </div>

              <div className="rounded-lg bg-orange-400/5 border border-orange-400/10 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-300">Headline Audit</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Monthly quality review covering all 14 transit lines (rail + bus). Published ~12 days after month-end following audit. Used by KPI cards and comparison chart.
                </p>
              </div>
            </div>

            {/* Holiday-aware lag info */}
            {metadata?.holiday_context && (
              <div className="mt-3 pt-3 border-t border-[var(--border-faint)]">
                <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
                  Data lag is determined by the national open data pipeline. Weekend and public holidays extend the batch delay beyond T-1.{' '}
                  {metadata.holiday_context.todayIsBlackout && (
                    <span className="text-orange-400">
                      Today is a non-working day — next batch expected {metadata.holiday_context.nextWorkingDay}.
                    </span>
                  )}
                </p>
              </div>
            )}

            <p className="text-[10px] text-[var(--text-faint)] leading-relaxed mt-3 pt-3 border-t border-[var(--border-faint)]">
              The hero &quot;Last update&quot; badge always shows the <span className="text-emerald-400 font-medium">freshest date</span> across all three sources.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
