'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, HelpCircle, X } from 'lucide-react';

interface SourceStatus {
  label: string;
  lastDate: string;
  freshness: 'fresh' | 'audit-lag';
  hoursAgo: number;
}

export function DataStatusBar() {
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/metadata')
      .then((r) => r.json())
      .then((data) => {
        const nowMs = Date.now();

        // Headline audit — computed from latest_date
        const headlineDate = data.headline.latest_date;
        const headlineMs = headlineDate
          ? new Date(headlineDate + 'T00:00:00').getTime()
          : 0;
        const headlineHours = Math.round((nowMs - headlineMs) / 36e5);

        // Prasarana OD — computed from data_as_of
        const prasaranaDate = data.prasarana.data_as_of?.split(' ')[0];
        const prasaranaMs = prasaranaDate
          ? new Date(prasaranaDate + 'T00:00:00').getTime()
          : 0;
        const prasaranaHours = Math.round((nowMs - prasaranaMs) / 36e5);

        setSources([
          {
            label: 'Rapid Rail OD',
            lastDate: prasaranaDate || '—',
            freshness: prasaranaHours < 48 ? 'fresh' : 'audit-lag',
            hoursAgo: prasaranaHours,
          },
          {
            label: 'Headline Audit',
            lastDate: headlineDate || '—',
            freshness: 'audit-lag',
            hoursAgo: headlineHours,
          },
        ]);
      })
      .catch(() => {
        // Fallback — no status shown if metadata fails
        setSources([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const formatLag = (hours: number) => {
    if (hours < 24) return `Data recorded ${hours}h ago`;
    const days = Math.round(hours / 24);
    return `Data recorded ${days}d ago`;
  };

  if (loading) {
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
          Why two sources?
        </span>
      </button>

      {/* Tooltip dropdown */}
      {showTooltip && (
        <div className="absolute top-full left-4 sm:left-6 md:left-10 mt-2 w-[340px] sm:w-[380px] z-50">
          <div className="rounded-xl bg-[var(--bg-tooltip)] backdrop-blur-xl border border-[var(--border-subtle)] shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Why two data sources?
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
                  <span className="text-xs font-semibold text-[#85AB8B]">Rapid Rail OD</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Station-to-station tap-in/tap-out data. Updated daily with ~18h lag.
                </p>
              </div>

              <div className="rounded-lg bg-orange-400/5 border border-orange-400/10 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-300">Headline Audit</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Monthly quality review before publication (~12-day lag). Used by this dashboard.
                </p>
              </div>
            </div>

            <p className="text-[10px] text-[var(--text-faint)] leading-relaxed mt-3 pt-3 border-t border-[var(--border-faint)]">
              This dashboard uses <span className="text-orange-300 font-medium">headline data</span> for audited accuracy. The OD timeseries (Parquet) is fresher but requires server-side processing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
