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

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes — aligned with notifications cycle

// Module-level singleton: only one polling interval runs across all hook instances
let pollingIntervalId: ReturnType<typeof setInterval> | null = null;
let isPollingActive = false;
let inFlight = false; // prevents concurrent fetches

// Dev-only: prevent HMR from spawning duplicate intervals
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.addEventListener('beforeunload', () => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
      isPollingActive = false;
    }
  });
}

/**
 * Centralized metadata hook — single source of truth for /api/metadata data.
 * Stores result in Zustand to eliminate duplicate fetches from multiple components.
 *
 * Polls every 5 minutes (singleton — only one interval across all instances).
 * Detects when freshest_date changes (new data available) and triggers cascade refresh.
 */
export function useDataMetadata() {
  const metadata = useAppStore((s) => s.metadata);
  const setMetadata = useAppStore((s) => s.setMetadata);
  const metadataLoading = useAppStore((s) => s.metadataLoading);
  const setMetadataLoading = useAppStore((s) => s.setMetadataLoading);
  const lastKnownFreshestDate = useAppStore((s) => s.lastKnownFreshestDate);
  const setLastKnownFreshestDate = useAppStore((s) => s.setLastKnownFreshestDate);
  const triggerDataRefresh = useAppStore((s) => s.triggerDataRefresh);

  const fetchMetadata = useCallback(async () => {
    // Prevent concurrent fetches
    if (inFlight) return;
    inFlight = true;

    setMetadataLoading(true);
    try {
      const res = await fetch('/api/metadata');
      if (!res.ok) return;
      const data: DataMetadata = await res.json();
      setMetadata(data);

      // Detect new data: if freshest_date changed from what we knew
      const newFreshest = data.freshest_date || null;
      if (lastKnownFreshestDate !== null && newFreshest !== null && newFreshest > lastKnownFreshestDate) {
        // New data detected! Trigger cascade refresh for ridership, analytics, etc.
        triggerDataRefresh();
        console.info(
          `[data-refresh] New data detected: ${lastKnownFreshestDate} → ${newFreshest} (${data.freshest_source})`
        );
      }
      setLastKnownFreshestDate(newFreshest);
    } catch {
      // Silently fail — metadata is non-critical
    } finally {
      setMetadataLoading(false);
      inFlight = false;
    }
  }, [setMetadata, setMetadataLoading, lastKnownFreshestDate, setLastKnownFreshestDate, triggerDataRefresh]);

  useEffect(() => {
    // Initial fetch
    fetchMetadata();

    // Start singleton polling (only one interval across all hook instances)
    if (!isPollingActive) {
      isPollingActive = true;
      pollingIntervalId = setInterval(() => {
        fetchMetadata();
      }, POLL_INTERVAL);
    }

    // Cleanup is a no-op — the singleton persists for the page lifetime
  }, [fetchMetadata]);

  return { metadata, loading: metadataLoading, refetch: fetchMetadata };
}
