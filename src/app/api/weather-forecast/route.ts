import { NextRequest, NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────

interface ForecastDay {
  date: string;
  location: string;
  locationId: string;
  morningForecast: string;
  afternoonForecast: string;
  nightForecast: string;
  summaryForecast: string;
  summaryWhen: string;
  minTemp: number;
  maxTemp: number;
  hasRain: boolean;
  hasThunderstorm: boolean;
  hasHeavyRain: boolean;
}

interface WeatherForecastResponse {
  fetchedAt: string;
  kualaLumpur: ForecastDay[];
  selangor: ForecastDay[];
  todayKL: ForecastDay | null;
  todaySelangor: ForecastDay | null;
}

const KL_STATE_ID = 'St009';
const SELANGOR_STATE_ID = 'St008';

const RAIN_KW = ['hujan', 'rain', 'ribut', 'thunder', 'petir'];
const HEAVY_KW = ['lebat', 'heavy', 'kuat', 'torrential'];

function hasAnyKw(text: string, kws: string[]): boolean {
  const lower = text.toLowerCase();
  return kws.some((k) => lower.includes(k));
}

// ─── Cache ───────────────────────────────────────────────────────────

let cache: { data: WeatherForecastResponse | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 10 * 60 * 1000;

// ─── Regex-based extraction: no JSON.parse on full 737KB ────────────
// The upstream is an array of flat objects. We find each object
// containing our target location_id and extract fields via regex.

function extractField(text: string, field: string): string {
  // Matches "field":"value" or "field": "value"
  const re = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
  const m = text.match(re);
  return m ? m[1].replace(/\\"/g, '"') : '';
}

function extractNumber(text: string, field: string): number {
  const re = new RegExp(`"${field}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 's');
  const m = text.match(re);
  return m ? parseFloat(m[1]) : 0;
}

function extractForecasts(rawText: string): Map<string, ForecastDay[]> {
  const result = new Map<string, ForecastDay[]>();

  // For each target, find all record blocks containing that location_id
  for (const targetId of [KL_STATE_ID, SELANGOR_STATE_ID]) {
    const records: ForecastDay[] = [];
    const searchPattern = `"location_id":"${targetId}"`;

    let searchFrom = 0;
    while (true) {
      const locIdx = rawText.indexOf(searchPattern, searchFrom);
      if (locIdx === -1) break;

      // The record object starts BEFORE the "location" key.
      // Walk backwards to find the record's opening { (the one NOT inside location).
      // Strategy: find the "location":{ before our match, then find the record's { before that.
      const locKeyIdx = rawText.lastIndexOf('"location":{', locIdx);
      if (locKeyIdx === -1) { searchFrom = locIdx + searchPattern.length; continue; }

      // The record's { is the one before "location":
      // It's preceded by either }{ (previous record) or [{  (array start)
      const recordStart = rawText.lastIndexOf('{', locKeyIdx - 1);
      if (recordStart === -1) { searchFrom = locIdx + searchPattern.length; continue; }

      // Find matching closing brace for the record
      let depth = 0;
      let recordEnd = -1;
      for (let i = recordStart; i < rawText.length; i++) {
        if (rawText[i] === '{') depth++;
        else if (rawText[i] === '}') {
          depth--;
          if (depth === 0) { recordEnd = i; break; }
        }
      }

      if (recordEnd === -1) { searchFrom = locIdx + searchPattern.length; continue; }

      try {
        const block = rawText.substring(recordStart, recordEnd + 1);
        const locName = extractField(block, 'location_name');
        if (!locName) { searchFrom = recordEnd + 1; continue; }

        const date = extractField(block, 'date');
        const morning = extractField(block, 'morning_forecast');
        const afternoon = extractField(block, 'afternoon_forecast');
        const night = extractField(block, 'night_forecast');
        const summary = extractField(block, 'summary_forecast');
        const when = extractField(block, 'summary_when');
        const minT = extractNumber(block, 'min_temp');
        const maxT = extractNumber(block, 'max_temp');

        const allText = `${morning} ${afternoon} ${night} ${summary}`;
        records.push({
          date,
          location: locName,
          locationId: targetId,
          morningForecast: morning,
          afternoonForecast: afternoon,
          nightForecast: night,
          summaryForecast: summary,
          summaryWhen: when,
          minTemp: minT,
          maxTemp: maxT,
          hasRain: hasAnyKw(allText, RAIN_KW),
          hasThunderstorm: hasAnyKw(allText, ['ribut', 'thunder', 'petir']),
          hasHeavyRain: hasAnyKw(allText, HEAVY_KW),
        });
      } catch {
        // Skip malformed
      }

      searchFrom = recordEnd + 1;
    }

    result.set(targetId, records);
  }

  return result;
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now();

  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200', 'X-Cache': 'HIT' },
    });
  }

  try {
    const res = await fetch('https://api.data.gov.my/weather/forecast/', {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Upstream unavailable', fetchedAt: new Date().toISOString() },
        { status: 502 }
      );
    }

    const rawText = await res.text();
    const extracted = extractForecasts(rawText);

    const kualaLumpur = (extracted.get(KL_STATE_ID) ?? []).sort(
      (a, b) => b.date.localeCompare(a.date)
    );
    const selangor = (extracted.get(SELANGOR_STATE_ID) ?? []).sort(
      (a, b) => b.date.localeCompare(a.date)
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayKL = kualaLumpur.find((d) => d.date === todayStr) ?? kualaLumpur[0] ?? null;
    const todaySelangor = selangor.find((d) => d.date === todayStr) ?? selangor[0] ?? null;

    const response: WeatherForecastResponse = {
      fetchedAt: new Date().toISOString(),
      kualaLumpur,
      selangor,
      todayKL,
      todaySelangor,
    };

    cache = { data: response, timestamp: now };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200', 'X-Cache': 'MISS' },
    });
  } catch {
    if (cache.data) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200', 'X-Cache': 'STALE' },
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch', fetchedAt: new Date().toISOString() },
      { status: 500 }
    );
  }
}