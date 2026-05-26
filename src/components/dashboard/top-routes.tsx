'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowRight, MapPin, Train, Bus } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TopRoute {
  origin: string;
  destination: string;
  passengers: number;
  service?: string;
}

interface RoutesData {
  top_routes: TopRoute[];
}

// Minimal interface to extract date range from station JSON
interface StationDateMeta {
  station_series: Record<string, { date: string }[]>;
}

function useJsonData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const parsed: T = await res.json();
      setData(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { fetcher(); }, [fetcher]);
  return { data, loading, error };
}

/** Extract date range from any station series entry */
function useDateRange(stationUrl: string) {
  const { data } = useJsonData<StationDateMeta>(stationUrl);

  return useMemo(() => {
    if (!data) return null;
    const keys = Object.keys(data.station_series);
    if (keys.length === 0) return null;
    const series = data.station_series[keys[0]];
    if (!series || series.length === 0) return null;
    const dates = series.map(d => d.date.slice(0, 10)).sort();
    const fmt = (d: string) => format(parseISO(d), 'dd MMM');
    return {
      start: fmt(dates[0]),
      end: fmt(dates[dates.length - 1]),
      days: dates.length,
    };
  }, [data]);
}

function Skeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-pulse">
      <div className="h-4 w-48 bg-[var(--skeleton-bg)] rounded mb-5" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="h-3 w-20 bg-[var(--skeleton-bg)] rounded" />
                <div className="h-3 w-4 bg-[var(--skeleton-bg)] rounded" />
                <div className="h-3 w-24 bg-[var(--skeleton-bg)] rounded" />
              </div>
            </div>
            <div className="h-3 w-14 bg-[var(--skeleton-bg)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopRoutesRapidRail() {
  const { data, loading, error } = useJsonData<RoutesData>('/prasarana-routes.json');
  const dateRange = useDateRange('/prasarana-stations.json');

  if (loading) return <Skeleton />;
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6">
        <div className="text-center py-8">
          <p className="text-[var(--text-faint)] text-sm">No route data available</p>
          {error && <p className="text-red-400/60 text-[10px] mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  const maxPax = data.top_routes[0]?.passengers ?? 1;

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Top Routes — Rapid Rail
            </h3>
            <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
              Busiest origin → destination pairs
            </p>
          </div>
        </div>
        {dateRange && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 shrink-0">
            <span className="text-[9px] text-amber-400 font-medium tabular-nums">
              {dateRange.start} – {dateRange.end} · {dateRange.days} days
            </span>
          </div>
        )}
      </div>

      {/* Routes list */}
      <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
        {data.top_routes.map((route, i) => {
          const pct = Math.round((route.passengers / maxPax) * 100);
          // Extract short station names
          const originShort = route.origin.replace(/^[A-Z]{2}\d+: /, '');
          const destShort = route.destination.replace(/^[A-Z]{2}\d+: /, '');

          return (
            <div
              key={`${route.origin}-${route.destination}`}
              className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                i < 3 ? 'bg-amber-400/20 text-amber-400' : 'bg-[var(--bg-elevated)] text-[var(--text-faint)]'
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-[var(--text-primary)] font-medium truncate">{originShort}</span>
                  <ArrowRight className="w-3 h-3 text-[var(--text-ghost)] shrink-0" />
                  <span className="text-[var(--text-primary)] font-medium truncate">{destShort}</span>
                </div>
                <div className="mt-1 h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400/60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums shrink-0">
                {route.passengers.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-faint)] flex items-center justify-between">
        {dateRange && (
          <span className="text-[9px] text-[var(--text-faint)]">
            Aggregated over {dateRange.days} days
          </span>
        )}
        <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
          Source: data.gov.my · parquet
        </span>
      </div>
    </div>
  );
}

export function TopRoutesKTMB() {
  const { data, loading, error } = useJsonData<RoutesData>('/ktmb-routes.json');
  const dateRange = useDateRange('/ktmb-stations.json');

  if (loading) return <Skeleton />;
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6">
        <div className="text-center py-8">
          <p className="text-[var(--text-faint)] text-sm">No route data available</p>
          {error && <p className="text-red-400/60 text-[10px] mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  const maxPax = data.top_routes[0]?.passengers ?? 1;

  const SERVICE_STYLE: Record<string, { bg: string; text: string; bar: string }> = {
    ets: { bg: 'bg-cyan-400/10', text: 'text-cyan-400', bar: 'bg-cyan-400/60' },
    intercity: { bg: 'bg-lime-400/10', text: 'text-lime-400', bar: 'bg-lime-400/60' },
    komuter: { bg: 'bg-teal-400/10', text: 'text-teal-400', bar: 'bg-teal-400/60' },
    komuter_utara: { bg: 'bg-pink-400/10', text: 'text-pink-400', bar: 'bg-pink-400/60' },
    tebrau: { bg: 'bg-yellow-400/10', text: 'text-yellow-400', bar: 'bg-yellow-400/60' },
  };

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-center">
            <Train className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Top Routes — KTMB
            </h3>
            <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
              Busiest origin → destination pairs by service
            </p>
          </div>
        </div>
        {dateRange && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-400/10 border border-teal-400/20 shrink-0">
            <span className="text-[9px] text-teal-400 font-medium tabular-nums">
              {dateRange.start} – {dateRange.end} · {dateRange.days} days
            </span>
          </div>
        )}
      </div>

      {/* Routes list */}
      <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
        {data.top_routes.map((route, i) => {
          const pct = Math.round((route.passengers / maxPax) * 100);
          const style = SERVICE_STYLE[route.service ?? ''] ?? { bg: 'bg-gray-400/10', text: 'text-gray-400', bar: 'bg-gray-400/60' };

          return (
            <div
              key={`${route.service}-${route.origin}-${route.destination}`}
              className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                i < 3 ? 'bg-teal-400/20 text-teal-400' : 'bg-[var(--bg-elevated)] text-[var(--text-faint)]'
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${style.bg} ${style.text} shrink-0 font-medium`}>
                    {route.service}
                  </span>
                  <span className="text-[var(--text-primary)] font-medium truncate">{route.origin}</span>
                  <ArrowRight className="w-3 h-3 text-[var(--text-ghost)] shrink-0" />
                  <span className="text-[var(--text-primary)] font-medium truncate">{route.destination}</span>
                </div>
                <div className="mt-1 h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${style.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums shrink-0">
                {route.passengers.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-faint)] flex items-center justify-between">
        {dateRange && (
          <span className="text-[9px] text-[var(--text-faint)]">
            Aggregated over {dateRange.days} days
          </span>
        )}
        <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
          Source: data.gov.my · parquet
        </span>
      </div>
    </div>
  );
}
