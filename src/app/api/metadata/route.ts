import { NextResponse } from 'next/server';

interface MetaResult {
  headline: {
    data_as_of: string;
    latest_date: string;
    next_update_approx: string;
    lag_days: number;
  };
  prasarana: {
    data_as_of: string;
    last_updated: string;
    next_update: string;
    source: string;
  };
}

async function fetchWithTimeout(
  url: string,
  ms: number
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function GET() {
  const results: MetaResult = {
    headline: {
      data_as_of: '',
      latest_date: '',
      next_update_approx: '',
      lag_days: 0,
    },
    prasarana: {
      data_as_of: '',
      last_updated: '',
      next_update: '',
      source: '',
    },
  };

  // 1. Check actual headline data — probe the API for latest available date
  try {
    const today = new Date().toISOString().split('T')[0];
    const threeMonthsAgo = new Date(Date.now() - 90 * 864e5)
      .toISOString()
      .split('T')[0];
    const res = await fetchWithTimeout(
      `https://api.data.gov.my/data-catalogue?id=ridership_headline&date_start=${threeMonthsAgo}@date&date_end=${today}@date`,
      10000
    );
    if (res && res.ok) {
      const rows = (await res.json()) as Record<string, unknown>[];
      if (Array.isArray(rows) && rows.length > 0) {
        const dates = rows
          .map((r) => r.date as string)
          .filter(Boolean)
          .sort();
        const latestDate = dates[dates.length - 1];
        results.headline.latest_date = latestDate;

        // Compute lag in days
        const latestMs = new Date(latestDate + 'T00:00:00').getTime();
        const todayMs = new Date(today + 'T00:00:00').getTime();
        results.headline.lag_days = Math.round(
          (todayMs - latestMs) / 864e5
        );

        // The headline is published ~12 days after month-end (audited)
        // Estimate next update: ~12th of the following month
        const latestMonth = latestDate.substring(0, 7);
        const [yr, mo] = latestMonth.split('-').map(Number);
        const nextMonth = mo === 12 ? 1 : mo + 1;
        const nextYear = mo === 12 ? yr + 1 : yr;
        results.headline.next_update_approx = `~${String(nextYear)}-${String(nextMonth).padStart(2, '0')}-12`;
      }
    }
  } catch {
    // Silently fail — metadata is informational
  }

  // 2. Check data.gov.my page for "Data as of" string
  try {
    const res = await fetchWithTimeout(
      'https://data.gov.my/data-catalogue/ridership_headline',
      8000
    );
    if (res && res.ok) {
      const html = await res.text();
      const match = html.match(
        /Data as of (\d{4}-\d{2}-\d{2}),\s*(\d{2}:\d{2})/
      );
      if (match) {
        results.headline.data_as_of = `${match[1]} ${match[2]}`;
      }
    }
  } catch {
    // Silently fail
  }

  // 3. Fetch prasarana.json from datagovmy-meta repo
  try {
    const res = await fetchWithTimeout(
      'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/explorers/prasarana.json',
      8000
    );
    if (res && res.ok) {
      const prasarana = (await res.json()) as {
        data_last_updated?: string;
        data_next_update?: string;
        tables?: {
          PrasaranaTimeseries?: {
            data_as_of?: string;
            source?: string;
          };
        };
      };
      results.prasarana.last_updated =
        prasarana.data_last_updated ?? '';
      results.prasarana.next_update =
        prasarana.data_next_update ?? '';
      results.prasarana.data_as_of =
        prasarana.tables?.PrasaranaTimeseries?.data_as_of ?? '';
      results.prasarana.source =
        prasarana.tables?.PrasaranaTimeseries?.source ?? '';
    }
  } catch {
    // Silently fail
  }

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
