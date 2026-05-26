/**
 * Pre-compute holiday classifications at build time.
 * Generates static JSON files for each year so the Worker
 * can serve holidays at 0ms CPU (no MyCal/Nager fetch).
 *
 * Usage: node scripts/build-holidays.js [--year 2026]
 *
 * The holidays route still runs at runtime for dynamic "today" blackout info,
 * but it reads the static file instead of fetching upstream APIs.
 */

const fs = require('fs');
const path = require('path');

const MAJOR_KEYWORDS = [
  'hari raya', 'chinese new year', 'deepavali', 'christmas', 'eid',
];

async function fetchMyCal(year, state) {
  const res = await fetch(
    `https://mycal-api.huijun00100101.workers.dev/v1/holidays?year=${year}&state=${state}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`MyCal ${res.status}`);
  return res.json();
}

async function fetchNager(year) {
  const res = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/MY`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`Nager ${res.status}`);
  return res.json();
}

function buildClassificationsFromMyCal(data) {
  const holidayMap = new Map();
  for (const h of data.data) {
    holidayMap.set(h.date, {
      name: h.name.en,
      localName: h.name.ms,
      status: h.status,
      type: h.type,
    });
  }

  const year = new Date(data.data[0]?.date || `${new Date().getFullYear()}-01-01`).getFullYear();
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const result = [];
  const holidays = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const day = d.getDay();
    const holiday = holidayMap.get(dateStr);

    if (holiday) {
      const isIslamicEstimated =
        (holiday.type === 'religious' || holiday.type === 'national') &&
        holiday.status !== 'confirmed';
      const confidence =
        holiday.status === 'confirmed'
          ? 'high'
          : isIslamicEstimated
            ? 'low'
            : 'medium';

      holidays.push({
        date: dateStr,
        name: holiday.name,
        localName: holiday.localName,
        scope: holiday.type === 'state' ? 'selangor' : 'national',
        confirmed: holiday.status === 'confirmed',
        isReplacement: false,
        isMajor: MAJOR_KEYWORDS.some((m) =>
          holiday.name.toLowerCase().includes(m)
        ),
      });

      result.push({
        date: dateStr,
        day_type: 'holiday',
        is_public_holiday: true,
        holiday_name: holiday.name,
        confidence,
        warnings: isIslamicEstimated
          ? ['Islamic date not yet confirmed by rukyah']
          : [],
      });
    } else if (day === 0 || day === 6) {
      result.push({
        date: dateStr,
        day_type: 'weekend',
        is_public_holiday: false,
        confidence: 'high',
        warnings: [],
      });
    } else if (day === 5) {
      result.push({
        date: dateStr,
        day_type: 'friday',
        is_public_holiday: false,
        confidence: 'high',
        warnings: [],
      });
    } else {
      result.push({
        date: dateStr,
        day_type: 'weekday',
        is_public_holiday: false,
        confidence: 'high',
        warnings: [],
      });
    }
  }

  return { classifications: result, holidays, source: 'mycal' };
}

function buildClassificationsFromNager(data) {
  const SELANGOR_CODES = ['SGR', 'KUL', 'LBN', 'PJY'];
  const holidaySet = new Set();
  const holidayNames = new Map();
  const holidays = [];

  for (const h of data) {
    const include = h.global || h.counties?.some((c) => SELANGOR_CODES.includes(c));
    if (!include) continue;

    holidaySet.add(h.date);
    const scope = h.global ? 'national' : (h.counties?.includes('SGR') ? 'selangor' : 'ft');
    holidayNames.set(h.date, { name: h.name, localName: h.localName, scope });
    holidays.push({
      date: h.date,
      name: h.name,
      localName: h.localName,
      scope,
      confirmed: true,
      isReplacement: false,
      isMajor: MAJOR_KEYWORDS.some((m) => h.name.toLowerCase().includes(m)),
    });
  }

  const year = new Date(data[0]?.date || `${new Date().getFullYear()}-01-01`).getFullYear();
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const result = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const day = d.getDay();
    const isHol = holidaySet.has(dateStr);

    if (isHol) {
      const info = holidayNames.get(dateStr);
      result.push({
        date: dateStr,
        day_type: 'holiday',
        is_public_holiday: true,
        holiday_name: info?.name,
        confidence: 'medium',
        warnings: ['Sourced from Nager.Date — limited accuracy for Islamic dates'],
      });
    } else if (day === 0 || day === 6) {
      result.push({ date: dateStr, day_type: 'weekend', is_public_holiday: false, confidence: 'high', warnings: [] });
    } else if (day === 5) {
      result.push({ date: dateStr, day_type: 'friday', is_public_holiday: false, confidence: 'high', warnings: [] });
    } else {
      result.push({ date: dateStr, day_type: 'weekday', is_public_holiday: false, confidence: 'high', warnings: [] });
    }
  }

  return { classifications: result, holidays, source: 'nager' };
}

function fallbackClassifications(year) {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const result = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const day = d.getDay();

    if (day === 0 || day === 6) {
      result.push({ date: dateStr, day_type: 'weekend', is_public_holiday: false, confidence: 'unverified', warnings: [] });
    } else if (day === 5) {
      result.push({ date: dateStr, day_type: 'friday', is_public_holiday: false, confidence: 'unverified', warnings: [] });
    } else {
      result.push({ date: dateStr, day_type: 'weekday', is_public_holiday: false, confidence: 'unverified', warnings: [] });
    }
  }

  return { classifications: result, holidays: [], source: 'fallback' };
}

async function buildYear(year, state) {
  console.log(`  Building ${year} (${state})...`);

  // Try MyCal first, then Nager, then fallback
  let data;
  try {
    const mycal = await fetchMyCal(year, state);
    data = buildClassificationsFromMyCal(mycal);
    console.log(`  ✓ MyCal: ${data.classifications.length} days, ${data.holidays.length} holidays`);
  } catch (e) {
    console.log(`  ⚠ MyCal failed: ${e.message}`);
    try {
      const nager = await fetchNager(year);
      data = buildClassificationsFromNager(nager);
      console.log(`  ✓ Nager: ${data.classifications.length} days, ${data.holidays.length} holidays`);
    } catch (e2) {
      console.log(`  ⚠ Nager failed: ${e2.message}`);
      data = fallbackClassifications(year);
      console.log(`  ✓ Fallback: ${data.classifications.length} days (weekend detection only)`);
    }
  }

  const output = {
    year,
    state,
    generatedAt: new Date().toISOString(),
    source: data.source,
    totalDays: data.classifications.length,
    holidays: data.holidays.length,
    classifications: data.classifications,
  };

  const outPath = path.join(__dirname, '..', 'public', `holidays-${year}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`  → Written to ${outPath}`);

  return output;
}

async function main() {
  const args = process.argv.slice(2);
  const currentYear = new Date().getFullYear();
  const years = [];

  // Parse --year flag
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--year' && args[i + 1]) {
      years.push(parseInt(args[i + 1]));
      i++;
    }
  }

  // Default: current year + next year
  if (years.length === 0) {
    years.push(currentYear, currentYear + 1);
  }

  console.log('🏨 Building holiday classifications...\n');

  for (const year of years) {
    await buildYear(year, 'selangor');
  }

  console.log('\n✅ Done. Holiday files are in public/holidays-{YEAR}.json');
  console.log('   The holidays API route will serve these statically at 0ms CPU.');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
