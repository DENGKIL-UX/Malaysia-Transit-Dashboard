import { NextRequest, NextResponse } from 'next/server';

// ── MCP Tool Definitions ──────────────────────────────────────────────

const MCP_TOOLS = [
  {
    name: 'query_ridership',
    description:
      'Fetch daily ridership data from data.gov.my headline dataset. Returns array of daily records with rail and bus breakdowns.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        end_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_metadata',
    description:
      'Read dataset metadata from datagovmy-meta GitHub repo. Returns last_updated, next_update, and data_as_of fields.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        dataset_id: {
          type: 'string',
          description:
            'Dataset identifier, e.g. "ridership_headline"',
        },
      },
      required: ['dataset_id'],
    },
  },
] as const;

// ── CORS Headers ──────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Cache helpers (Cloudflare Cache API) ─────────────────────────────

function getCacheKey(path: string, args: Record<string, unknown>): Request {
  const today = new Date().toISOString().split('T')[0];
  const fingerprint = Buffer.from(JSON.stringify(args)).toString('base64url');
  const url = `https://rapidstats.internal/cache/${path}/${today}/${fingerprint}`;
  return new Request(url);
}

async function getCached(request: Request): Promise<Response | undefined> {
  try {
    const cache = caches.default;
    return cache.match(request);
  } catch {
    // Cache API not available (local dev) — skip
    return undefined;
  }
}

async function setCache(
  request: Request,
  payload: string
): Promise<void> {
  try {
    const cache = caches.default;
    await cache.put(
      request,
      new Response(payload, {
        headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
      })
    );
  } catch {
    // Cache API not available (local dev) — skip
  }
}

// ── Tool Implementations ──────────────────────────────────────────────

async function queryRidership(args: {
  start_date: string;
  end_date: string;
}): Promise<string> {
  const cacheKey = getCacheKey('ridership', args);
  const cached = await getCached(cacheKey);
  if (cached) return cached.text();

  const url = new URL('https://api.data.gov.my/data-catalogue');
  url.searchParams.set('id', 'ridership_headline');
  url.searchParams.set(
    'date_start',
    `${args.start_date}@date`
  );
  url.searchParams.set(
    'date_end',
    `${args.end_date}@date`
  );

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Upstream data.gov.my returned ${res.status}`);
  }

  const data = await res.json();
  const payload = JSON.stringify({
    count: Array.isArray(data) ? data.length : 0,
    latest: Array.isArray(data) && data.length > 0
      ? data[data.length - 1]?.date
      : null,
    data,
  });

  await setCache(cacheKey, payload);
  return payload;
}

async function getMetadata(args: { dataset_id: string }): Promise<string> {
  const cacheKey = getCacheKey('metadata', args);
  const cached = await getCached(cacheKey);
  if (cached) return cached.text();

  // Try prasarana.json from datagovmy-meta repo
  const metaUrl = `https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/explorers/${args.dataset_id}.json`;

  const res = await fetch(metaUrl, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Metadata fetch failed: ${res.status}`);
  }

  const meta = await res.json();
  const payload = JSON.stringify({
    last_updated: meta.data_last_updated ?? null,
    next_update: meta.data_next_update ?? null,
    data_as_of:
      meta.tables?.PrasaranaTimeseries?.data_as_of ?? null,
    source: meta.tables?.PrasaranaTimeseries?.source ?? null,
  });

  await setCache(cacheKey, payload);
  return payload;
}

// ── MCP Request Router ────────────────────────────────────────────────

async function handleMCPRequest(body: Record<string, unknown>) {
  switch (body.method) {
    // ── List available tools ──
    case 'tools/list':
      return {
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      };

    // ── Call a specific tool ──
    case 'tools/call': {
      const params = body.params as {
        name: string;
        arguments?: Record<string, unknown>;
      };

      if (!params?.name) {
        throw new Error('tools/call requires params.name');
      }

      const args = params.arguments ?? {};

      switch (params.name) {
        case 'query_ridership': {
          const { start_date, end_date } = args as {
            start_date?: string;
            end_date?: string;
          };

          if (!start_date || !end_date) {
            throw new Error(
              'query_ridership requires start_date and end_date'
            );
          }

          const text = await queryRidership({
            start_date,
            end_date,
          });
          return { content: [{ type: 'text' as const, text }] };
        }

        case 'get_metadata': {
          const { dataset_id } = args as { dataset_id?: string };

          if (!dataset_id) {
            throw new Error(
              'get_metadata requires dataset_id'
            );
          }

          const text = await getMetadata({ dataset_id });
          return { content: [{ type: 'text' as const, text }] };
        }

        default:
          throw new Error(`Unknown tool: ${params.name}`);
      }
    }

    default:
      throw new Error(`Unknown MCP method: ${body.method}`);
  }
}

// ── HTTP Handlers ─────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleMCPRequest(body);
    return NextResponse.json(result, { headers: { ...corsHeaders, 'Cache-Control': 'public, s-maxage=300' } });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32000, message } },
      { status: 500, headers: { ...corsHeaders, 'Cache-Control': 'no-cache' } }
    );
  }
}
