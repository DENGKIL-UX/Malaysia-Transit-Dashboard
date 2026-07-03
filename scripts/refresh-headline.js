/**
 * Refresh headline-recent.json from the live data.gov.my API.
 * Used by GitHub Actions monthly cron and for manual refresh.
 *
 * Fetches the full headline dataset from 2024-01-01 to today,
 * deduplicates against the existing static file, and writes the merged result.
 *
 * Usage: bun run scripts/refresh-headline.js
 * Env:   HEADLINE_OUTPUT=path/to/headline-recent.json (default: public/headline-recent.json)
 */

const API_BASE = 'https://api.data.gov.my/data-catalogue';
const fs = await import('fs');
const path = await import('path');

const outputPath = process.env.HEADLINE_OUTPUT || 'public/headline-recent.json';
const START_DATE = '2024-01-01';
const today = new Date().toISOString().split('T')[0];

async function fetchHeadlinePage(dateStart: string, dateEnd: string): Promise<unknown[]> {
  const url = `${API_BASE}/?id=ridership_headline&date_start=${dateStart}@date&date_end=${dateEnd}@date`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Headline API returned ${res.status}`);
  return res.json() as Promise<unknown[]>;
}

async function main() {
  console.error(`Fetching headline data from ${START_DATE} to ${today}...`);

  // Fetch in 6-month chunks to keep response sizes manageable
  const chunks: unknown[][] = [];
  let cursor = START_DATE;

  while (cursor <= today) {
    const chunkEnd = new Date(cursor + 'T00:00:00');
    chunkEnd.setMonth(chunkEnd.getMonth() + 6);
    const chunkEndStr = chunkEnd.toISOString().split('T')[0];
    const effectiveEnd = chunkEndStr > today ? today : chunkEndStr;

    console.error(`  Fetching ${cursor} to ${effectiveEnd}...`);
    const rows = await fetchHeadlinePage(cursor, effectiveEnd);
    chunks.push(rows);
    cursor = effectiveEnd;

    // Move to next day to avoid infinite loop
    const next = new Date(cursor + 'T00:00:00');
    next.setDate(next.getDate() + 1);
    cursor = next.toISOString().split('T')[0];
  }

  // Merge and deduplicate by date
  const allRows = chunks.flat() as Array<{ date: string }>;
  const seen = new Map<string, unknown>();
  for (const row of allRows) {
    if (row.date) {
      seen.set(row.date, row);
    }
  }

  // Sort by date ascending
  const sorted = Array.from(seen.values()).sort((a, b) =>
    ((a as { date: string }).date).localeCompare((b as { date: string }).date)
  );

  // Write to output
  const outPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(sorted, null, 0));

  const first = (sorted[0] as { date: string })?.date ?? '?';
  const last = (sorted[sorted.length - 1] as { date: string })?.date ?? '?';
  console.error(`Done: ${sorted.length} rows, ${first} to ${last} → ${outPath}`);
}

main().catch((err) => {
  console.error('Headline refresh failed:', err);
  process.exit(1);
});