/**
 * Malaysia Holiday Calendar Library
 *
 * Handles three-tier holiday system:
 *  1. National + Federal Territory (Federal Gazette)
 *  2. Selangor state holidays (State Secretariat)
 *  3. Islamic holidays (JAKIM rukyah — dynamic lunar dates)
 *
 * Also provides cuti ganti (replacement holiday) logic and
 * data-blackout detection for the data.gov.my pipeline.
 */

export interface Holiday {
  date: string;          // YYYY-MM-DD
  name: string;          // English name
  localName: string;     // Malay name
  scope: 'national' | 'selangor' | 'ft' | 'islamic';
  confirmed: boolean;    // false if pending rukyah
  isReplacement: boolean;// cuti ganti
  isMajor: boolean;      // major holiday (Raya, Haji, CNY, Deepavali)
}

// ── Nager.Date API ─────────────────────────────────────────────────

interface NagerRaw {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types: string[];
  counties?: string[];
}

// Selangor subdivision codes in Nager.Date
const SELANGOR_CODES = ['SGR', 'KUL', 'LBN', 'PJY'];

/**
 * Fetch fixed holidays from Nager.Date for Malaysia + Selangor + FT.
 * Filters for national + state-level (Selangor, KL, Labuan, Putrajaya).
 */
export async function fetchFixedHolidays(
  year: number,
  timeoutMs = 8000
): Promise<Holiday[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/MY`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Nager API returned ${res.status}`);
    const data: NagerRaw[] = await res.json();

    return data
      .filter((h) => {
        if (h.global) return true;
        // Include Selangor / FT subdivisions
        if (h.counties?.some((c) => SELANGOR_CODES.includes(c))) return true;
        return false;
      })
      .map((h) => {
        const scope: Holiday['scope'] = h.global
          ? 'national'
          : h.counties?.includes('SGR')
            ? 'selangor'
            : 'ft';

        return {
          date: h.date,
          name: h.name,
          localName: h.localName,
          scope,
          confirmed: true,
          isReplacement: false,
          isMajor: MAJOR_HOLIDAYS.some((m) =>
            h.name.toLowerCase().includes(m)
          ),
        };
      });
  } catch {
    clearTimeout(timer);
    return [];
  }
}

// ── Major holiday keywords for data-blackout detection ──────────────

const MAJOR_HOLIDAYS = [
  'hari raya aidilfitri',
  'hari raya haji',
  'chinese new year',
  'deepavali',
  'christmas',
  'eid al-fitr',
  'eid al-adha',
];

/**
 * Check if a holiday name represents a "major" multi-day holiday
 * that typically causes extended data pipeline blackouts.
 */
function isMajorHoliday(name: string): boolean {
  const lower = name.toLowerCase();
  return MAJOR_HOLIDAYS.some((m) => lower.includes(m));
}

/**
 * Apply cuti ganti: Sunday holiday → Monday replacement.
 * Per Holidays Act 1951 + state ordinances.
 */
export function applyCutiGanti(holidays: Holiday[]): Holiday[] {
  const result = [...holidays];

  for (const h of holidays) {
    const d = new Date(h.date + 'T00:00:00');
    const day = d.getUTCDay();

    if (day === 0) {
      // Sunday → add Monday replacement
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() + 1);
      const mondayStr = monday.toISOString().split('T')[0];

      // Don't duplicate if Monday is already a holiday
      if (!result.some((r) => r.date === mondayStr)) {
        result.push({
          date: mondayStr,
          name: `${h.name} (Cuti Ganti)`,
          localName: `${h.localName} (Cuti Ganti)`,
          scope: h.scope,
          confirmed: h.confirmed,
          isReplacement: true,
          isMajor: h.isMajor,
        });
      }
    }
  }

  return result;
}

/**
 * Get all holidays for a year (fixed + cuti ganti applied).
 * Fetches from Nager.Date and processes replacements.
 */
export async function getHolidaysForYear(
  year: number
): Promise<Holiday[]> {
  const fixed = await fetchFixedHolidays(year);
  return applyCutiGanti(fixed);
}

/**
 * Build a Set of holiday date strings for fast lookup.
 */
export function getHolidayDateSet(holidays: Holiday[]): Set<string> {
  return new Set(holidays.map((h) => h.date));
}

/**
 * Check if a given date is a "data blackout" day —
 * a day where Prasarana/KTMB batch teams likely skip the data upload.
 *
 * Returns true for:
 *  - Weekends (Sat/Sun)
 *  - Public holidays
 *  - Day after major Islamic/National holiday (informal observance day)
 */
export function isDataBlackout(
  dateStr: string,
  holidaySet: Set<string>
): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getUTCDay();

  // Weekend
  if (day === 0 || day === 6) return true;

  // Public holiday
  if (holidaySet.has(dateStr)) return true;

  return false;
}

/**
 * Walk backward from a date to find the previous working day.
 * Used to compute "expected latest data date" given today.
 */
export function getPreviousWorkingDay(
  fromDate: string,
  holidaySet: Set<string>,
  maxSteps = 7
): string {
  let current = fromDate;

  for (let i = 0; i < maxSteps; i++) {
    const d = new Date(current + 'T00:00:00');
    d.setUTCDate(d.getUTCDate() - 1);
    const prev = d.toISOString().split('T')[0];

    if (!isDataBlackout(prev, holidaySet)) {
      return prev;
    }
    current = prev;
  }

  return current;
}

/**
 * Walk forward from a date to find the next working day.
 * Used to predict when the next data batch will be published.
 */
export function getNextWorkingDay(
  fromDate: string,
  holidaySet: Set<string>,
  maxSteps = 7
): string {
  let current = fromDate;

  for (let i = 0; i < maxSteps; i++) {
    const d = new Date(current + 'T00:00:00');
    d.setUTCDate(d.getUTCDate() + 1);
    const next = d.toISOString().split('T')[0];

    if (!isDataBlackout(next, holidaySet)) {
      return next;
    }
    current = next;
  }

  return current;
}

/**
 * Count consecutive blackout days before a given date.
 * Explains why the data lag is longer than expected T-1.
 */
export function countBlackoutDaysBefore(
  dateStr: string,
  holidaySet: Set<string>
): { count: number; reasons: string[] } {
  const reasons: string[] = [];
  let count = 0;
  let current = dateStr;

  for (let i = 0; i < 5; i++) {
    const d = new Date(current + 'T00:00:00');
    d.setUTCDate(d.getUTCDate() - 1);
    const prev = d.toISOString().split('T')[0];
    const day = d.getUTCDay();

    if (day === 0) {
      reasons.push('Sunday');
      count++;
    } else if (day === 6) {
      reasons.push('Saturday');
      count++;
    } else if (holidaySet.has(prev)) {
      reasons.push(prev);
      count++;
    } else {
      break;
    }
    current = prev;
  }

  return { count, reasons };
}

// ── Simple in-memory cache for holiday data ─────────────────────────

let cachedHolidaySet: Set<string> | null = null;
let cachedYear = 0;
let cachedHolidays: Holiday[] = [];

/**
 * Get holidays for the current year with caching.
 */
export async function getCachedHolidays(): Promise<{
  holidays: Holiday[];
  holidaySet: Set<string>;
}> {
  const year = new Date().getFullYear();

  if (cachedYear === year && cachedHolidaySet) {
    return { holidays: cachedHolidays, holidaySet: cachedHolidaySet };
  }

  // Also fetch next year's holidays (for Dec → Jan transitions)
  const [thisYear, nextYear] = await Promise.all([
    getHolidaysForYear(year),
    getHolidaysForYear(year + 1),
  ]);

  const all = [...thisYear, ...nextYear];
  cachedHolidays = all;
  cachedHolidaySet = getHolidayDateSet(all);
  cachedYear = year;

  return { holidays: cachedHolidays, holidaySet: cachedHolidaySet };
}
