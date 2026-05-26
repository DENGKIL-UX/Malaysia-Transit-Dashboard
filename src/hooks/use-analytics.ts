'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import type { DayClassification } from '@/app/api/holidays/route';
import { parseRidershipRow } from '@/lib/parse-ridership';

export interface EnrichedDay extends Omit<import('@/lib/parse-ridership').ParsedRidershipRow, never> {
  day_type: 'holiday' | 'friday' | 'weekend' | 'weekday';
  is_public_holiday: boolean;
  holiday_name?: string;
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  warnings: string[];
}

export interface Analytics {
  holiday_kajang_avg: number;
  weekday_kajang_avg: number;
  friday_kajang_avg: number;
  weekend_kajang_avg: number;
  holiday_putrajaya_avg: number;
  weekday_putrajaya_avg: number;
}

export interface HolidayMapEntry {
  type: 'holiday-confirmed' | 'holiday-estimated' | 'friday' | 'weekend';
  name?: string;
  confidence: DayClassification['confidence'];
  warnings: string[];
}

function classifyDay(
  dateStr: string,
  classMap: Record<string, DayClassification>
): {
  day_type: EnrichedDay['day_type'];
  is_public_holiday: boolean;
  holiday_name?: string;
  confidence: EnrichedDay['confidence'];
  warnings: string[];
} {
  const c = classMap[dateStr];
  const day = new Date(dateStr + 'T00:00:00').getDay();

  if (c) {
    return {
      day_type: c.day_type,
      is_public_holiday: c.is_public_holiday,
      holiday_name: c.holiday_name,
      confidence: c.confidence,
      warnings: c.warnings,
    };
  }

  // Fallback classification from day of week
  if (day === 0 || day === 6) {
    return { day_type: 'weekend', is_public_holiday: false, confidence: 'high', warnings: [] };
  }
  if (day === 5) {
    return { day_type: 'friday', is_public_holiday: false, confidence: 'unverified', warnings: [] };
  }
  return { day_type: 'weekday', is_public_holiday: false, confidence: 'unverified', warnings: [] };
}

export interface DataRangeInfo {
  headlineThrough: string | null;    // Last date with audited headline data
  prasaranaThrough: string | null;   // Last date with Prasarana data (from parquet)
  ktmbThrough: string | null;        // Last date with KTMB data
  totalDays: number;
  minDate: string | null;
  maxDate: string | null;
}

export function useAnalytics() {
  const [classifications, setClassifications] = useState<
    Record<string, DayClassification>
  >({});
  const [ridership, setRidership] = useState<EnrichedDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [holidaySource, setHolidaySource] = useState<string>('');
  const [holidayFallback, setHolidayFallback] = useState(false);
  const [dataRange, setDataRange] = useState<DataRangeInfo | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    const currentYear = new Date().getFullYear();

    try {
      // Fetch holidays for the full year range that data covers (2019-present)
      // and the full headline dataset in parallel
      const [holidayRes, comparisonRes] = await Promise.allSettled([
        // Fetch holidays for multiple years to cover the full data range
        fetch(`/api/holidays?year=${currentYear}&state=selangor`),
        // Full headline dataset (2019 → present, all 14 services)
        // When forceRefresh=true, bypass server-side 6-hour cache
        fetch(`/api/comparison-data${forceRefresh ? '?nocache=1' : ''}`),
      ]);

      // Process holiday data into a local map (not state yet)
      let classMap: Record<string, DayClassification> = {};
      let hSource = 'fallback';
      let hFallback = true;

      if (holidayRes.status === 'fulfilled' && holidayRes.value.ok) {
        const holidayData = await holidayRes.value.json();
        const classArray: DayClassification[] =
          holidayData.classifications ?? [];
        classMap = {};
        for (const c of classArray) {
          classMap[c.date] = c;
        }
        hSource = holidayData.source || 'unknown';
        hFallback = holidayData.fallback || false;
      }

      setClassifications(classMap);
      setHolidaySource(hSource);
      setHolidayFallback(hFallback);

      // Process ridership data using the local classMap
      if (comparisonRes.status === 'fulfilled' && comparisonRes.value.ok) {
        const response = await comparisonRes.value.json();
        const rows: Record<string, unknown>[] = response.data ?? [];

        // Store data range metadata
        if (response.full_range) {
          setDataRange({
            headlineThrough: response.full_range.headline_through ?? null,
            prasaranaThrough: response.full_range.prasarana_through ?? null,
            ktmbThrough: response.full_range.ktmb_through ?? null,
            totalDays: response.full_range.total_days ?? 0,
            minDate: response.full_range.min ?? null,
            maxDate: response.full_range.max ?? null,
          });
        }

        const parsed = rows
          .filter((r) => r.date != null)
          .map((r) => {
            const dateStr = r.date as string;
            const cls = classifyDay(dateStr, classMap);
            const base = parseRidershipRow(r);

            return {
              ...base,
              date: dateStr,
              ...cls,
            };
          })
          .sort(
            (a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          );

        setRidership(parsed);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setHolidayFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Holiday map for calendar dots
  const holidayMap = useMemo(() => {
    const map: Record<string, HolidayMapEntry> = {};

    // From classifications (full year)
    for (const [date, c] of Object.entries(classifications)) {
      if (c.is_public_holiday) {
        map[date] = {
          type:
            c.confidence === 'high'
              ? 'holiday-confirmed'
              : 'holiday-estimated',
          name: c.holiday_name,
          confidence: c.confidence,
          warnings: c.warnings,
        };
      } else if (c.day_type === 'friday') {
        map[date] = {
          type: 'friday',
          confidence: c.confidence,
          warnings: c.warnings,
        };
      } else if (c.day_type === 'weekend') {
        map[date] = {
          type: 'weekend',
          confidence: c.confidence,
          warnings: c.warnings,
        };
      }
    }

    return map;
  }, [classifications]);

  // Pre-computed analytics
  const analytics = useMemo((): Analytics | null => {
    if (!ridership.length) return null;

    const avg = (arr: EnrichedDay[], key: keyof EnrichedDay): number => {
      const nums = arr
        .filter((d) => typeof d[key] === 'number')
        .map((d) => d[key] as number);
      return nums.length
        ? Math.round((nums.reduce((s, v) => s + v, 0) / nums.length))
        : 0;
    };

    const holidays = ridership.filter((d) => d.day_type === 'holiday');
    const weekdays = ridership.filter((d) => d.day_type === 'weekday');
    const fridays = ridership.filter((d) => d.day_type === 'friday');
    const weekends = ridership.filter((d) => d.day_type === 'weekend');

    return {
      holiday_kajang_avg: avg(holidays, 'mrtKajang'),
      weekday_kajang_avg: avg(weekdays, 'mrtKajang'),
      friday_kajang_avg: avg(fridays, 'mrtKajang'),
      weekend_kajang_avg: avg(weekends, 'mrtKajang'),
      holiday_putrajaya_avg: avg(holidays, 'mrtPutrajaya'),
      weekday_putrajaya_avg: avg(weekdays, 'mrtPutrajaya'),
    };
  }, [ridership]);

  // Available dates set — for calendar picker to dim dates without data
  // With 2,677 days of data (2019-2026), this covers a wide range
  const availableDates = useMemo(
    () => new Set(ridership.map((d) => d.date)),
    [ridership]
  );

  // Check if any data has low confidence
  const hasLowConfidence = useMemo(() => {
    return (
      holidayFallback ||
      ridership.some(
        (d) => d.confidence === 'low' || d.confidence === 'unverified'
      )
    );
  }, [ridership, holidayFallback]);

  return {
    ridership,
    analytics,
    holidayMap,
    holidaySource,
    holidayFallback,
    hasLowConfidence,
    availableDates,
    dataRange,
    loading,
    refetch: (forceRefresh = false) => fetchData(forceRefresh),
  };
}
