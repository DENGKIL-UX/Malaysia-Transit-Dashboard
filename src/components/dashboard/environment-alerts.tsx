'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  CloudLightning,
  Waves,
  Mountain,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
  Train,
} from 'lucide-react';
import { useEnvironmentAlerts } from '@/hooks/use-environment';
import type { WeatherWarning, EarthquakeEvent, EnvironmentAlerts } from '@/hooks/use-environment';
import { format, parseISO } from 'date-fns';

// ─── Lazy wrapper ──────────────────────────────────────────────────

function LazyAlertsInner() {
  const { data, loading, error } = useEnvironmentAlerts();
  const [expanded, setExpanded] = useState(false);
  const [manuallyDismissed, setManuallyDismissed] = useState(false);
  return <AlertsContent data={data} loading={loading} error={error} expanded={expanded} setExpanded={setExpanded} manuallyDismissed={manuallyDismissed} setManuallyDismissed={setManuallyDismissed} />;
}

export function EnvironmentAlertsPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { rootMargin: '100px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!visible) {
    return (
      <div ref={ref} className="mb-5 animate-pulse">
        <div className="h-10 rounded-xl bg-[var(--surface-card)] border border-[var(--border-faint)]" />
      </div>
    );
  }

  return (
    <div ref={ref}>
      <LazyAlertsInner />
    </div>
  );
}

// ─── Icon helpers ────────────────────────────────────────────────────

function AlertIcon({ type, severity }: { type: string; severity: string }) {
  if (type === 'earthquake') return <Mountain className="w-3.5 h-3.5" />;
  if (type === 'flood') return <Waves className="w-3.5 h-3.5" />;
  if (severity === 'danger') return <Zap className="w-3.5 h-3.5" />;
  return <CloudLightning className="w-3.5 h-3.5" />;
}

function severityColor(severity: string, type: string) {
  if (type === 'earthquake') return 'text-amber-400';
  if (severity === 'danger') return 'text-red-400';
  return 'text-amber-400';
}

function severityBg(severity: string, type: string) {
  if (type === 'earthquake') return 'bg-amber-500/8 border-amber-500/15';
  if (severity === 'danger') return 'bg-red-500/8 border-red-500/15';
  return 'bg-amber-500/8 border-amber-500/15';
}

function severityLabel(type: string, severity: string) {
  if (type === 'earthquake') return 'Seismic';
  if (type === 'flood') return 'Flood Advisory';
  return severity === 'danger' ? 'Severe Weather' : 'Weather Advisory';
}

// ─── Single alert row ────────────────────────────────────────────────

function WeatherAlertRow({ alert }: { alert: WeatherWarning }) {
  const validToStr = alert.validTo
    ? format(parseISO(alert.validTo), 'd MMM, HH:mm')
    : '';
  return (
    <div className={`rounded-lg border p-3 ${severityBg(alert.severity, alert.type)}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 shrink-0 ${severityColor(alert.severity, alert.type)}`}>
          <AlertIcon type={alert.type} severity={alert.severity} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${severityColor(alert.severity, alert.type)}`}>
              {severityLabel(alert.type, alert.severity)}
            </span>
            {alert.isTransitRelevant && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#85AB8B]/10 text-[#85AB8B] border border-[#85AB8B]/20">
                <Train className="w-2.5 h-2.5" />
                Transit-relevant
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-medium">
            {alert.titleEn}
          </p>
          {alert.textEn && (
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mt-1">
              {alert.textEn.length > 200 ? alert.textEn.slice(0, 200) + '...' : alert.textEn}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-[9px] text-[var(--text-faint)]">
            {validToStr && <span>Until {validToStr}</span>}
            {alert.transitAreas.length > 0 && (
              <span className="text-[#85AB8B]/70">
                Areas: {alert.transitAreas.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EarthquakeRow({ eq }: { eq: EarthquakeEvent }) {
  return (
    <div className={`rounded-lg border p-3 ${severityBg('', 'earthquake')}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-amber-400">
          <AlertIcon type="earthquake" severity="" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">
              M{eq.magnitude.toFixed(1)} {eq.magType}
            </span>
            <span className="text-[9px] text-[var(--text-faint)]">
              Depth: {eq.depth.toFixed(0)}km
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {eq.location}
          </p>
          <div className="flex items-center gap-3 mt-1 text-[9px] text-[var(--text-faint)]">
            <span>{eq.distanceFromMY}</span>
            <span>{format(parseISO(eq.localDatetime), 'd MMM yyyy, HH:mm')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

function AlertsContent({
  data, loading, error, expanded, setExpanded, manuallyDismissed, setManuallyDismissed,
}: {
  data: EnvironmentAlerts | null;
  loading: boolean;
  error: string | null;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  manuallyDismissed: boolean;
  setManuallyDismissed: (v: boolean) => void;
}) {

  const transitRelevantCount = useMemo(() => {
    if (!data) return 0;
    const weatherTransit = data.weatherWarnings.filter((w) => w.isTransitRelevant).length;
    return weatherTransit + (data.floodHasTransitRelevant ? 1 : 0);
  }, [data]);

  const totalCount = useMemo(() => {
    if (!data) return 0;
    return (
      data.weatherWarnings.length +
      data.floodWarningCount +
      data.recentEarthquakes.filter((e) => e.isNearMY && e.magnitude >= 5.0).length
    );
  }, [data]);

  const nearEarthquakes = useMemo(() => {
    if (!data) return [];
    return data.recentEarthquakes.filter((e) => e.isNearMY && e.magnitude >= 5.0);
  }, [data]);

  // Don't render if no alerts
  if (!loading && !error && data && data.activeAlertCount === 0 && nearEarthquakes.length === 0) {
    return null;
  }

  if (manuallyDismissed) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="mb-5 animate-pulse">
        <div className="h-10 rounded-xl bg-[var(--surface-card)] border border-[var(--border-faint)]" />
      </div>
    );
  }

  if (error || !data) return null;

  // Banner mode: compact when collapsed
  if (!expanded) {
    return (
      <div className="mb-5 animate-fade-in-up">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
            </span>

            <div className="flex-1 min-w-0">
              <span className="text-[11px] sm:text-xs font-medium text-amber-300">
                {data.hasTransitRelevantAlerts
                  ? `${transitRelevantCount} transit-relevant alert${transitRelevantCount > 1 ? 's' : ''}`
                  : `${totalCount} environmental alert${totalCount > 1 ? 's' : ''}`}
              </span>
              <span className="text-[10px] text-[var(--text-faint)] ml-2 hidden sm:inline">
                Weather · Flood · Seismic — via MET Malaysia & JPS
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1 text-[10px] text-amber-400/80 hover:text-amber-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-amber-400/10"
              >
                <span className="hidden sm:inline">View details</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setManuallyDismissed(true)}
                className="text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors p-1.5 rounded-lg hover:bg-[var(--surface-card)]"
                aria-label="Dismiss alerts"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expanded mode
  return (
    <div className="mb-5 animate-fade-in-up">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-500/10">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Environment Alerts
            </h3>
            <p className="text-[9px] text-[var(--text-faint)]">
              {data.weatherWarnings.length} weather
              {data.floodWarningCount > 0 ? ` · ${data.floodWarningCount} flood` : ''}
              {nearEarthquakes.length > 0 ? ` · ${nearEarthquakes.length} seismic` : ''}
              <span className="mx-1.5">·</span>
              Live via MET Malaysia & JPS (data.gov.my)
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1 text-[10px] text-amber-400/80 hover:text-amber-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-amber-400/10"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setManuallyDismissed(true)}
              className="text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors p-1.5 rounded-lg hover:bg-[var(--surface-card)]"
              aria-label="Dismiss alerts"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Alert list — scrollable */}
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          <div className="p-3 space-y-2">
            {/* Weather warnings */}
            {data.weatherWarnings.map((w) => (
              <WeatherAlertRow key={w.id} alert={w} />
            ))}

            {/* Flood summary (count only — detail requires large upstream payload) */}
            {data.floodWarningCount > 0 && (
              <div className="rounded-lg border border-orange-500/15 bg-orange-500/8 p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-orange-400">
                    <Waves className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-400">
                        Flood Monitoring (JPS)
                      </span>
                      {data.floodHasTransitRelevant && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#85AB8B]/10 text-[#85AB8B] border border-[#85AB8B]/20">
                          <Train className="w-2.5 h-2.5" />
                          Transit area
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {data.floodWarningCount} station{data.floodWarningCount > 1 ? 's' : ''} with elevated water levels
                    </p>
                    <a
                      href="https://api.data.gov.my/flood-warning/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-[var(--text-faint)] hover:text-[#85AB8B] transition-colors mt-1 inline-block"
                    >
                      View details on data.gov.my →
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Nearby earthquakes */}
            {nearEarthquakes.length > 0 && (
              <>
                {(data.weatherWarnings.length > 0 || data.floodWarningCount > 0) && (
                  <div className="flex items-center gap-2 pt-1">
                    <Mountain className="w-3 h-3 text-[var(--text-faint)]" />
                    <span className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
                      Recent Seismic Activity
                    </span>
                  </div>
                )}
                {nearEarthquakes.map((eq) => (
                  <EarthquakeRow key={eq.id} eq={eq} />
                ))}
              </>
            )}

            {/* No transit-relevant note */}
            {data.activeAlertCount > 0 && !data.hasTransitRelevantAlerts && (
              <div className="flex items-center gap-2 py-2 text-[10px] text-[var(--text-faint)]">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>
                  Active alerts exist but none directly affect Klang Valley transit corridors.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}