'use client';

import { useEffect, useState, useCallback } from 'react';

export interface PrasaranaDay {
  date: string;
  brt: number;
  lrt_ampang: number;
  lrt_kj: number;
  monorail: number;
  mrt_pjy: number;
  total: number;
}

/**
 * Fetch Prasarana daily ridership.
 *
 * Previously fetched from static /prasarana-daily.json which only updated
 * on Cloudflare rebuilds (stale data problem).
 *
 * Now fetches from /api/comparison-data which merges:
 *   - Live headline API (audited, ~T-26 lag)
 *   - DOSM OD daily (from GitHub Actions, ~T-1 lag)
 *   - Live KTMB API (~T-1 lag)
 *
 * Falls back to static file if API fails.
 */
export function usePrasaranaDaily() {
  const [data, setData] = useState<PrasaranaDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try API route first (has live data)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5)
        .toISOString()
        .split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      const res = await fetch(
        `/api/comparison-data?start_date=${thirtyDaysAgo}&end_date=${today}`
      );

      if (res.ok) {
        const json = (await res.json()) as {
          data?: Array<{
            date: string;
            rail_lrt_ampang?: number | null;
            rail_mrt_kajang?: number | null;
            rail_lrt_kj?: number | null;
            rail_monorail?: number | null;
            rail_mrt_pjy?: number | null;
            bus_rkl?: number | null;
          }>;
        };

        if (json.data && json.data.length > 0) {
          const mapped: PrasaranaDay[] = json.data.map((r) => ({
            date: r.date,
            lrt_ampang: (r.rail_lrt_ampang ?? 0) + (r.rail_mrt_kajang ?? 0),
            lrt_kj: r.rail_lrt_kj ?? 0,
            mrt_pjy: r.rail_mrt_pjy ?? 0,
            monorail: r.rail_monorail ?? 0,
            brt: r.bus_rkl ?? 0,
            total:
              (r.rail_lrt_ampang ?? 0) +
              (r.rail_mrt_kajang ?? 0) +
              (r.rail_lrt_kj ?? 0) +
              (r.rail_mrt_pjy ?? 0) +
              (r.rail_monorail ?? 0) +
              (r.bus_rkl ?? 0),
          }));
          setData(mapped);
          return;
        }
      }

      // Fallback: static file
      const staticRes = await fetch('/prasarana-daily.json');
      if (!staticRes.ok) throw new Error(`Static fallback failed: ${staticRes.status}`);
      const parsed: PrasaranaDay[] = await staticRes.json();
      setData(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}