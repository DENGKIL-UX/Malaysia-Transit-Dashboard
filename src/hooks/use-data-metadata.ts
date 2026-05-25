'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';

export interface DataMetadata {
  headline: {
    data_as_of: string;
    latest_date: string;
    next_update_approx: string;
    lag_days: number;
  };
  prasarana: {
    data_as_of: string;
    last_updated: string;
    next_update: string;
    source: string;
  };
  ktmb: {
    latest_date: string;
    lag_days: number;
  };
  prasarana_od: {
    latest_date: string;
    lag_days: number;
  };
  freshest_date: string;
  freshest_source: string;
}

/**
 * Centralized metadata hook — single source of truth for /api/metadata data.
 * Stores result in Zustand to eliminate duplicate fetches from multiple components.
 * Components that previously fetched /api/metadata independently:
 *   - page.tsx (hero badge, about section)
 *   - data-status-bar.tsx (3-source status)
 *   - day-type-analytics.tsx (lag label)
 */
export function useDataMetadata() {
  const metadata = useAppStore((s) => s.metadata);
  const setMetadata = useAppStore((s) => s.setMetadata);
  const metadataLoading = useAppStore((s) => s.metadataLoading);
  const setMetadataLoading = useAppStore((s) => s.setMetadataLoading);

  const fetchMetadata = useCallback(async () => {
    // Skip if already loaded
    if (metadata) return;

    setMetadataLoading(true);
    try {
      const res = await fetch('/api/metadata');
      if (!res.ok) return;
      const data: DataMetadata = await res.json();
      setMetadata(data);
    } catch {
      // Silently fail — metadata is non-critical
    } finally {
      setMetadataLoading(false);
    }
  }, [metadata, setMetadata, setMetadataLoading]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return { metadata, loading: metadataLoading, refetch: fetchMetadata };
}
