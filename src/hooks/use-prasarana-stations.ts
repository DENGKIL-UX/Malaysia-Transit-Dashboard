'use client';

import { useEffect, useState, useCallback } from 'react';

export interface PrasaranaStation {
  code: string;
  name: string;
  line: string;
  passengers: number;
}

export interface PrasaranaStationsData {
  data_as_of: string;
  total_stations: number;
  stations_per_line: Record<string, number>;
  top_stations: PrasaranaStation[];
  station_series: Record<string, { date: string; passengers: number }[]>;
}

/**
 * Fetch Prasarana station-level ridership data.
 * Includes top 20 busiest stations, per-line station counts,
 * and 30-day daily series for each top station.
 */
export function usePrasaranaStations() {
  const [data, setData] = useState<PrasaranaStationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/prasarana-stations.json');
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const parsed: PrasaranaStationsData = await res.json();
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
