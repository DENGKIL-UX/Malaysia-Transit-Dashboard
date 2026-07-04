'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types (mirror API response) ─────────────────────────────────────

interface WeatherWarning {
  type: 'weather';
  id: string;
  severity: 'warning' | 'danger';
  titleEn: string;
  textEn: string;
  validFrom: string;
  validTo: string;
  issuedAt: string;
  isTransitRelevant: boolean;
  transitAreas: string[];
}

interface FloodWarning {
  type: 'flood';
  id: string;
  severity: 'normal' | 'alert' | 'warning' | 'danger';
  stationName: string;
  stationCode: string;
  state: string;
  district: string;
  waterLevelCurrent: number;
  waterLevelNormal: number;
  waterLevelAlert: number;
  waterLevelWarning: number;
  waterLevelDanger: number;
  trend: string;
  updatedAt: string;
  isTransitRelevant: boolean;
  transitLines: string[];
}

interface EarthquakeEvent {
  type: 'earthquake';
  id: string;
  utcDatetime: string;
  localDatetime: string;
  magnitude: number;
  magType: string;
  depth: number;
  location: string;
  distanceFromMY: string;
  isNearMY: boolean;
}

interface EnvironmentAlerts {
  fetchedAt: string;
  weatherWarnings: WeatherWarning[];
  floodWarningCount: number;
  floodHasTransitRelevant: boolean;
  recentEarthquakes: EarthquakeEvent[];
  activeAlertCount: number;
  hasTransitRelevantAlerts: boolean;
}

interface ForecastDay {
  date: string;
  location: string;
  locationId: string;
  morningForecast: string;
  afternoonForecast: string;
  nightForecast: string;
  summaryForecast: string;
  summaryWhen: string;
  minTemp: number;
  maxTemp: number;
  hasRain: boolean;
  hasThunderstorm: boolean;
  hasHeavyRain: boolean;
}

interface WeatherForecast {
  fetchedAt: string;
  kualaLumpur: ForecastDay[];
  selangor: ForecastDay[];
  todayKL: ForecastDay | null;
  todaySelangor: ForecastDay | null;
}

// ─── Hooks ───────────────────────────────────────────────────────────

export function useEnvironmentAlerts() {
  const [data, setData] = useState<EnvironmentAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/environment-alerts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Stagger: wait 3s after mount to avoid competing with page-level data fetches
    const timer = setTimeout(() => {
      fetchAlerts();
    }, 3000);
    // Auto-refresh every 5 minutes after initial load
    intervalRef.current = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAlerts]);

  return { data, loading, error, refetch: fetchAlerts };
}

export function useWeatherForecast() {
  const [data, setData] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchForecast = useCallback(async () => {
    try {
      const res = await fetch('/api/weather-forecast');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Stagger: wait 5s after mount to avoid competing with page-level data fetches
    const timer = setTimeout(() => {
      fetchForecast();
    }, 5000);
    // Auto-refresh every 10 minutes
    intervalRef.current = setInterval(fetchForecast, 10 * 60 * 1000);
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchForecast]);

  return { data, loading, error, refetch: fetchForecast };
}

// Re-export types for component use
export type { WeatherWarning, FloodWarning, EarthquakeEvent, ForecastDay, EnvironmentAlerts, WeatherForecast };