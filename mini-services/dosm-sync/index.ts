/**
 * DOSM Data Server
 * Port: 3021
 *
 * Serves pre-computed JSON from /tmp/dosm-sync/ directory.
 * Run sync.sh separately to refresh data.
 *
 * Endpoints:
 *   /health          → Health check
 *   /status          → Sync state from state.json
 *   /metadata        → Latest metadata snapshots
 *   /rapidrail-daily → Per-line Rapid Rail daily totals
 *   /brt-daily       → BRT daily totals
 *   /combined-daily  → Merged Rapid Rail + BRT daily totals
 */

import { readFileSync, existsSync, statSync } from 'fs';

const PORT = 3021;
const DATA_DIR = '/tmp/dosm-sync';

// In-memory file cache
const cache: Record<string, { data: string; mtime: number }> = {};

function serveJson(filename: string): Response {
  const path = `${DATA_DIR}/${filename}`;
  if (!existsSync(path)) {
    return Response.json(
      { error: 'Data not ready', file: filename, hint: 'Run sync.sh to generate data' },
      { status: 503 }
    );
  }

  const mtime = statSync(path).mtimeMs;
  const cached = cache[filename];

  if (cached && cached.mtime === mtime) {
    return new Response(cached.data, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  }

  const data = readFileSync(path, 'utf-8');
  cache[filename] = { data, mtime };

  return new Response(data, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
}

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/health') {
      return Response.json({ status: 'ok', port: PORT, uptime_sec: Math.round(process.uptime()) });
    }

    if (path === '/status') {
      const statePath = `${DATA_DIR}/state.json`;
      if (!existsSync(statePath)) {
        return Response.json({ synced: false, hint: 'Run sync.sh' });
      }
      try {
        const state = JSON.parse(readFileSync(statePath, 'utf-8'));
        const files = ['rapidrail-daily-totals.json', 'brt-daily-totals.json', 'combined-daily-totals.json'];
        const fileStatus: Record<string, object> = {};
        for (const f of files) {
          const fp = `${DATA_DIR}/${f}`;
          fileStatus[f] = existsSync(fp)
            ? { exists: true, size_bytes: statSync(fp).size, mtime: statSync(fp).mtime.toISOString() }
            : { exists: false };
        }
        return Response.json({ ...state, files: fileStatus });
      } catch {
        return Response.json({ error: 'Invalid state file' }, { status: 500 });
      }
    }

    if (path === '/metadata') {
      const rrPath = `${DATA_DIR}/meta_rapidrail.json`;
      const brtPath = `${DATA_DIR}/meta_brt.json`;
      const result: Record<string, object> = {};
      for (const [name, fp] of [['rapidrail', rrPath], ['brt', brtPath]]) {
        if (existsSync(fp)) {
          try {
            const meta = JSON.parse(readFileSync(fp, 'utf-8'));
            result[name] = {
              data_as_of: meta.data_as_of,
              last_updated: meta.last_updated,
              exclude_openapi: meta.exclude_openapi,
              frequency: meta.frequency,
            };
          } catch { /* skip */ }
        }
      }
      return Response.json(result);
    }

    if (path === '/rapidrail-daily') return serveJson('rapidrail-daily-totals.json');
    if (path === '/brt-daily') return serveJson('brt-daily-totals.json');
    if (path === '/combined-daily') return serveJson('combined-daily-totals.json');

    return Response.json(
      {
        error: 'Not found',
        endpoints: ['/health', '/status', '/metadata', '/rapidrail-daily', '/brt-daily', '/combined-daily'],
      },
      { status: 404 }
    );
  },
});

console.log(`[dosm-server] Serving DOSM OD data on :${PORT}`);
console.log(`[dosm-server] Data dir: ${DATA_DIR}`);
console.log(`[dosm-server] Run sync.sh to refresh data`);

// Bun may exit when the event loop is idle. This timer prevents that.
setInterval(() => {}, 10_000);