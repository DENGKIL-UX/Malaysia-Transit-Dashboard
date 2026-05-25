import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://api.data.gov.my/data-catalogue/';

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

  try {
    const url = `${API_BASE}?id=ridership_ktmb_daily&date_start=${encodeURIComponent(startDate)}@date&date_end=${encodeURIComponent(endDate)}@date`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('KTMB Daily API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KTMB daily ridership data' },
      { status: 502 }
    );
  }
}
