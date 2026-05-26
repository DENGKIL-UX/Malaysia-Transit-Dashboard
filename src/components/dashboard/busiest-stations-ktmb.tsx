'use client';

import { useMemo, useState, useCallback } from 'react';
import { useKtmbStations } from '@/hooks/use-ktmb-stations';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const WINDOW_SIZE = 14;
const MIN_TRAILING_DAYS = 7;

const SERVICE_COLORS: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  ets: { bg: 'bg-cyan-400/10', text: 'text-cyan-400', dot: 'bg-cyan-400', bar: 'bg-cyan-400' },
  intercity: { bg: 'bg-lime-400/10', text: 'text-lime-400', dot: 'bg-lime-400', bar: 'bg-lime-400' },
  komuter: { bg: 'bg-teal-400/10', text: 'text-teal-400', dot: 'bg-teal-400', bar: 'bg-teal-400' },
  komuter_utara: { bg: 'bg-pink-400/10', text: 'text-pink-400', dot: 'bg-pink-400', bar: 'bg-pink-400' },
  tebrau: { bg: 'bg-yellow-400/10', text: 'text-yellow-400', dot: 'bg-yellow-400', bar: 'bg-yellow-400' },
};

const SERVICE_LABELS: Record<string, string> = {
  ets: 'ETS',
  intercity: 'Intercity',
  komuter: 'Komuter',
  komuter_utara: 'Komuter Utara',
  tebrau: 'Shuttle Tebrau',
};

type TabKey = 'overall' | 'ets' | 'intercity' | 'komuter' | 'komuter_utara' | 'tebrau';

function Skeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-pulse">
      <div className="h-4 w-40 bg-[var(--skeleton-bg)] rounded mb-2" />
      <div className="h-3 w-56 bg-[var(--skeleton-bg)] rounded mb-5" />
      <div className="flex gap-2 mb-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-20 bg-[var(--skeleton-bg)] rounded-lg" />
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

export function BusiestStationsKTMB() {
  const { data, loading, error } = useKtmbStations();
  const [activeTab, setActiveTab] = useState<TabKey>('overall');
  const [windowOffset, setWindowOffset] = useState(0);

  // Compute 14-day windows from station_series dates (newest first)
  // Use the "All Stations" series for date boundaries
  const windows = useMemo(() => {
    if (!data) return [];
    const allSeries = data.station_series['All Stations'];
    if (!allSeries || allSeries.length === 0) return [];
    const dates = allSeries.map(d => d.date.slice(0, 10)).sort();
    if (dates.length === 0) return [];

    const result: { startDate: string; endDate: string; dateSet: Set<string> }[] = [];
    let end = dates.length;
    while (end > 0) {
      const start = Math.max(0, end - WINDOW_SIZE);
      const slice = dates.slice(start, end);
      if (slice.length >= MIN_TRAILING_DAYS) {
        result.push({
          startDate: slice[0],
          endDate: slice[slice.length - 1],
          dateSet: new Set(slice),
        });
      }
      end = start;
    }
    return result;
  }, [data]);

  const safeOffset = Math.min(windowOffset, Math.max(0, windows.length - 1));
  const activeWindow = windows[safeOffset];
  const canGoPrev = safeOffset < windows.length - 1;
  const canGoNext = safeOffset > 0;

  const goPrev = useCallback(() => {
    if (canGoPrev) setWindowOffset(o => o + 1);
  }, [canGoPrev]);

  const goNext = useCallback(() => {
    if (canGoNext) setWindowOffset(o => o - 1);
  }, [canGoNext]);

  // Compute windowed station rankings for Overall tab
  const windowedStations = useMemo(() => {
    if (!data || !activeWindow) return [];
    // Build date set that handles KTMB's "YYYY-MM-DD HH:mm:ss" format
    const windowDatePrefixes = new Set(Array.from(activeWindow.dateSet));

    return data.top_overall
      .map(station => {
        const series = data.station_series[station.name];
        if (!series) return { ...station, passengers: 0 };
        const total = series
          .filter(d => windowDatePrefixes.has(d.date.slice(0, 10)))
          .reduce((sum, d) => sum + d.passengers, 0);
        return { ...station, passengers: total };
      })
      .sort((a, b) => b.passengers - a.passengers);
  }, [data, activeWindow]);

  // Display stations: windowed for Overall, static for service tabs
  const displayStations = useMemo(() => {
    if (!data) return [];
    if (activeTab === 'overall') {
      // Filter out "All Stations" aggregate from display
      return windowedStations.filter(s => s.name !== 'All Stations');
    }
    return data.top_by_service[activeTab] ?? [];
  }, [data, activeTab, windowedStations]);

  // Stats: windowed for Overall, service-specific for service tabs
  const stats = useMemo(() => {
    if (!data) return null;

    if (activeTab === 'overall') {
      // Use windowed data (excluding "All Stations" for #1 station)
      const realStations = windowedStations.filter(s => s.name !== 'All Stations');
      if (realStations.length === 0) return null;
      const topStation = realStations[0];
      const totalPassengers = realStations.reduce((sum, s) => sum + s.passengers, 0);
      const avgPassengers = Math.round(totalPassengers / realStations.length);
      return { topStation, totalPassengers, avgPassengers, services: Object.keys(data.top_by_service).length };
    } else {
      // Use static service data
      const serviceData = data.top_by_service[activeTab];
      if (!serviceData || serviceData.length === 0) return null;
      const topStation = serviceData[0];
      const totalPassengers = serviceData.reduce((sum, s) => sum + s.passengers, 0);
      const avgPassengers = Math.round(totalPassengers / serviceData.length);
      return { topStation, totalPassengers, avgPassengers, services: Object.keys(data.top_by_service).length };
    }
  }, [data, activeTab, windowedStations]);

  const windowLabel = useMemo(() => {
    if (activeTab !== 'overall' || !activeWindow) return data?.data_as_of ?? '';
    const fmt = (d: string) => format(parseISO(d), 'dd MMM');
    return `${fmt(activeWindow.startDate)} – ${fmt(activeWindow.endDate)}`;
  }, [activeWindow, data, activeTab]);

  if (loading) return <Skeleton />;

  if (error || !data || !stats) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6">
        <div className="text-center py-8">
          <p className="text-[var(--text-faint)] text-sm">No KTMB station data available</p>
          {error && <p className="text-red-400/60 text-[10px] mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'ets', label: 'ETS' },
    { key: 'intercity', label: 'Intercity' },
    { key: 'komuter', label: 'Komuter' },
    { key: 'komuter_utara', label: 'K. Utara' },
    { key: 'tebrau', label: 'Tebrau' },
  ];

  const isWindowed = activeTab === 'overall';

  return (
    <div
      data-chart
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Busiest Stations — KTMB
          </h3>
          <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
            Top stations by {isWindowed ? '14-day total' : 'daily count'} · {windowLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pagination — only visible on Overall tab with multiple windows */}
          {isWindowed && windows.length > 1 && (
            <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
              <button
                onClick={goPrev}
                disabled={!canGoPrev}
                className="flex items-center justify-center w-8 h-8 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-active)] active:bg-[var(--border-subtle)]"
                aria-label="Previous window"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
              <div className="flex items-center px-2.5 min-w-[120px] justify-center">
                <span className="text-[10px] font-medium text-[var(--text-secondary)] tabular-nums">
                  {safeOffset === 0 ? 'Latest' : `${windows.length - safeOffset} / ${windows.length}`}
                </span>
              </div>
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className="flex items-center justify-center w-8 h-8 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-active)] active:bg-[var(--border-subtle)]"
                aria-label="Next window"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
            </div>
          )}
          {/* Status badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-400/10 border border-teal-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-[9px] text-teal-400 font-medium">
              batch-updated · T-1 to T-3 lag
            </span>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
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
          <div className="text-sm font-semibold text-teal-400 tracking-tight mt-0.5 truncate">
            {stats.topStation?.name ?? '—'}
          </div>
          <span className="text-[10px] text-[var(--text-faint)] tabular-nums">
            {stats.topStation?.passengers.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-faint)] p-3">
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest font-medium">
            Services
          </span>
          <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums tracking-tight mt-0.5">
            {Object.keys(data.top_by_service).length}
          </div>
        </div>
      </div>

      {/* Service tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const style = tab.key === 'overall'
            ? { bg: 'bg-teal-400/10', text: 'text-teal-400' }
            : (SERVICE_COLORS[tab.key] ?? { bg: 'bg-gray-400/10', text: 'text-gray-400' });
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? `${style.bg} ${style.text} border border-current/20`
                  : 'text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Station ranking list */}
      <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
        {displayStations.map((station, i) => {
          const maxPassengers = displayStations[0]?.passengers ?? 1;
          const pct = Math.round((station.passengers / maxPassengers) * 100);
          const barColor = activeTab === 'overall'
            ? 'bg-teal-400'
            : (SERVICE_COLORS[activeTab]?.bar ?? 'bg-gray-400');

          return (
            <div
              key={`${station.name}-${i}`}
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
                <span className="text-[11px] font-medium text-[var(--text-primary)] truncate block">
                  {station.name}
                </span>
                <div className="mt-1 h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
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
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--text-faint)]">
            {activeTab === 'overall' ? 'All services combined' : SERVICE_LABELS[activeTab] ?? activeTab}
          </span>
          {isWindowed && windows.length > 1 && (
            <span className="text-[9px] text-[var(--text-faint)]">
              {windows.length} windows (14-day each)
            </span>
          )}
        </div>
        <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
          Source: data.gov.my · parquet
        </span>
      </div>
    </div>
  );
}
