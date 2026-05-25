'use client';

import { useEffect, useState, useCallback } from 'react';

export interface RidershipDay {
  date: string;
  mrtKajang: number;
  mrtPutrajaya: number;
  lrtKelanaJaya: number;
  lrtAmpang: number;
  monorail: number;
  komuter: number;
  busKl: number;
  total: number;
}

/**
 * Call the internal MCP endpoint to fetch ridership data.
 * Falls back to direct /api/ridership if MCP fails.
 */
async function fetchViaMCP(
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  const res = await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'tools/call',
      params: {
        name: 'query_ridership',
        arguments: { start_date: startDate, end_date: endDate },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`MCP error: ${res.status}`);
  }

  const result = await res.json();
  const parsed = JSON.parse(result.content[0].text);
  return parsed.data;
}

async function fetchViaDirectAPI(
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `/api/ridership?start_date=${startDate}&end_date=${endDate}`
  );

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export function useRidership() {
  const [data, setData] = useState<RidershipDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0];

    try {
      // Try MCP first, fallback to direct API
      let rows: Record<string, unknown>[];
      try {
        rows = await fetchViaMCP(start, end);
      } catch {
        rows = await fetchViaDirectAPI(start, end);
      }

      const parsed = rows
        .filter((r) => r.date != null)
        .map((r) => {
          const mrtKajang = Number(r['rail_mrt_kajang'] ?? 0);
          const mrtPutrajaya = Number(r['rail_mrt_pjy'] ?? 0);
          const lrtKelanaJaya = Number(r['rail_lrt_kj'] ?? 0);
          const lrtAmpang = Number(r['rail_lrt_ampang'] ?? 0);
          const monorail = Number(r['rail_monorail'] ?? 0);
          const komuter = Number(r['rail_komuter'] ?? 0);
          const busKl = Number(r['bus_rkl'] ?? 0);
          const total =
            mrtKajang +
            mrtPutrajaya +
            lrtKelanaJaya +
            lrtAmpang +
            monorail +
            komuter;

          return {
            date: r.date as string,
            mrtKajang,
            mrtPutrajaya,
            lrtKelanaJaya,
            lrtAmpang,
            monorail,
            komuter,
            busKl,
            total,
          };
        })
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

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
