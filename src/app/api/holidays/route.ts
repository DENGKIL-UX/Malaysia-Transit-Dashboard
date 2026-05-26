import { NextRequest, NextResponse } from 'next/server';
import {
  getHolidaysForYear,
  getHolidayDateSet,
  isDataBlackout,
  countBlackoutDaysBefore,
  getNextWorkingDay,
  type Holiday,
} from '@/lib/holidays';

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

async function fetchMyCal(
  year: number,
  state: string
): Promise<{ classifications: DayClassification[]; holidays: Holiday[] }> {
  const res = await fetch(
    `https://mycal-api.huijun00100101.workers.dev/v1/holidays?year=${year}&state=${state}`
  );

  if (!res.ok) throw new Error(`MyCal API returned ${res.status}`);

  const json = (await res.json()) as MyCalResponse;
  const holidays = json.data;

  // Build a map of date -> holiday info
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

  // Generate all 366 days
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

const MAJOR_KEYWORDS = [
  'hari raya',
  'chinese new year',
  'deepavali',
  'christmas',
  'eid',
];

async function fetchNager(
  year: number
): Promise<{ classifications: DayClassification[]; holidays: Holiday[] }> {
  const res = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/MY`
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
    // Try MyCal first (best source — has confirmed/estimated status)
    let { classifications, holidays } = await fetchMyCal(year, state);
    const source = 'mycal';

    // Apply cuti ganti to holiday list
    const holidaySet = getHolidayDateSet(holidays);

    // Add data blackout info
    const today = new Date().toISOString().split('T')[0];
    const todayBlackout = isDataBlackout(today, holidaySet);
    const blackoutInfo = countBlackoutDaysBefore(today, holidaySet);
    const nextBizDay = getNextWorkingDay(today, holidaySet);

    return NextResponse.json({
      classifications,
      holidays: holidays.slice(0, 30), // Return top holidays for UI
      source,
      year,
      state,
      fallback: false,
      today: {
        isBlackout: todayBlackout,
        blackoutDaysBefore: blackoutInfo,
        nextWorkingDay: nextBizDay,
      },
    });
  } catch {
    try {
      // Fallback to Nager (federal holidays only, no state holidays)
      const { classifications, holidays } = await fetchNager(year);
      const holidaySet = getHolidayDateSet(holidays);

      const today = new Date().toISOString().split('T')[0];
      const todayBlackout = isDataBlackout(today, holidaySet);
      const blackoutInfo = countBlackoutDaysBefore(today, holidaySet);
      const nextBizDay = getNextWorkingDay(today, holidaySet);

      return NextResponse.json({
        classifications,
        holidays: holidays.slice(0, 30),
        source: 'nager',
        year,
        state,
        fallback: false,
        today: {
          isBlackout: todayBlackout,
          blackoutDaysBefore: blackoutInfo,
          nextWorkingDay: nextBizDay,
        },
      });
    } catch {
      // Ultimate fallback: weekend detection only
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
      });
    }
  }
}
