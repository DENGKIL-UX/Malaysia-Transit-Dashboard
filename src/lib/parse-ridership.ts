/**
 * Shared ridership row parser.
 *
 * Eliminates the duplicated field-mapping + total computation
 * that was previously inline in both use-ridership.ts and use-analytics.ts.
 *
 * All upstream data (headline API, comparison-data, local JSON) uses
 * snake_case field names. This parser normalizes them to camelCase.
 *
 * NULL SEMANTICS:
 *   When the upstream source does not have data for a field (e.g., MRT Kajang
 *   during the monthly headline audit gap), the value is `null` — NOT `0`.
 *   - `null` means "data not published yet" — the field is excluded from totals.
 *   - `0` means "genuinely zero ridership that day" (rare but possible for ETS etc.)
 *   - `total` and `totalRail` only sum non-null values, so they reflect
 *     "what we actually know" rather than "what we know + fabrications".
 */

export interface ParsedRidershipRow {
  date: string;
  mrtKajang: number | null;
  mrtPutrajaya: number | null;
  lrtKelanaJaya: number | null;
  lrtAmpang: number | null;
  monorail: number | null;
  komuter: number | null;
  ets: number | null;
  intercity: number | null;
  komuterUtara: number | null;
  tebrau: number | null;
  busKl: number | null;
  busKuantan: number | null;
  busRpn: number | null;
  /** Sum of all non-null service values (10 rail + bus where available). */
  total: number;
  /** Sum of all non-null rail service values. */
  totalRail: number;
  /** Count of services that have non-null data for this row. */
  servicesAvailable: number;
  /** Whether MRT Kajang data is missing (null) for this row. */
  kajangMissing: boolean;
}

/**
 * Safely parse a numeric field that may be null from upstream.
 * Returns `null` if the raw value is null/undefined, otherwise the number.
 */
function parseField(raw: Record<string, unknown>, key: string): number | null {
  const v = raw[key];
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/**
 * Parse a raw upstream row into a normalized ParsedRidershipRow.
 *
 * Handles missing fields gracefully: `null` stays as `null` (unavailable),
 * not converted to `0`. Totals only sum non-null values.
 *
 * Works with data.gov.my API format, local JSON, and comparison-data response.
 */
export function parseRidershipRow(
  r: Record<string, unknown>
): ParsedRidershipRow {
  const mrtKajang = parseField(r, 'rail_mrt_kajang');
  const mrtPutrajaya = parseField(r, 'rail_mrt_pjy');
  const lrtKelanaJaya = parseField(r, 'rail_lrt_kj');
  const lrtAmpang = parseField(r, 'rail_lrt_ampang');
  const monorail = parseField(r, 'rail_monorail');
  const komuter = parseField(r, 'rail_komuter');
  const ets = parseField(r, 'rail_ets');
  const intercity = parseField(r, 'rail_intercity');
  const komuterUtara = parseField(r, 'rail_komuter_utara');
  const tebrau = parseField(r, 'rail_tebrau');
  const busKl = parseField(r, 'bus_rkl');
  const busKuantan = parseField(r, 'bus_rkn');
  const busRpn = parseField(r, 'bus_rpn');

  // Count how many services have actual data
  const servicesAvailable = [
    mrtKajang, mrtPutrajaya, lrtKelanaJaya, lrtAmpang, monorail,
    komuter, ets, intercity, komuterUtara, tebrau,
    busKl, busKuantan, busRpn,
  ].filter((v) => v !== null).length;

  // Total = all non-null service values (10 rail + bus where available)
  const total = [
    mrtKajang, mrtPutrajaya, lrtKelanaJaya, lrtAmpang, monorail,
    komuter, ets, intercity, komuterUtara, tebrau,
    busKl, busKuantan, busRpn,
  ].reduce((sum, v) => sum + (v ?? 0), 0);

  // Total Rail = non-null rail services only
  const totalRail = [
    mrtKajang, mrtPutrajaya, lrtKelanaJaya, lrtAmpang, monorail,
    komuter, ets, intercity, komuterUtara, tebrau,
  ].reduce((sum, v) => sum + (v ?? 0), 0);

  return {
    date: r.date as string,
    mrtKajang,
    mrtPutrajaya,
    lrtKelanaJaya,
    lrtAmpang,
    monorail,
    komuter,
    ets,
    intercity,
    komuterUtara,
    tebrau,
    busKl,
    busKuantan,
    busRpn,
    total,
    totalRail,
    servicesAvailable,
    kajangMissing: mrtKajang === null,
  };
}

/**
 * Format a ridership value for display.
 * Returns "—" for null (unavailable) values, otherwise a formatted number.
 */
export function formatRidershipValue(value: number | null, compact = false): string {
  if (value === null) return '—';
  if (compact) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString();
}