import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://api.data.gov.my/data-catalogue/';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'start_date and end_date query parameters are required' },
      { status: 400, headers: { 'Cache-Control': 'no-cache' } }
    );
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return NextResponse.json(
      { error: 'start_date and end_date must be valid YYYY-MM-DD dates' },
      { status: 400, headers: { 'Cache-Control': 'no-cache' } }
    );
  }

  try {
    const url = `${API_BASE}?id=ridership_ktmb_daily&date_start=${encodeURIComponent(startDate)}@date&date_end=${encodeURIComponent(endDate)}@date`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream API returned ${res.status}` },
        { status: res.status, headers: { 'Cache-Control': 'no-cache' } }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600',
      },
    });
  } catch (error) {
    console.error('KTMB Daily API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KTMB daily ridership data' },
      { status: 502, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
