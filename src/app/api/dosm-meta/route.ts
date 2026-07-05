import { NextResponse } from 'next/server';

// ─── DOSM Metadata Proxy ──────────────────────────────────────────────
// Fetches ALL DOSM ridership metadata LIVE from GitHub raw URLs.
// This replaces reading stale static files from public/.
//
// The datagovmy-meta repo is updated by DOSM whenever new data is published.
// By fetching live, the dashboard always shows the correct data_as_of.
//
// Cache: 1-hour in-memory (DOSM updates ~daily, 1h polling is sufficient).

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/data-catalogue';

const DATASET_IDS = [
  'ridership_headline',
  'ridership_ktmb_daily',
  'ridership_ktmb_monthly',
  'ridership_od_rapidrail_daily',
  'ridership_od_brt_daily',
  'ridership_od_ets',
  'ridership_od_intercity',
  'ridership_od_komuter',
  'ridership_od_shuttle_tebrau',
] as const;

type DatasetId = (typeof DATASET_IDS)[number];

interface DosmDatasetMeta {
  id: DatasetId;
  data_as_of: string;
  last_updated: string;
  next_update: string;
  exclude_openapi: boolean;
  title_en: string;
  frequency?: string;
  link_parquet?: string;
  [key: string]: unknown;
}

interface DosmMetaResponse {
  fetched_at: string;
  cache_age_seconds: number;
  datasets: Record<DatasetId, DosmDatasetMeta | null>;
  freshest: { dataset: DatasetId; data_as_of: string } | null;
  stale_datasets: DatasetId[];
  errors: string[];
}

// ─── In-memory cache ─────────────────────────────────────────────────

let cached: { data: DosmMetaResponse; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── Helpers ─────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function extractDataAsOf(raw: Record<string, unknown>): string {
  const raw2 = raw.data_as_of as string | undefined;
  if (!raw2) return '';
  // "2026-07-03 23:59" → "2026-07-03"
  return raw2.split(' ')[0] ?? '';
}

// ─── Main handler ────────────────────────────────────────────────────

export async function GET() {
  // Return cached if fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Cache': 'HIT',
      },
    });
  }

  const errors: string[] = [];
  const datasets = {} as Record<DatasetId, DosmDatasetMeta | null>;

  // Fetch all metadata in parallel
  const results = await Promise.all(
    DATASET_IDS.map(async (id): Promise<[DatasetId, DosmDatasetMeta | null, string?]> => {
      const url = `${GITHUB_RAW_BASE}/${id}.json`;
      const res = await fetchWithTimeout(url, 8000);
      if (!res || !res.ok) {
        return [id, null, `${id}: HTTP ${res?.status ?? 'timeout'}`];
      }
      try {
        const raw = (await res.json()) as Record<string, unknown>;
        return [
          id,
          {
            id,
            data_as_of: (raw.data_as_of as string) ?? '',
            last_updated: (raw.last_updated as string) ?? '',
            next_update: (raw.next_update as string) ?? '',
            exclude_openapi: (raw.exclude_openapi as boolean) ?? false,
            title_en: (raw.title_en as string) ?? id,
            frequency: (raw.frequency as string) ?? '',
            link_parquet: (raw.link_parquet as string) ?? '',
            ...raw,
          },
        ];
      } catch {
        return [id, null, `${id}: JSON parse error`];
      }
    })
  );

  // Assemble results
  let freshest: { dataset: DatasetId; data_as_of: string } | null = null;
  const staleDatasets: DatasetId[] = [];

  for (const [id, meta, error] of results) {
    if (error) {
      errors.push(error);
      datasets[id] = null;
      continue;
    }
    datasets[id] = meta!;

    const dateOnly = extractDataAsOf(meta!);
    if (dateOnly) {
      if (!freshest || dateOnly > freshest.data_as_of) {
        freshest = { dataset: id, data_as_of: dateOnly };
      }
      // Check if stale (more than 3 days behind today)
      const today = new Date().toISOString().split('T')[0];
      const lagMs = new Date(today).getTime() - new Date(dateOnly).getTime();
      const lagDays = lagMs / 864e5;
      if (lagDays > 3) {
        staleDatasets.push(id);
      }
    }
  }

  const data: DosmMetaResponse = {
    fetched_at: new Date().toISOString(),
    cache_age_seconds: 0,
    datasets,
    freshest,
    stale_datasets: staleDatasets,
    errors,
  };

  // Cache
  cached = { data, timestamp: Date.now() };

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      'X-Cache': 'MISS',
    },
  });
}