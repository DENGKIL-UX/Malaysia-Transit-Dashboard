'use client';

import { useEffect, useState, useCallback } from 'react';

export interface KtmbDailyRow {
  date: string;
  service: string;
  ridership: number;
}

export interface KtmbDay {
  date: string;
  ets: number;
  intercity: number;
  komuter: number;
  komuterUtara: number;
  shuttleTebrau: number;
  total: number;
  dayOfWeek: number; // 0=Mon ... 6=Sun
  dayName: string;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Static-file shape (public/ktmb-daily.json, refreshed by GitHub Actions). */
interface StaticKtmbRow {
  date: string; // "YYYY-MM-DD HH:mm:ss"
  ets: number;
  intercity: number;
  komuter: number;
  komuter_utara: number;
  tebrau: number;
  total: number;
}

function toKtmbDay(date: string, services: Record<string, number>): KtmbDay {
  // Static files carry "YYYY-MM-DD HH:mm:ss" — normalize to date-only.
  const normalized = date.split(' ')[0];
  const dt = new Date(normalized + 'T00:00:00');
  // getDay(): 0=Sun, 1=Mon... shift so Mon=0
  let dow = dt.getDay() - 1;
  if (dow < 0) dow = 6;

  const ets = services.ets;
  const intercity = services.intercity;
  const komuter = services.komuter;
  const komuterUtara = services.komuter_utara;
  const shuttleTebrau = services.shuttle_tebrau;
  const total = ets + intercity + komuter + komuterUtara + shuttleTebrau;

  return {
    date: normalized,
    ets,
    intercity,
    komuter,
    komuterUtara,
    shuttleTebrau,
    total,
    dayOfWeek: dow,
    dayName: DAY_NAMES[dow],
  };
}

/**
 * Fetch KTMB daily ridership data from the internal API proxy.
 * Returns data pivoted by date with per-service columns.
 *
 * Falls back to the static /ktmb-daily.json (GitHub Actions daily refresh)
 * when the live API is unreachable — same resilience pattern as
 * usePrasaranaDaily. `source` tells consumers which tier served the data.
 */
export function useKtmbDaily(weeks: number = 4) {
  const [data, setData] = useState<KtmbDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'live' | 'static' | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - weeks * 7 * 864e5)
      .toISOString()
      .split('T')[0];

    try {
      const res = await fetch(
        `/api/ridership-ktmb-daily?start_date=${start}&end_date=${end}`
      );

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const rows: KtmbDailyRow[] = await res.json();

      // Pivot: group by date, sum per service
      const dateMap = new Map<string, Record<string, number>>();

      for (const row of rows) {
        if (!dateMap.has(row.date)) {
          dateMap.set(row.date, {
            ets: 0,
            intercity: 0,
            komuter: 0,
            komuter_utara: 0,
            shuttle_tebrau: 0,
          });
        }
        const entry = dateMap.get(row.date)!;
        const svc = row.service as keyof typeof entry;
        if (svc in entry) {
          entry[svc] += Number(row.ridership ?? 0);
        }
      }

      const parsed = Array.from(dateMap.entries())
        .map(([date, services]) => toKtmbDay(date, services))
        .sort((a, b) => a.date.localeCompare(b.date));

      if (parsed.length === 0) {
        throw new Error('Empty response');
      }

      setData(parsed);
      setSource('live');
    } catch (err) {
      // Fallback: static file refreshed daily via GitHub Actions
      try {
        const staticRes = await fetch('/ktmb-daily.json');
        if (!staticRes.ok) {
          throw new Error(`Static fallback failed: ${staticRes.status}`);
        }
        const rows: StaticKtmbRow[] = await staticRes.json();
        const parsed = rows
          .map((r) =>
            toKtmbDay(r.date, {
              ets: r.ets,
              intercity: r.intercity,
              komuter: r.komuter,
              komuter_utara: r.komuter_utara,
              shuttle_tebrau: r.tebrau,
            })
          )
          .sort((a, b) => a.date.localeCompare(b.date));
        setData(parsed);
        setSource('static');
        setError(null);
      } catch (fallbackErr) {
        setError(
          fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error'
        );
        setSource(null);
      }
    } finally {
      setLoading(false);
    }
  }, [weeks]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, source };
}
