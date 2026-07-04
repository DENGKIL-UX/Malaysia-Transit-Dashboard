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
  mrtPutrajaya: number;
  lrtKelanaJaya: number;
  lrtAmpang: number;
  monorail: number;
  komuter: number;
  ets: number;
  intercity: number;
  komuterUtara: number;
  tebrau: number;
  busKl: number;
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
  const mrtPutrajaya = parseField(r, 'rail_mrt_pjy') ?? 0;
  const lrtKelanaJaya = parseField(r, 'rail_lrt_kj') ?? 0;
  const lrtAmpang = parseField(r, 'rail_lrt_ampang') ?? 0;
  const monorail = parseField(r, 'rail_monorail') ?? 0;
  const komuter = parseField(r, 'rail_komuter') ?? 0;
  const ets = parseField(r, 'rail_ets') ?? 0;
  const intercity = parseField(r, 'rail_intercity') ?? 0;
  const komuterUtara = parseField(r, 'rail_komuter_utara') ?? 0;
  const tebrau = parseField(r, 'rail_tebrau') ?? 0;
  const busKl = parseField(r, 'bus_rkl') ?? 0;
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