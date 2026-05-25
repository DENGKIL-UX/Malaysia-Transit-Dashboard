/**
 * Transit Data Microservice
 * Port: 3020
 *
 * Serves pre-computed JSON from data.gov.my explorer parquets.
 * Run process_parquet.py separately to refresh data.
 *
 * Endpoints:
 *   /                    → Prasarana daily per-line totals
 *   /prasarana-stations  → Prasarana top 20 stations + daily series
 *   /prasarana-routes    → Prasarana top 20 O-D routes
 *   /ktmb-daily          → KTMB daily per-service totals
 *   /ktmb-stations       → KTMB top 20 stations + daily series
 *   /ktmb-routes         → KTMB top 20 O-D routes
 *   /health              → Service health check
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';

const JSON_DIR = '/tmp';

const files: Record<string, string> = {
  '/': 'prasarana_daily.json',
  '/prasarana-stations': 'prasarana_stations.json',
  '/prasarana-routes': 'prasarana_callout.json',
  '/ktmb-daily': 'ktmb_daily.json',
  '/ktmb-stations': 'ktmb_stations.json',
  '/ktmb-routes': 'ktmb_callout.json',
};

const cache: Record<string, { data: unknown; mtime: number }> = {};

function loadFile(name: string): unknown | null {
  const path = `${JSON_DIR}/${name}`;
  if (!existsSync(path)) return null;
  const mtime = statSync(path).mtimeMs;
  const cached = cache[name];
  if (cached && cached.mtime === mtime) return cached.data;
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  cache[name] = { data, mtime };
  return data;
}

const server = Bun.serve({
  port: 3020,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/health') {
      const routes = Object.entries(files).map(([route, file]) => ({
        route,
        file,
        exists: existsSync(`${JSON_DIR}/${file}`),
      }));
      return Response.json({ status: 'ok', uptime_sec: Math.round(process.uptime()), routes });
    }

    const fileName = files[path];
    if (!fileName) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const data = loadFile(fileName);
    if (!data) {
      return Response.json({ error: 'Data not ready', file: fileName }, { status: 503 });
    }

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  },
});

console.log(`Transit data service on :${server.port}, ${Object.keys(files).length} endpoints`);
