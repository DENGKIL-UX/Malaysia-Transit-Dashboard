import { NextRequest, NextResponse } from 'next/server';
import {
  getHolidayDateSet,
  isDataBlackout,
  countBlackoutDaysBefore,
  getNextWorkingDay,
  type Holiday,
} from '@/lib/holidays';
import { readFileSync } from 'fs';
import { join } from 'path';

// Types matching the Malaysia Calendar API response
interface MyCalHoliday {
  date: string;
  name: { ms: string; en: string };
  type: 'national' | 'state' | 'religious' | 'observance';
  status: 'confirmed' | 'estimated' | 'provisional';
}

interface MyCalResponse {
  data: MyCalHoliday[];
}

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types: string[];
}

interface NagerWithCounties extends NagerHoliday {
  counties?: string[];
}

export interface DayClassification {
  date: string;
  day_type: 'holiday' | 'friday' | 'weekend' | 'weekday';
  is_public_holiday: boolean;
  holiday_name?: string;
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  warnings: string[];
  is_cuti_ganti?: boolean;
}

interface PrebuiltHolidayData {
  year: number;
  state: string;
  generatedAt: string;
  source: string;
  totalDays: number;
  holidays: number;
  classifications: DayClassification[];
}

const MAJOR_KEYWORDS = [
  'hari raya',
  'chinese new year',
  'deepavali',
  'christmas',
  'eid',
];

/**
 * Try to read pre-built holiday JSON from /public.
 * This eliminates upstream API fetches (MyCal/Nager) entirely
 * for cached years, saving ~5-8ms CPU per request.
 */
function readPrebuiltHolidays(year: number): PrebuiltHolidayData | null {
  try {
    // In Workers, we can't use fs — serve from static assets instead
    return null;
  } catch {
    return null;
  }
}

/**
 * In the Worker, we'll serve the pre-built JSON directly
 * via a dedicated static endpoint. This function fetches it.
 */
async function fetchPrebuilt(year: number): Promise<PrebuiltHolidayData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const res = await fetch(`${baseUrl}/holidays-${year}.json`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Runtime fallbacks (only used if pre-built file is missing) ───

async function fetchMyCal(
  year: number,
  state: string
): Promise<{ classifications: DayClassification[]; holidays: Holiday[] }> {
  const res = await fetch(
    `https://mycal-api.huijun00100101.workers.dev/v1/holidays?year=${year}&state=${state}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!res.ok) throw new Error(`MyCal API returned ${res.status}`);

  const json = (await res.json()) as MyCalResponse;
  const holidays = json.data;

  const holidayMap = new Map<
    string,
    { name: string; localName: string; status: string; type: string }
  >();
  for (const h of holidays) {
    holidayMap.set(h.date, {
      name: h.name.en,
      localName: h.name.ms,
      status: h.status,
      type: h.type,
    });
  }

  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const result: DayClassification[] = [];
  const holidayList: Holiday[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const day = d.getDay();
    const holiday = holidayMap.get(dateStr);

    if (holiday) {
      const isIslamicEstimated =
        (holiday.type === 'religious' || holiday.type === 'national') &&
        holiday.status !== 'confirmed';
      const confidence =
        holiday.status === 'confirmed'
          ? 'high'
          : isIslamicEstimated
            ? 'low'
            : 'medium';

      holidayList.push({
        date: dateStr,
        name: holiday.name,
        localName: holiday.localName,
        scope: holiday.type === 'state' ? 'selangor' : 'national',
        confirmed: holiday.status === 'confirmed',
        isReplacement: false,
        isMajor: MAJOR_KEYWORDS.some((m) =>
          holiday.name.toLowerCase().includes(m)
        ),
      });

      result.push({
        date: dateStr,
        day_type: 'holiday',
        is_public_holiday: true,
        holiday_name: holiday.name,
        confidence,
        warnings:
          isIslamicEstimated
            ? ['Islamic date not yet confirmed by rukyah']
            : [],
      });
    } else if (day === 0 || day === 6) {
      result.push({
        date: dateStr,
        day_type: 'weekend',
        is_public_holiday: false,
        confidence: 'high',
        warnings: [],
      });
    } else if (day === 5) {
      result.push({
        date: dateStr,
        day_type: 'friday',
        is_public_holiday: false,
        confidence: 'high',
        warnings: [],
      });
    } else {
      result.push({
        date: dateStr,
        day_type: 'weekday',
        is_public_holiday: false,
        confidence: 'high',
        warnings: [],
      });
    }
  }

  return { classifications: result, holidays: holidayList };
}

async function fetchNager(
  year: number
): Promise<{ classifications: DayClassification[]; holidays: Holiday[] }> {
  const res = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/MY`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!res.ok) throw new Error(`Nager API returned ${res.status}`);

  const holidays = (await res.json()) as NagerWithCounties[];
  const SELANGOR_CODES = ['SGR', 'KUL', 'LBN', 'PJY'];

  const holidaySet = new Set<string>();
  const holidayNames = new Map<string, { name: string; localName: string; scope: string }>();
  const holidayList: Holiday[] = [];

  for (const h of holidays) {
    const include = h.global || h.counties?.some((c) => SELANGOR_CODES.includes(c));
    if (!include) continue;

    holidaySet.add(h.date);
    const scope = h.global ? 'national' : (h.counties?.includes('SGR') ? 'selangor' : 'ft');
    holidayNames.set(h.date, { name: h.name, localName: h.localName, scope });
    holidayList.push({
      date: h.date,
      name: h.name,
      localName: h.localName,
      scope: scope as Holiday['scope'],
      confirmed: true,
      isReplacement: false,
      isMajor: MAJOR_KEYWORDS.some((m) => h.name.toLowerCase().includes(m)),
    });
  }

  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const result: DayClassification[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const day = d.getDay();
    const isHol = holidaySet.has(dateStr);

    if (isHol) {
      const info = holidayNames.get(dateStr);
      result.push({
        date: dateStr,
        day_type: 'holiday',
        is_public_holiday: true,
        holiday_name: info?.name,
        confidence: 'medium',
        warnings: ['Sourced from Nager.Date — limited accuracy for Islamic dates'],
      });
    } else if (day === 0 || day === 6) {
      result.push({
        date: dateStr,
        day_type: 'weekend',
        is_public_holiday: false,
        confidence: 'high',
        warnings: [],
      });
    } else if (day === 5) {
      result.push({
        date: dateStr,
        day_type: 'friday',
        is_public_holiday: false,
        confidence: 'high',
        warnings: [],
      });
    } else {
      result.push({
        date: dateStr,
        day_type: 'weekday',
        is_public_holiday: false,
        confidence: 'high',
        warnings: [],
      });
    }
  }

  return { classifications: result, holidays: holidayList };
}

function fallbackClassifications(year: number): DayClassification[] {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const result: DayClassification[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const day = d.getDay();

    if (day === 0 || day === 6) {
      result.push({
        date: dateStr,
        day_type: 'weekend',
        is_public_holiday: false,
        confidence: 'high',
        warnings: [],
      });
    } else if (day === 5) {
      result.push({
        date: dateStr,
        day_type: 'friday',
        is_public_holiday: false,
        confidence: 'unverified',
        warnings: [],
      });
    } else {
      result.push({
        date: dateStr,
        day_type: 'weekday',
        is_public_holiday: false,
        confidence: 'unverified',
        warnings: [],
      });
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const state = searchParams.get('state') || 'selangor';

  try {
    let classifications: DayClassification[];
    let holidays: Holiday[] = [];
    let source: string;
    let fallback = false;

    // ─── Strategy 1: Read pre-built static JSON (0ms CPU) ───
    // On Cloudflare Workers, this file is served from the ASSETS binding.
    // The API route reads it from the same origin — CDN-cached after first hit.
    try {
      const baseUrl = request.headers.get('x-forwarded-host')
        ? ''
        : '';
      const res = await fetch(`/holidays-${year}.json`);
      if (res.ok) {
        const prebuilt = await res.json() as PrebuiltHolidayData;
        classifications = prebuilt.classifications;
        source = `prebuilt-${prebuilt.source}`;
        console.log(`[holidays] Using pre-built ${year} (source: ${prebuilt.source})`);
      } else {
        throw new Error('Pre-built not found');
      }
    } catch {
      // ─── Strategy 2: Live MyCal fetch (fallback) ───
      try {
        const mycal = await fetchMyCal(year, state);
        classifications = mycal.classifications;
        holidays = mycal.holidays;
        source = 'mycal';
        console.log(`[holidays] MyCal fallback for ${year}`);
      } catch {
        // ─── Strategy 3: Nager fetch (second fallback) ───
        try {
          const nager = await fetchNager(year);
          classifications = nager.classifications;
          holidays = nager.holidays;
          source = 'nager';
          console.log(`[holidays] Nager fallback for ${year}`);
        } catch {
          // ─── Strategy 4: Weekend-only detection ───
          classifications = fallbackClassifications(year);
          source = 'fallback';
          fallback = true;
          console.log(`[holidays] Ultimate fallback for ${year}`);
        }
      }
    }

    // Apply cuti ganti to holiday list
    const holidaySet = getHolidayDateSet(holidays);

    // Add data blackout info (lightweight computation)
    const today = new Date().toISOString().split('T')[0];
    const todayBlackout = isDataBlackout(today, holidaySet);
    const blackoutInfo = countBlackoutDaysBefore(today, holidaySet);
    const nextBizDay = getNextWorkingDay(today, holidaySet);

    return NextResponse.json({
      classifications,
      holidays: holidays.slice(0, 30),
      source,
      year,
      state,
      fallback,
      today: {
        isBlackout: todayBlackout,
        blackoutDaysBefore: blackoutInfo,
        nextWorkingDay: nextBizDay,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('[holidays] Unhandled error:', error);
    const classifications = fallbackClassifications(year);
    return NextResponse.json({
      classifications,
      holidays: [],
      source: 'fallback',
      year,
      state,
      fallback: true,
      today: {
        isBlackout: false,
        blackoutDaysBefore: { count: 0, reasons: [] },
        nextWorkingDay: new Date().toISOString().split('T')[0],
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }
}
