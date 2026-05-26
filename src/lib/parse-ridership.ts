/**
 * Shared ridership row parser.
 *
 * Eliminates the duplicated field-mapping + total computation
 * that was previously inline in both use-ridership.ts and use-analytics.ts.
 *
 * All upstream data (headline API, comparison-data, local JSON) uses
 * snake_case field names. This parser normalizes them to camelCase.
 */

export interface ParsedRidershipRow {
  date: string;
  mrtKajang: number;
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
  busKuantan: number;
  busRpn: number;
  total: number;
  totalRail: number;
}

/**
 * Parse a raw upstream row into a normalized ParsedRidershipRow.
 *
 * Handles missing fields gracefully (defaults to 0).
 * Works with data.gov.my API format, local JSON, and comparison-data response.
 */
export function parseRidershipRow(
  r: Record<string, unknown>
): ParsedRidershipRow {
  const mrtKajang = Number(r['rail_mrt_kajang'] ?? 0);
  const mrtPutrajaya = Number(r['rail_mrt_pjy'] ?? 0);
  const lrtKelanaJaya = Number(r['rail_lrt_kj'] ?? 0);
  const lrtAmpang = Number(r['rail_lrt_ampang'] ?? 0);
  const monorail = Number(r['rail_monorail'] ?? 0);
  const komuter = Number(r['rail_komuter'] ?? 0);
  const ets = Number(r['rail_ets'] ?? 0);
  const intercity = Number(r['rail_intercity'] ?? 0);
  const komuterUtara = Number(r['rail_komuter_utara'] ?? 0);
  const tebrau = Number(r['rail_tebrau'] ?? 0);
  const busKl = Number(r['bus_rkl'] ?? 0);
  const busKuantan = Number(r['bus_rkn'] ?? 0);
  const busRpn = Number(r['bus_rpn'] ?? 0);

  // Total = all 14 services (10 rail + 4 bus)
  const total =
    mrtKajang +
    mrtPutrajaya +
    lrtKelanaJaya +
    lrtAmpang +
    monorail +
    komuter +
    ets +
    intercity +
    komuterUtara +
    tebrau +
    busKl +
    busKuantan +
    busRpn;

  // Total Rail = 10 rail services only (used for chart alignment)
  const totalRail =
    mrtKajang +
    mrtPutrajaya +
    lrtKelanaJaya +
    lrtAmpang +
    monorail +
    komuter +
    ets +
    intercity +
    komuterUtara +
    tebrau;

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
  };
}
