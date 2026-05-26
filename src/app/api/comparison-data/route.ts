import { NextRequest, NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────

interface HeadlineRow {
  date: string;
  bus_rkl: number;
  bus_rkn: number;
  bus_rpn: number;
  rail_lrt_ampang: number;
  rail_mrt_kajang: number;
  rail_lrt_kj: number;
  rail_monorail: number;
  rail_mrt_pjy: number;
  rail_ets: number;
  rail_intercity: number;
  rail_komuter_utara: number;
  rail_tebrau: number;
  rail_komuter: number;
}

// ─── GET handler ─────────────────────────────────────────────────────

/**
 * Returns ridership data for the date comparison feature.
 * Uses the full headline dataset (2019 → 2026-04-30, all 14 services).
 *
 * Query params:
 *   - start_date: optional, filter from date (YYYY-MM-DD)
 *   - end_date: optional, filter to date
 *   - dates: optional, comma-separated list of specific dates
 *
 * Returns array of rows in headline format (same fields as the
 * ridership_headline API from data.gov.my).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const datesParam = searchParams.get('dates');

  const baseUrl = new URL(request.url).origin;

  try {
    // Fetch the full headline dataset from local JSON
    const res = await fetch(`${baseUrl}/headline-daily.json`);
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to load headline data' },
        { status: 500 }
      );
    }

    const data: HeadlineRow[] = await res.json();

    // Parse specific dates if provided
    let targetDates: Set<string> | null = null;
    if (datesParam) {
      targetDates = new Set(datesParam.split(',').map((d) => d.trim()));
    }

    // Filter
    const filtered = data.filter((row) => {
      if (targetDates && !targetDates.has(row.date)) return false;
      if (startDate && row.date < startDate) return false;
      if (endDate && row.date > endDate) return false;
      return true;
    });

    // Return metadata + data
    return NextResponse.json({
      count: filtered.length,
      date_range: {
        min: filtered[0]?.date ?? null,
        max: filtered[filtered.length - 1]?.date ?? null,
      },
      full_range: {
        min: data[0]?.date ?? null,
        max: data[data.length - 1]?.date ?? null,
        total_days: data.length,
      },
      data: filtered,
    });
  } catch (error) {
    console.error('Comparison data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison data' },
      { status: 502 }
    );
  }
}
