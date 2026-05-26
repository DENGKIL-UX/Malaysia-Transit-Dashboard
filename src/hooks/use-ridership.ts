'use client';

import { useEffect, useState, useCallback } from 'react';
import { parseRidershipRow, type ParsedRidershipRow } from '@/lib/parse-ridership';

// Re-export for consumer convenience
export type RidershipDay = ParsedRidershipRow;

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

// parseRidershipRow is now imported from @/lib/parse-ridership

/**
 * Fetch ridership data. `days` controls how many days of history to load
 * (default 90 for multiple 30-day pagination windows).
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
      // Try MCP first, fallback to direct API
      let rows: Record<string, unknown>[];
      try {
        rows = await fetchViaMCP(start, end);
      } catch {
        rows = await fetchViaDirectAPI(start, end);
      }

      const parsed = rows
        .filter((r) => r.date != null)
        .map(parseRidershipRow)
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      setData(parsed);
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
