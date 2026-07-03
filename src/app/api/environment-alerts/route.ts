import { NextRequest, NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────

interface WeatherWarning {
  type: 'weather';
  id: string;
  severity: 'warning' | 'danger';
  titleEn: string;
  textEn: string;
  validFrom: string;
  validTo: string;
  issuedAt: string;
  isTransitRelevant: boolean;
  transitAreas: string[];
}

interface FloodWarning {
  type: 'flood';
  id: string;
  severity: 'normal' | 'alert' | 'warning' | 'danger';
  stationName: string;
  stationCode: string;
  state: string;
  district: string;
  waterLevelCurrent: number;
  waterLevelNormal: number;
  waterLevelAlert: number;
  waterLevelWarning: number;
  waterLevelDanger: number;
  trend: string;
  updatedAt: string;
  isTransitRelevant: boolean;
  transitLines: string[];
}

interface EarthquakeEvent {
  type: 'earthquake';
  id: string;
  utcDatetime: string;
  localDatetime: string;
  magnitude: number;
  magType: string;
  depth: number;
  location: string;
  distanceFromMY: string;
  isNearMY: boolean;
}

interface EnvironmentAlertsResponse {
  fetchedAt: string;
  weatherWarnings: WeatherWarning[];
  floodWarningCount: number;
  floodHasTransitRelevant: boolean;
  recentEarthquakes: EarthquakeEvent[];
  activeAlertCount: number;
  hasTransitRelevantAlerts: boolean;
}

// ─── Transit-relevant area detection ──────────────────────────────────

const TRANSIT_DISTRICTS_KLANG_VALLEY = new Set([
  'PETALING', 'KLANG', 'GOMBAK', 'HULU SELANGOR', 'KUALA LANGAT',
  'HULU LANGAT', 'SEPANG', 'KUALA SELANGOR',
  'KUALA LUMPUR', 'PUTRAJAYA',
]);

const TRANSIT_DISTRICTS_KTMB = new Set([
  'PETALING', 'KLANG', 'GOMBAK', 'HULU SELANGOR', 'KUALA SELANGOR',
  'KUALA LANGAT', 'SEPANG', 'KUALA LUMPUR', 'PUTRAJAYA',
  'SEREMBAN', 'PORT DICKSON', 'REMBAU', 'KUALA PILAH', 'JELEBU',
  'KINTA', 'PERAK TENGAH', 'KAMPAR', 'LARUT, MATANG DAN SELAMA',
  'HILIR PERAK', 'BAGAN DATUK', 'BATANG PADANG', 'KUALA KANGSAR',
  'KERIAN', 'MANJUNG',
]);

const TRANSIT_TEXT_PATTERNS = [
  /selangor/i, /kuala lumpur/i, /putrajaya/i,
  /klang valley/i, /petaling/i, /gombak/i,
  /negeri sembilan/i, /melaka/i, /johor/i,
  /perak/i, /pulau pinang/i, /penang/i,
  /pahang/i, /kedah/i, /kelantan/i,
  /perlis/i, /terengganu/i,
  /petaling jaya/i, /shah alam/i,
  /west coast/i, /pusat/i, /tengah/i,
];

function isTextTransitRelevant(text: string): boolean {
  return TRANSIT_TEXT_PATTERNS.some((p) => p.test(text));
}

const AREA_EXTRACTORS: [RegExp, string][] = [
  [/selangor/i, 'Selangor'], [/kuala lumpur/i, 'Kuala Lumpur'],
  [/putrajaya/i, 'Putrajaya'], [/pahang/i, 'Pahang'],
  [/perak/i, 'Perak'], [/negeri sembilan/i, 'N. Sembilan'],
  [/melaka/i, 'Melaka'], [/johor/i, 'Johor'],
  [/penang|pulau pinang/i, 'Penang'], [/kedah/i, 'Kedah'],
  [/kelantan/i, 'Kelantan'], [/terengganu/i, 'Terengganu'],
  [/perlis/i, 'Perlis'],
];

function extractTransitAreas(text: string): string[] {
  const areas: string[] = [];
  for (const [re, name] of AREA_EXTRACTORS) {
    if (re.test(text) && !areas.includes(name)) areas.push(name);
  }
  return areas;
}

function mapFloodToTransitLines(state: string, district: string): string[] {
  const lines: string[] = [];
  const dist = district.toUpperCase();
  const st = state.toUpperCase();

  if (TRANSIT_DISTRICTS_KLANG_VALLEY.has(dist) || st === 'WP KUALA LUMPUR' || st === 'WP PUTRAJAYA') {
    lines.push('KTM Komuter', 'LRT', 'MRT', 'Monorail', 'BRT Sunway');
  }
  if (TRANSIT_DISTRICTS_KTMB.has(dist)) {
    if (!lines.includes('KTM Komuter')) lines.push('KTM Komuter');
    lines.push('ETS');
  }
  if (st === 'NEGERI SEMBILAN') lines.push('KTM Komuter');
  if (st === 'MELAKA') lines.push('KTM Intercity');
  if (st === 'JOHOR') lines.push('KTM Intercity', 'Shuttle Tebrau');
  if (st === 'PERAK') lines.push('KTM Komuter', 'ETS');
  if (st === 'KEDAH' || st === 'PULAU PINANG') lines.push('KTM Komuter', 'ETS');
  if (st === 'KELANTAN' || st === 'TERENGGANU') lines.push('KTM Intercity', 'ETS');
  if (st === 'PAHANG') lines.push('ETS');

  return [...new Set(lines)];
}

// ─── In-memory cache (5 min for real-time alerts) ─────────────────────

let cache: { data: EnvironmentAlertsResponse | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 5 * 60 * 1000;

// ─── Fetchers ─────────────────────────────────────────────────────────

async function fetchWeatherWarnings(): Promise<WeatherWarning[]> {
  try {
    const res = await fetch('https://api.data.gov.my/weather/warning/', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((w: Record<string, unknown>, i: number) => {
      const textEn = String(w.text_en ?? '');
      const headingEn = String(w.heading_en ?? '');
      const titleEn = String(w.title_en ?? headingEn);
      const fullText = `${titleEn} ${textEn}`;
      const isTransit = isTextTransitRelevant(fullText);

      return {
        type: 'weather' as const,
        id: `weather-${i}-${String(w.valid_from ?? i)}`,
        severity: (titleEn.toLowerCase().includes('danger') ? 'danger' : 'warning') as
          | 'warning'
          | 'danger',
        titleEn,
        textEn,
        validFrom: String(w.valid_from ?? ''),
        validTo: String(w.valid_to ?? ''),
        issuedAt: String(
          (w.warning_issue as Record<string, unknown>)?.issued ?? ''
        ),
        isTransitRelevant: isTransit,
        transitAreas: isTransit ? extractTransitAreas(fullText) : [],
      };
    });
  } catch {
    return [];
  }
}

// Flood data is large (~2MB) and fetched lazily via separate endpoint
async function fetchFloodCount(): Promise<{ count: number; hasTransitRelevant: boolean }> {
  try {
    const res = await fetch('https://api.data.gov.my/flood-warning/', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { count: 0, hasTransitRelevant: false };
    const data = await res.json();
    if (!Array.isArray(data)) return { count: 0, hasTransitRelevant: false };

    let count = 0;
    let hasTransit = false;
    for (const s of data) {
      const indicator = String((s as Record<string, unknown>).water_level_indicator ?? 'NORMAL');
      if (indicator !== 'NORMAL' && indicator !== '') {
        count++;
        if (!hasTransit) {
          const state = String((s as Record<string, unknown>).state ?? '');
          const district = String((s as Record<string, unknown>).district ?? '');
          if (mapFloodToTransitLines(state, district).length > 0) {
            hasTransit = true;
          }
        }
      }
    }
    return { count, hasTransitRelevant: hasTransit };
  } catch {
    return { count: 0, hasTransitRelevant: false };
  }
}

async function fetchEarthquakes(): Promise<EarthquakeEvent[]> {
  try {
    const res = await fetch('https://api.data.gov.my/weather/warning/earthquake/', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return data
      .filter((eq: Record<string, unknown>) => {
        const localDt = String(eq.localdatetime ?? '');
        return new Date(localDt) >= thirtyDaysAgo;
      })
      .sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) =>
          new Date(String(b.localdatetime ?? '')).getTime() -
          new Date(String(a.localdatetime ?? '')).getTime()
      )
      .slice(0, 10)
      .map((eq: Record<string, unknown>) => {
        const distStr = String(eq.nbm_distancemas ?? eq.n_distancemas ?? '');
        const distMatch = distStr.match(/([\d,]+)\s*km/);
        const distKm = distMatch
          ? parseInt(distMatch[1].replace(',', ''), 10)
          : 9999;

        return {
          type: 'earthquake' as const,
          id: `eq-${String(eq.utcdatetime ?? '')}-${String(eq.lat ?? '')}`,
          utcDatetime: String(eq.utcdatetime ?? ''),
          localDatetime: String(eq.localdatetime ?? ''),
          magnitude: Number(eq.magdefault ?? 0),
          magType: String(eq.magtypedefault ?? ''),
          depth: Number(eq.depth ?? 0),
          location: String(eq.location ?? ''),
          distanceFromMY: distStr,
          isNearMY: distKm < 1000,
        };
      });
  } catch {
    return [];
  }
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const now = Date.now();

  // Return cached response if fresh
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    });
  }

  // Fetch weather + earthquake (small payloads), then flood count only
  const [weatherWarnings, floodInfo, recentEarthquakes] = await Promise.all([
    fetchWeatherWarnings(),
    fetchFloodCount(),
    fetchEarthquakes(),
  ]);

  // Sort weather: transit-relevant first
  const severityOrder: Record<string, number> = {
    danger: 0,
    warning: 1,
    alert: 2,
    normal: 3,
  };
  weatherWarnings.sort((a, b) => {
    if (a.isTransitRelevant !== b.isTransitRelevant)
      return a.isTransitRelevant ? -1 : 1;
    return (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
  });

  const response: EnvironmentAlertsResponse = {
    fetchedAt: new Date().toISOString(),
    weatherWarnings,
    floodWarningCount: floodInfo.count,
    floodHasTransitRelevant: floodInfo.hasTransitRelevant,
    recentEarthquakes,
    activeAlertCount: weatherWarnings.length + floodInfo.count,
    hasTransitRelevantAlerts:
      weatherWarnings.some((w) => w.isTransitRelevant) ||
      floodInfo.hasTransitRelevant,
  };

  cache = { data: response, timestamp: now };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'X-Cache': 'MISS',
    },
  });
}