'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';

export interface PipelineFreshness {
  latest_date: string;
  lag_days: number;
  expected_lag: number;
  lag_explained_by: string[];
  is_overdue: boolean;
  status: 'fresh' | 'expected' | 'delayed' | 'overdue' | 'unknown';
}

export interface HolidayContext {
  today: string;
  todayIsBlackout: boolean;
  nextWorkingDay: string;
  prevWorkingDay: string;
  upcomingHolidays: Array<{
    date: string;
    name: string;
    isMajor: boolean;
  }>;
}

export interface DataMetadata {
  headline: PipelineFreshness;
  prasarana: {
    data_as_of: string;
    last_updated: string;
    next_update: string;
    source: string;
  };
  ktmb: PipelineFreshness;
  prasarana_od: PipelineFreshness;
  freshest_date: string;
  freshest_source: string;
  holiday_context: HolidayContext | null;
  pipeline_insights: string[];
}

/**
 * Centralized metadata hook — single source of truth for /api/metadata data.
 * Stores result in Zustand to eliminate duplicate fetches from multiple components.
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
