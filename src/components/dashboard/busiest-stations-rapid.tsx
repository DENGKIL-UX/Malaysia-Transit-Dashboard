'use client';

import { useMemo } from 'react';
import { usePrasaranaStations } from '@/hooks/use-prasarana-stations';
import { Train, MapPin, Users } from 'lucide-react';

const LINE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  mrt_pjy: { bg: 'bg-sky-400/10', text: 'text-sky-400', dot: 'bg-sky-400' },
  lrt_kj: { bg: 'bg-violet-400/10', text: 'text-violet-400', dot: 'bg-violet-400' },
  lrt_ampang: { bg: 'bg-rose-400/10', text: 'text-rose-400', dot: 'bg-rose-400' },
  monorail: { bg: 'bg-emerald-400/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  brt: { bg: 'bg-orange-300/10', text: 'text-orange-300', dot: 'bg-orange-300' },
};

const LINE_LABELS: Record<string, string> = {
  mrt_pjy: 'MRT Putrajaya',
  lrt_kj: 'LRT Kelana Jaya',
  lrt_ampang: 'LRT Ampang',
  monorail: 'Monorail',
  brt: 'BRT Sunway',
};

function Skeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-pulse">
      <div className="h-4 w-40 bg-[var(--skeleton-bg)] rounded mb-2" />
      <div className="h-3 w-56 bg-[var(--skeleton-bg)] rounded mb-5" />
      <div className="grid grid-cols-5 gap-3 mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[var(--skeleton-bg)] border border-[var(--border-faint)] p-3">
            <div className="h-2 w-12 bg-[var(--skeleton-bg)] rounded mb-2" />
            <div className="h-5 w-16 bg-[var(--skeleton-bg)] rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="h-6 w-6 bg-[var(--skeleton-bg)] rounded-full" />
            <div className="flex-1 h-3 bg-[var(--skeleton-bg)] rounded" />
            <div className="h-3 w-16 bg-[var(--skeleton-bg)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BusiestStationsRapidRail() {
  const { data, loading, error } = usePrasaranaStations();

  const stats = useMemo(() => {
    if (!data) return null;
    const topStation = data.top_stations[0];
    const totalPassengers = data.top_stations.reduce((sum, s) => sum + s.passengers, 0);
    const avgPassengers = Math.round(totalPassengers / data.top_stations.length);
    const lineDistribution = Object.entries(data.stations_per_line)
      .sort((a, b) => b[1] - a[1])
      .map(([line, count]) => ({ line, count, label: LINE_LABELS[line] ?? line }));
    return { topStation, totalPassengers, avgPassengers, lineDistribution };
  }, [data]);

  if (loading) return <Skeleton />;

  if (error || !data || !stats) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6">
        <div className="text-center py-8">
          <p className="text-[var(--text-faint)] text-sm">No station data available</p>
          {error && <p className="text-red-400/60 text-[10px] mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      data-chart
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Busiest Stations — Rapid Rail
          </h3>
          <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
            Top 20 stations by daily passenger boardings · {data.data_as_of}
          </p>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[9px] text-amber-400 font-medium">
            real-time · ~1 day lag
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">
            Total Stations
          </span>
          <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums tracking-tight mt-0.5">
            {data.total_stations}
          </div>
        </div>
        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">
            #1 Station
          </span>
          <div className="text-sm font-semibold text-amber-400 tracking-tight mt-0.5 truncate">
            {stats.topStation?.name ?? '—'}
          </div>
          <span className="text-[10px] text-[var(--text-faint)] tabular-nums">
            {stats.topStation?.passengers.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">
            Top 20 Avg
          </span>
          <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums tracking-tight mt-0.5">
            {stats.avgPassengers.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">
            Lines
          </span>
          <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums tracking-tight mt-0.5">
            {stats.lineDistribution.length}
          </div>
        </div>
      </div>

      {/* Station ranking list */}
      <div className="space-y-0.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
        {data.top_stations.map((station, i) => {
          const maxPassengers = data.top_stations[0].passengers;
          const pct = Math.round((station.passengers / maxPassengers) * 100);
          const lineStyle = LINE_COLORS[station.line] ?? { bg: 'bg-gray-400/10', text: 'text-gray-400', dot: 'bg-gray-400' };

          return (
            <div
              key={station.code}
              className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors group"
            >
              {/* Rank */}
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                i === 0 ? 'bg-amber-400/20 text-amber-400' :
                i === 1 ? 'bg-gray-400/15 text-gray-300' :
                i === 2 ? 'bg-orange-400/15 text-orange-400' :
                'bg-[var(--bg-elevated)] text-[var(--text-faint)]'
              }`}>
                {i + 1}
              </span>

              {/* Station info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                    {station.name}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${lineStyle.bg} ${lineStyle.text} shrink-0`}>
                    {LINE_LABELS[station.line] ?? station.line}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-1 h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${lineStyle.dot}`}
                    style={{ width: `${pct}%`, opacity: 0.7 }}
                  />
                </div>
              </div>

              {/* Passengers */}
              <span className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums shrink-0">
                {station.passengers.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-faint)]">
        <div className="flex items-center gap-3 flex-wrap">
          {stats.lineDistribution.map(({ line, count, label }) => {
            const style = LINE_COLORS[line] ?? { dot: 'bg-gray-400' };
            return (
              <div key={line} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span className="text-[9px] text-[var(--text-faint)]">
                  {label}: <span className="text-[var(--text-muted)] font-medium">{count}</span>
                </span>
              </div>
            );
          })}
        </div>
        <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
          Source: data.gov.my · parquet
        </span>
      </div>
    </div>
  );
}
