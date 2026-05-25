'use client';

import { useEffect, useState, useCallback } from 'react';

export interface KtmbStationRanking {
  name: string;
  passengers: number;
}

export interface KtmbStationsData {
  data_as_of: string;
  total_stations: number;
  top_overall: KtmbStationRanking[];
  top_by_service: Record<string, KtmbStationRanking[]>;
  station_series: Record<string, { date: string; passengers: number }[]>;
}

/**
 * Fetch KTMB station-level ridership data.
 * Includes top 20 stations overall, top 10 per service,
 * and 30-day daily series for each top station.
 */
export function useKtmbStations() {
  const [data, setData] = useState<KtmbStationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/ktmb-stations.json');
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const parsed: KtmbStationsData = await res.json();
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
