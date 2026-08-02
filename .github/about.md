# About — Malaysia Transit Dashboard

> Daily ridership analytics for Malaysia's public transit network, built on open
> data from the **Department of Statistics Malaysia (DOSM)** via **data.gov.my**.

A live, mobile-first dashboard visualizing **daily passenger ridership** across
every major rail and bus mode in the Klang Valley and nationwide — MRT, LRT,
monorail, KTM commuter + intercity, ETS, Rapid Bus, and BRT Sunway. Updated
daily from audited headline figures and origin–destination (OD) parquet batches.

---

## Search keywords / topics

These keywords are mirrored to the GitHub **About** field and repository
**Topics** so the project is discoverable for transit, open-data, and
government-analytics searches:

`malaysia` `kuala-lumpur` `klang-valley` `selangor` `transit` `public-transport`
`ridership` `ridership-data` `mrt` `lrt` `monorail` `ktm-komuter` `ets`
`intercity` `rapidkl` `rapid-rail` `rapid-bus` `brt-sunway` `lrt3-shah-alam`
`data-gov-my` `dosm` `open-data` `origin-destination` `parquet` `nextjs`
`dashboard` `data-visualization` `analytics`

---

## Coverage (14 audited services + BRT)

| Mode | Service | Source key | Status |
| --- | --- | --- | --- |
| MRT | Kajang Line (SBK — Sungai Buloh–Kajang) | `rail_mrt_kajang` | Live |
| MRT | Putrajaya Line (SSP) | `rail_mrt_pjy` | Live |
| LRT | Kelana Jaya Line | `rail_lrt_kj` | Live |
| LRT | Ampang / Sri Petaling Line | `rail_lrt_ampang` | Live |
| Rail | KL Monorail | `rail_monorail` | Live |
| KTM | Komuter | `rail_komuter` | Live |
| KTM | ETS | `rail_ets` | Live |
| KTM | Intercity | `rail_intercity` | Live |
| KTM | Komuter Utara | `rail_komuter_utara` | Live |
| KTM | Shuttle Tebrau (JB ↔ Woodlands) | `rail_tebrau` | Live |
| Bus | RapidKL Bus (Kuala Lumpur) | `bus_rkl` | Live |
| Bus | Rapid Bus Penang | `bus_rpn` | Live |
| Bus | Rapid Bus Kuantan | `bus_rkn` | Discontinued (shown `null` after last real value) |
| Bus | BRT Sunway Line | `brt` | Live (OD source) |
| LRT | LRT3 Shah Alam (future) | — | Not yet published by DOSM (rendered `null`) |

> **LRT3 Shah Alam** is not yet present in the DOSM `ridership_headline` dataset
> or the OD parquet. The dashboard reserves the key and correctly renders `null`
> until the series is published — it never fabricates a zero.

---

## Data sources & pipelines

Three independent pipelines are merged to maximize freshness without sacrificing
audit integrity:

1. **Headline (monthly, audited)** — `ridership_headline` from data.gov.my.
   All 13 rail + bus services. Published ~12 days after month-end following
   audit. Used by KPI cards, line breakdown, and the comparison chart.
2. **KTMB Daily (daily batch, parquet)** — 5 KTM rail services + 158 stations.
   Origin–destination parquet from data.gov.my. Used by the KTMB weekly chart,
   busiest-stations, and top-routes views.
3. **Prasarana Daily (daily batch, parquet)** — 5 Rapid Rail lines + BRT Sunway +
   150+ stations. OD parquet from data.gov.my. Used by the Rapid Rail weekly
   chart, busiest-stations, and top-routes views.

All data is © Department of Statistics Malaysia, licensed **CC-BY 4.0**, and
served via the official [data.gov.my](https://data.gov.my) open-data portal.

---

## Methodology & data integrity

- **OD origin-sum ≠ audited headline.** Rapid Rail values derived from the OD
  parquet are *origin-sums* (total boardings, including transfers) and differ
  from audited line totals by roughly **0.69×–1.74×** across lines. OD-sourced
  figures are tagged `od_source: true` so consumers never mistake them for
  audited numbers.
- **Null, not zero, for unpublished dates.** When a pipeline hasn't published a
  given date yet (e.g., OD lagging KTMB over a weekend/holiday), the dashboard
  uses `null` rather than `0`. Zero would falsely claim "nobody rode"; `null`
  means "not published yet" and renders as a gap (`—`) with a tooltip
  *"Not published by data.gov.my for this date"*.
- **Discontinued series normalized.** `bus_rkn` (Rapid Bus Kuantan) audit zeros
  after the last real reading are normalized back to `null` so charts don't
  show a misleading drop to zero.
- **Holiday classification.** Scoped to Selangor + KL Federal Territory
  (RapidKL operational area). Federal + state holidays with Sunday→Monday
  replacement (*cuti ganti*). Islamic festival dates follow *rukyah* (moon
  sighting) and are flagged ⚠ pending official confirmation. Falls back to
  weekend-detection only when calendar APIs are unavailable.

---

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Recharts · Radix UI ·
date-fns · Lucide Icons · Python + Pandas (parquet processing) · Cloudflare
(OpenNext) for edge deployment · PWA (installable, offline-capable).

---

## Suggested GitHub **About** field (≤ 350 chars)

```
Daily Malaysia public-transit ridership dashboard: MRT (SBK/SSP), LRT Kelana Jaya & Ampang, Monorail, KTM Komuter/ETS/Intercity, Rapid Bus, BRT Sunway. Open data from DOSM via data.gov.my. Built with Next.js. LRT3 Shah Alam reserved (pending publication).
```
