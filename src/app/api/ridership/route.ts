import { NextRequest, NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────

interface KtmbDay {
  date: string;   // "2026-05-24 00:00:00"
  ets: number;
  intercity: number;
  komuter: number;
  komuter_utara: number;
  tebrau: number;
  total: number;
}

interface PrasaranaDay {
  date: string;   // "2026-05-23"
  brt: number;
  lrt_ampang: number;
  lrt_kj: number;
  monorail: number;
  mrt_pjy: number;
  total: number;
}

interface MergedRow {
  date: string;
  rail_mrt_kajang: number;
  rail_mrt_pjy: number;
  rail_lrt_kj: number;
  rail_lrt_ampang: number;
  rail_monorail: number;
  rail_komuter: number;
  rail_ets: number;
  rail_intercity: number;
  rail_komuter_utara: number;
  rail_tebrau: number;
  bus_rkl: number;
  bus_rkn: number;
  bus_rpn: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Fetch a local JSON file from public/ via HTTP.
 * Uses fetch for Cloudflare Pages compatibility (no filesystem access).
 */
async function readLocalJson<T>(baseUrl: string, filename: string): Promise<T[]> {
  try {
    const res = await fetch(`${baseUrl}/${filename}`);
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

/**
 * Parse KTMB date format "2026-05-24 00:00:00" to "2026-05-24"
 */
function parseKtmbDate(raw: string): string {
  return raw.split(' ')[0];
}

// ─── Main GET handler ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'start_date and end_date query parameters are required' },
      { status: 400 }
    );
  }

  const baseUrl = new URL(request.url).origin;

  try {
    // Fetch local JSON data (has latest data up to current date)
    const [ktmbData, prasaranaData] = await Promise.all([
      readLocalJson<KtmbDay>(baseUrl, 'ktmb-daily.json'),
      readLocalJson<PrasaranaDay>(baseUrl, 'prasarana-daily.json'),
    ]);

    // Build lookup maps keyed by normalized date
    const ktmbMap = new Map<string, KtmbDay>();
    for (const row of ktmbData) {
      ktmbMap.set(parseKtmbDate(row.date), row);
    }

    const prasaranaMap = new Map<string, PrasaranaDay>();
    for (const row of prasaranaData) {
      prasaranaMap.set(row.date, row);
    }

    // Collect all unique dates from both sources
    const allDates = new Set<string>([
      ...ktmbMap.keys(),
      ...prasaranaMap.keys(),
    ]);

    // Filter by date range and merge
    const merged: MergedRow[] = [];
    for (const date of allDates) {
      if (date < startDate || date > endDate) continue;

      const ktmb = ktmbMap.get(date);
      const prasarana = prasaranaMap.get(date);

      // Need at least one source to include the date
      if (!ktmb && !prasarana) continue;

      merged.push({
        date,
        rail_mrt_kajang: prasarana?.brt ?? 0,
        rail_mrt_pjy: prasarana?.mrt_pjy ?? 0,
        rail_lrt_kj: prasarana?.lrt_kj ?? 0,
        rail_lrt_ampang: prasarana?.lrt_ampang ?? 0,
        rail_monorail: prasarana?.monorail ?? 0,
        rail_komuter: ktmb?.komuter ?? 0,
        rail_ets: ktmb?.ets ?? 0,
        rail_intercity: ktmb?.intercity ?? 0,
        rail_komuter_utara: ktmb?.komuter_utara ?? 0,
        rail_tebrau: ktmb?.tebrau ?? 0,
        bus_rkl: 0,
        bus_rkn: 0,
        bus_rpn: 0,
      });
    }

    // Sort by date ascending
    merged.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(merged);
  } catch (error) {
    console.error('Ridership API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ridership data' },
      { status: 502 }
    );
  }
}
