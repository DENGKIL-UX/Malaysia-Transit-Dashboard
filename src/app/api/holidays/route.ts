import { NextRequest, NextResponse } from 'next/server';

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

export interface DayClassification {
  date: string;
  day_type: 'holiday' | 'friday' | 'weekend' | 'weekday';
  is_public_holiday: boolean;
  holiday_name?: string;
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  warnings: string[];
}

async function fetchMyCal(
  year: number,
  state: string
): Promise<DayClassification[]> {
  const res = await fetch(
    `https://mycal-api.huijun00100101.workers.dev/v1/holidays?year=${year}&state=${state}`,
    { next: { revalidate: 86400 } } // Cache for 24h
  );

  if (!res.ok) throw new Error(`MyCal API returned ${res.status}`);

  const json = (await res.json()) as MyCalResponse;
  const holidays = json.data;

  // Build a map of date -> holiday info
  const holidayMap = new Map<
    string,
    { name: string; status: string; type: string }
  >();
  for (const h of holidays) {
    holidayMap.set(h.date, {
      name: h.name.en,
      status: h.status,
      type: h.type,
    });
  }

  // Generate all 366 days
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const result: DayClassification[] = [];

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

  return result;
}

async function fetchNager(
  year: number
): Promise<DayClassification[]> {
  const res = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/MY`,
    { next: { revalidate: 86400 } }
  );

  if (!res.ok) throw new Error(`Nager API returned ${res.status}`);

  const holidays = (await res.json()) as NagerHoliday[];

  const holidaySet = new Set<string>();
  const holidayNames = new Map<string, string>();
  for (const h of holidays) {
    if (h.global) {
      holidaySet.add(h.date);
      holidayNames.set(h.date, h.name);
    }
  }

  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const result: DayClassification[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const day = d.getDay();
    const isHol = holidaySet.has(dateStr);

    if (isHol) {
      result.push({
        date: dateStr,
        day_type: 'holiday',
        is_public_holiday: true,
        holiday_name: holidayNames.get(dateStr),
        confidence: 'medium', // Nager doesn't distinguish confirmed vs estimated
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

  return result;
}

function fallbackClassifications(year: number): DayClassification[] {
  // Weekend-only detection — no holidays, all unverified except weekends
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
    // Try MyCal first (best source — has confirmed/estimated status)
    let classifications = await fetchMyCal(year, state);
    const source = 'mycal';

    return NextResponse.json({
      classifications,
      source,
      year,
      state,
      fallback: false,
    });
  } catch {
    try {
      // Fallback to Nager (federal holidays only, no state holidays)
      const classifications = await fetchNager(year);

      return NextResponse.json({
        classifications,
        source: 'nager',
        year,
        state,
        fallback: false,
      });
    } catch {
      // Ultimate fallback: weekend detection only
      const classifications = fallbackClassifications(year);

      return NextResponse.json({
        classifications,
        source: 'fallback',
        year,
        state,
        fallback: true,
      });
    }
  }
}
