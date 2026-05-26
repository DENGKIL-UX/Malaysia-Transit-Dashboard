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
 * Data is sourced from the Prasarana explorer parquet (processed server-side)
 * and includes BRT Sunway + 5 Rapid Rail lines.
 * ~57 days of daily data with T-1 to T-3 lag.
 */
export function usePrasaranaDaily() {
  const [data, setData] = useState<PrasaranaDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/prasarana-daily.json');
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const parsed: PrasaranaDay[] = await res.json();
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
