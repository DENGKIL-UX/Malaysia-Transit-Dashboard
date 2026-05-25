'use client';

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Clock, HelpCircle, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface SourceStatus {
  label: string;
  lastDate: string;
  freshness: 'fresh' | 'audit-lag';
  hoursAgo: number;
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
      isAudit = false
    ): SourceStatus | null => {
      if (!dateStr) return null;
      const dateMs = new Date(dateStr + 'T00:00:00').getTime();
      const hours = Math.round((nowMs - dateMs) / 36e5);
      return {
        label,
        lastDate: dateStr,
        freshness: isAudit ? 'audit-lag' : hours < 72 ? 'fresh' : 'audit-lag',
        hoursAgo: hours,
      };
    };

    const srcs: SourceStatus[] = [];

    // KTMB OD (Parquet)
    const ktmb = buildSource('KTMB OD', metadata.ktmb?.latest_date);
    if (ktmb) srcs.push(ktmb);

    // Rapid Rail OD (Parquet)
    const pras = buildSource('Rapid Rail OD', metadata.prasarana_od?.latest_date);
    if (pras) srcs.push(pras);

    // Headline audit
    const headline = buildSource('Headline Audit', metadata.headline?.latest_date, true);
    if (headline) srcs.push(headline);

    return srcs;
  }, [metadata]);

  const formatLag = (hours: number) => {
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  };

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
          {s.freshness === 'fresh' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#85AB8B]" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-orange-400" />
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] sm:text-xs text-[var(--text-muted)] font-medium">
              {s.label}
            </span>
            <span className="w-px h-3 bg-[var(--border-subtle)]" />
            <span
              className={`text-[11px] sm:text-xs font-semibold tabular-nums ${
                s.freshness === 'fresh'
                  ? 'text-[#85AB8B]'
                  : 'text-orange-300'
              }`}
            >
              {s.lastDate}
            </span>
            <span className="text-[10px] text-[var(--text-ghost)] tabular-nums">
              ({formatLag(s.hoursAgo)})
            </span>
          </div>
        </div>
      ))}

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
              <div className="rounded-lg bg-[#85AB8B]/5 border border-[#85AB8B]/10 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#85AB8B]" />
                  <span className="text-xs font-semibold text-[#85AB8B]">KTMB OD (Parquet)</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  KTM Berhad origin-destination data. 5 services (ETS, Intercity, Komuter, Komuter Utara, Shuttle Tebrau). Updated daily with ~1-day lag.
                </p>
              </div>

              <div className="rounded-lg bg-[#85AB8B]/5 border border-[#85AB8B]/10 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#85AB8B]" />
                  <span className="text-xs font-semibold text-[#85AB8B]">Rapid Rail OD (Parquet)</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Prasarana tap-in/tap-out data. MRT, LRT, Monorail + BRT Sunway. Updated daily with ~1-day lag.
                </p>
              </div>

              <div className="rounded-lg bg-orange-400/5 border border-orange-400/10 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-300">Headline Audit</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Monthly quality review covering all 13 transit lines (rail + bus). Published ~12 days after month-end. Used by KPI cards and comparison chart.
                </p>
              </div>
            </div>

            <p className="text-[10px] text-[var(--text-faint)] leading-relaxed mt-3 pt-3 border-t border-[var(--border-faint)]">
              The hero &quot;Last update&quot; badge always shows the <span className="text-[#85AB8B] font-medium">freshest date</span> across all three sources.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
