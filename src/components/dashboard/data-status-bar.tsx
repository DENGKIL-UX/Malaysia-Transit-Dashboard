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
    <div className="relative w-full px-4 sm:px-6 md:px-10 py-2.5 flex items-center gap-3 sm:gap-5 overflow-x-auto">
      {sources.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-1.5 shrink-0"
        >
          {s.freshness === 'fresh' ? (
            <CheckCircle2 className="w-3 h-3 text-[#85AB8B]" />
          ) : (
            <Clock className="w-3 h-3 text-orange-400" />
          )}
          <span className="text-[10px] sm:text-[11px] text-[var(--text-faint)] font-medium hidden sm:inline">
            {s.label}:
          </span>
          <span
            className={`text-[10px] sm:text-[11px] font-semibold tabular-nums ${
              s.freshness === 'fresh'
                ? 'text-[#85AB8B]'
                : 'text-orange-300'
            }`}
          >
            {s.lastDate}
          </span>
          <span className="text-[9px] sm:text-[10px] text-[var(--text-ghost)] tabular-nums">
            {formatLag(s.hoursAgo)}
          </span>
        </div>
      ))}

      <button
        onClick={() => setShowTooltip((v) => !v)}
        className="ml-auto flex items-center gap-1 text-[var(--text-ghost)] hover:text-[var(--text-muted)] transition-colors shrink-0"
      >
        <HelpCircle className="w-3 h-3" />
        <span className="text-[9px] sm:text-[10px] hidden sm:inline">
          Why the gap?
        </span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full right-4 sm:right-10 mt-2 w-80 z-50">
          <div className="rounded-xl bg-[var(--bg-tooltip)] backdrop-blur-xl border border-[var(--border-subtle)] shadow-2xl p-4">
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute top-2 right-2 text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            <h4 className="text-[11px] font-semibold text-[var(--text-secondary)] mb-2">
              Why two data sources?
            </h4>
            <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
              <span className="text-[#85AB8B]">Rapid Rail OD</span> is
              station-to-station tap-in/tap-out data, updated daily with ~18h
              lag.{' '}
              <span className="text-orange-300">Headline Audit</span> undergoes
              monthly quality review before publication (~12-day lag).
            </p>
            <p className="text-[10px] text-[var(--text-faint)] leading-relaxed mt-2">
              This dashboard uses headline data for audited accuracy. The OD
              timeseries (Parquet) is fresher but requires server-side
              processing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
