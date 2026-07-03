'use client';

import { useEffect, useState, useCallback } from 'react';
import { parseRidershipRow, type ParsedRidershipRow } from '@/lib/parse-ridership';

// Re-export for consumer convenience
export type RidershipDay = ParsedRidershipRow;

// In-memory cache to avoid redundant fetches within the same session
let cachedPayload: { data: ParsedRidershipRow[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch ridership data. `days` controls how many days of history to load
 * (default 90 for multiple 30-day pagination windows).
 *
 * ponytail: Uses /api/comparison-data which merges headline + live headline +
 * Prasarana daily + live KTMB. The old /api/ridership route only read stale
 * static files — switching eliminates the 40-day data gap.
 */
export function useRidership(days: number = 90) {
  const [data, setData] = useState<RidershipDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 864e5).toISOString().split('T')[0];

    try {
      // Check in-memory cache
      if (
        cachedPayload &&
        Date.now() - cachedPayload.timestamp < CACHE_TTL_MS &&
        cachedPayload.data.length > 0
      ) {
        const filtered = cachedPayload.data.filter(
          (r) => r.date >= start && r.date <= end
        );
        setData(filtered);
        setLoading(false);
        return;
      }

      // Use comparison-data API — has live extensions for all data sources
      const url = `/api/comparison-data?start_date=${start}&end_date=${end}&nocache=1`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const json = await res.json();
      const rows: Record<string, unknown>[] = json.data ?? [];

      const parsed = rows
        .filter((r) => r.date != null)
        .map(parseRidershipRow)
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      // Cache the parsed result (not filtered — cache serves multiple date ranges)
      cachedPayload = { data: parsed, timestamp: Date.now() };

      // Also filter for the requesting caller (previously returned full unfiltered dataset on cache miss)
      const filtered = parsed.filter(
        (r) => r.date >= start && r.date <= end
      );
      setData(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}