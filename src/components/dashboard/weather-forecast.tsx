'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { Cloud, CloudRain, CloudLightning, Sun, Droplets, Thermometer } from 'lucide-react';
import { useWeatherForecast } from '@/hooks/use-environment';
import type { ForecastDay } from '@/hooks/use-environment';
import { format, parseISO, isToday } from 'date-fns';

// ─── Lazy wrapper: only fetches when visible ────────────────────────

function LazyWeatherInner() {
  const { data, loading, error } = useWeatherForecast();
  return <WeatherForecastContent data={data} loading={loading} error={error} />;
}

export function WeatherForecastWidget() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Always render the skeleton structure so layout doesn't shift
  return (
    <div ref={ref}>
      {visible ? (
        <LazyWeatherInner />
      ) : (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center animate-pulse" />
            <div className="space-y-1">
              <div className="h-3.5 w-28 bg-[var(--skeleton-bg)] rounded animate-pulse" />
              <div className="h-2.5 w-48 bg-[var(--skeleton-bg)] rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-[var(--skeleton-bg)] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Weather icon ────────────────────────────────────────────────────

function WeatherIcon({ day, size = 'sm' }: { day: ForecastDay; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  if (day.hasThunderstorm) return <CloudLightning className={`${cls} text-amber-400`} />;
  if (day.hasHeavyRain) return <CloudRain className={`${cls} text-sky-400`} />;
  if (day.hasRain) return <CloudRain className={`${cls} text-sky-300`} />;
  return <Sun className={`${cls} text-amber-300`} />;
}

// ─── Single day cell ─────────────────────────────────────────────────

function DayCell({
  day,
  showLocation = false,
  compact = false,
}: {
  day: ForecastDay;
  showLocation?: boolean;
  compact?: boolean;
}) {
  const dayLabel = isToday(parseISO(day.date))
    ? 'Today'
    : format(parseISO(day.date), 'EEE');

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg hover:bg-[var(--surface-card)] transition-colors min-w-[60px]">
        <span className={`text-[10px] font-medium ${isToday(parseISO(day.date)) ? 'text-[#85AB8B]' : 'text-[var(--text-muted)]'}`}>
          {dayLabel}
        </span>
        <WeatherIcon day={day} size="sm" />
        <span className="text-[11px] font-semibold tabular-nums text-[var(--text-secondary)]">
          {day.maxTemp}°
        </span>
        <span className="text-[9px] tabular-nums text-[var(--text-faint)]">
          {day.minTemp}°
        </span>
        {day.hasRain && (
          <Droplets className="w-2.5 h-2.5 text-sky-300" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-card)] transition-colors group">
      <span className={`text-[11px] font-medium w-12 shrink-0 ${isToday(parseISO(day.date)) ? 'text-[#85AB8B]' : 'text-[var(--text-muted)]'}`}>
        {dayLabel}
      </span>
      <WeatherIcon day={day} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[var(--text-secondary)] leading-snug truncate">
          {day.summaryForecast}
        </p>
        {day.summaryWhen && day.summaryWhen !== '' && (
          <p className="text-[9px] text-[var(--text-faint)]">{day.summaryWhen}</p>
        )}
        {showLocation && (
          <p className="text-[9px] text-[var(--text-ghost)]">{day.location}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-0.5">
          <Thermometer className="w-3 h-3 text-orange-400/60" />
          <span className="text-[11px] font-semibold tabular-nums text-orange-300">
            {day.maxTemp}°
          </span>
        </div>
        <span className="text-[10px] tabular-nums text-[var(--text-faint)]">
          {day.minTemp}°
        </span>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────

function WeatherForecastContent({ data, loading, error }: { data: import('@/hooks/use-environment').WeatherForecast | null; loading: boolean; error: string | null }) {

  // Determine rain impact level for today
  const todayRainStatus = useMemo(() => {
    if (!data?.todayKL && !data?.todaySelangor) return null;
    const kl = data?.todayKL;
    const sel = data?.todaySelangor;

    const hasThunder = kl?.hasThunderstorm || sel?.hasThunderstorm;
    const hasHeavy = kl?.hasHeavyRain || sel?.hasHeavyRain;
    const hasRain = kl?.hasRain || sel?.hasRain;

    if (hasThunder) return { label: 'Thunderstorm expected', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: '⛈' };
    if (hasHeavy) return { label: 'Heavy rain expected', color: 'text-sky-400', bg: 'bg-sky-400/10', icon: '🌧' };
    if (hasRain) return { label: 'Rain expected', color: 'text-sky-300', bg: 'bg-sky-300/10', icon: '🌦' };
    return { label: 'No rain', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '☀' };
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-pulse">
        <div className="h-4 w-40 bg-[var(--skeleton-bg)] rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-[var(--skeleton-bg)] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  // Use KL state-level as primary, Selangor as secondary
  const primaryForecast = data.kualaLumpur.length > 0
    ? data.kualaLumpur
    : data.selangor;
  const secondaryLabel = data.kualaLumpur.length > 0 ? 'Selangor' : null;
  const secondaryForecast = secondaryLabel ? data.selangor : [];

  if (primaryForecast.length === 0 && secondaryForecast.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Weather Forecast
              </h3>
              <p className="text-[10px] text-[var(--text-faint)]">
                KL & Selangor · MET Malaysia · 7-day
              </p>
            </div>
          </div>
          {/* Today's rain badge */}
          {todayRainStatus && (
            <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${todayRainStatus.bg} ${todayRainStatus.color} border border-current/10`}>
              {todayRainStatus.icon} {todayRainStatus.label}
            </span>
          )}
        </div>
      </div>

      {/* KL Forecast (full rows) */}
      {primaryForecast.length > 0 && (
        <div className="px-3 sm:px-4 pb-2">
          <div className="flex items-center gap-2 px-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              Kuala Lumpur
            </span>
          </div>
          <div className="space-y-0.5">
            {primaryForecast.slice(0, 7).map((day) => (
              <DayCell key={day.date} day={day} />
            ))}
          </div>
        </div>
      )}

      {/* Selangor compact strip */}
      {secondaryForecast.length > 0 && (
        <div className="border-t border-[var(--border-faint)] px-3 sm:px-4 py-3">
          <div className="flex items-center gap-2 px-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              Selangor
            </span>
          </div>
          <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
            {secondaryForecast.slice(0, 7).map((day) => (
              <DayCell
                key={`${day.locationId}-${day.date}`}
                day={day}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 sm:px-6 py-3 border-t border-[var(--border-faint)]">
        <p className="text-[9px] text-[var(--text-ghost)] leading-relaxed">
          Weather can affect daily ridership. Heavy rain typically reduces rail ridership by 5–15% during peak hours.
          <span className="mx-1.5">·</span>
          Source: api.data.gov.my/weather/forecast (pasarapi.xyz)
        </p>
      </div>
    </div>
  );
}