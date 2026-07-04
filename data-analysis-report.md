# Malaysia Transit Ridership Data Source Analysis

**Date of Analysis:** 2026-05-26
**Repository:** [data-gov-my/datagovmy-meta](https://github.com/data-gov-my/datagovmy-meta)
**Analyst:** Automated data landscape scan

---

## 1. Executive Summary

The data.gov.my platform exposes **11 distinct data sources** covering Malaysia's public transit ridership, split across two operators (**Prasarana** for Klang Valley rail/bus, **KTMB** for national rail). Data is available in two tiers: **headline/aggregated** (small, API-friendly) and **origin-destination (OD) granular** (large, parquet-only, no API). Two **explorer dashboards** provide pre-computed timeseries tables.

**Key finding:** The `ridership_headline` dataset (updated monthly with audit) covers ALL services including MRT Kajang/Putrajaya from 2020-2023, but has a ~2-month lag. The KTMB daily dataset is more current (daily updates, data through 2026-05-25) but only covers KTMB services. For comprehensive Prasarana daily data beyond the headline totals, you must use the OD datasets or the explorer parquet files.

---

## 2. Dataset Inventory Table

| # | Dataset ID | Title | Operator | Data Range | Granularity | Fields | API Available | Last Updated |
|---|-----------|-------|----------|------------|-------------|--------|---------------|-------------|
| 1 | `ridership_headline` | Daily Public Transport Ridership | Prasarana + KTMB | 2020 - 2023 | Daily (per-service columns) | date, bus_rkl, bus_rkn, bus_rpn, rail_lrt_ampang, rail_lrt_kj, rail_monorail, rail_mrt_kajang, rail_mrt_pjy, rail_ets, rail_intercity, rail_komuter, rail_komuter_utara, rail_tebrau (14 fields) | **YES** | 2026-05-12 (monthly lag) |
| 2 | `ridership_ktmb_daily` | Daily KTMB Ridership | KTMB | 2020 - 2025 | Daily (per-service rows) | date, service, ridership (3 fields) | **YES** | 2026-05-26 (daily) |
| 3 | `ridership_od_rapidrail_daily` | Daily OD: Rapid Rail (KV) | Prasarana | 2023 - 2026 | Daily OD pairs | date, origin, destination, ridership (4 fields) | NO (too large) | 2026-05-26 |
| 4 | `ridership_od_brt_daily` | Daily OD: BRT Sunway Line | Prasarana | 2023 - 2026 | Daily OD pairs | date, origin, destination, ridership (4 fields) | NO (too large) | 2026-05-26 |
| 5 | `ridership_od_ets` | Hourly OD: ETS | KTMB | 2020 - 2025 | Hourly OD pairs | date, time, origin, destination, ridership (5 fields) | NO (too large) | 2026-05-26 |
| 6 | `ridership_od_intercity` | Hourly OD: Intercity | KTMB | 2020 - 2025 | Hourly OD pairs | date, time, origin, destination, ridership (5 fields) | NO (too large) | 2026-05-26 |
| 7 | `ridership_od_komuter` | Hourly OD: Komuter | KTMB | 2023 - 2025 | Hourly OD pairs | date, time, origin, destination, ridership (5 fields) | NO (too large) | 2026-05-26 |
| 8 | `ridership_od_komuter_utara` | Hourly OD: Komuter Utara | KTMB | 2020 - 2025 | Hourly OD pairs | date, time, origin, destination, ridership (5 fields) | NO (too large) | 2026-05-26 |
| 9 | `ridership_od_shuttle_tebrau` | Hourly OD: Shuttle Tebrau | KTMB | 2022 - 2025 | Hourly OD pairs | date, time, origin, destination, ridership (5 fields) | NO (too large) | 2026-05-26 |
| 10 | `explorer_prasarana` | Prasarana Explorer Timeseries | Prasarana | N/A (built from OD) | Pre-computed dashboard tables | Unknown (parquet) | N/A | 2026-05-26 |
| 11 | `explorer_ktmb` | KTMB Explorer Timeseries | KTMB | N/A (built from OD) | Pre-computed dashboard tables | Unknown (parquet) | N/A | 2026-05-26 |

---

## 3. Detailed File Analysis

### 3.1 ridership_headline.json

- **Title:** Daily Public Transport Ridership
- **Description:** Daily-frequency ridership for ALL major public transport services (Prasarana rail + bus + KTMB rail)
- **Structure:** Wide-format time series. One row per date, one column per service.
- **Columns (14 total):**
  - `date` (Date, YYYY-MM-DD)
  - `bus_rkl` - Rapid Bus (KL)
  - `bus_rkn` - Rapid Bus (Kuantan)
  - `bus_rpn` - Rapid Bus (Penang)
  - `rail_lrt_ampang` - LRT Ampang Line
  - `rail_lrt_kj` - LRT Kelana Jaya Line
  - `rail_monorail` - Monorail Line
  - `rail_mrt_kajang` - MRT Kajang Line
  - `rail_mrt_pjy` - MRT Putrajaya Line
  - `rail_ets` - KTMB ETS
  - `rail_intercity` - KTM Intercity
  - `rail_komuter` - KTM Komuter
  - `rail_komuter_utara` - KTM Komuter Utara
  - `rail_tebrau` - KTM Shuttle Tebrau
- **Date Range:** `dataset_begin: 2020` to `dataset_end: 2023` (~1,460+ rows)
- **Data As Of:** 2026-04-30 23:59
- **Update Frequency:** Monthly (despite "DAILY" label, updated monthly due to audit process)
- **Data Sources:** Prasarana, MOT
- **Parquet:** `https://storage.data.gov.my/transportation/ridership_headline.parquet`
- **CSV:** `https://storage.data.gov.my/transportation/ridership_headline.csv`
- **OpenAPI:** YES (`exclude_openapi: false`)
- **Caveat:** Numbers are "trips, NOT unique individuals". Prasarana totals cannot be derived from OD data due to interchange complexities. KTMB totals are directly from OD data.
- **Dataviz:** 14 timeseries charts (one per service) + table

### 3.2 ridership_ktmb_daily.json

- **Title:** Daily KTMB Ridership
- **Description:** Daily ridership for the 5 main KTMB services (Komuter, Komuter Utara, Intercity, ETS, Shuttle Tebrau)
- **Structure:** Long-format time series. One row per date + service combination.
- **Columns (3 total):**
  - `date` (Date, YYYY-MM-DD)
  - `service` (String: `komuter`, `komuter-utara`, `intercity`, `ets`, `shuttle-tebrau`)
  - `ridership` (Integer)
- **Date Range:** `dataset_begin: 2020` to `dataset_end: 2025` (~6,500+ rows across 5 services)
- **Data As Of:** 2026-05-25 23:59
- **Update Frequency:** Daily (updated daily at 03:31 MYT, next update 03:45)
- **Data Sources:** KTMB, MOT
- **Parquet:** `https://storage.data.gov.my/transportation/ktmb/ridership_ktmb_daily.parquet`
- **CSV:** `https://storage.data.gov.my/transportation/ktmb/ridership_ktmb_daily.csv`
- **Preview:** `https://storage.data.gov.my/transportation/ktmb/ridership_ktmb_daily_preview.parquet` (most recent 1 year)
- **OpenAPI:** YES (`exclude_openapi: false`)

### 3.3 ridership_od_rapidrail_daily.json

- **Title:** Daily Origin-Destination Ridership: Rapid Rail (KV)
- **Description:** Daily OD ridership covering entire Rapid Rail network in Klang Valley (LRT, MRT, Monorail - all lines combined)
- **Structure:** OD pair records. One row per date + origin + destination.
- **Columns (4 total):**
  - `date` (Date, YYYY-MM-DD)
  - `origin` (String, station name)
  - `destination` (String, station name)
  - `ridership` (Integer)
- **Date Range:** `dataset_begin: 2023` to `dataset_end: 2026`
- **Editions:** 2023, 2024, 2025, 2026 (yearly parquet files)
- **Data As Of:** 2026-05-24 23:59
- **Update Frequency:** Daily (at 06:46 MYT, next update 22:00)
- **Data Sources:** Prasarana, MOT
- **Parquet:** `https://storage.data.gov.my/transportation/rail/rapidrail_YYYY-MM-DD_daily.parquet` (yearly editions)
- **CSV:** `https://storage.data.gov.my/transportation/rail/rapidrail_YYYY-MM-DD_daily.csv`
- **Preview:** `https://storage.data.gov.my/transportation/rail/rapidrail_daily_preview.parquet`
- **OpenAPI:** NO (`exclude_openapi: true`) - exceeds Excel row limit
- **Size Warning:** Each yearly edition exceeds 1,048,576 rows (Excel limit)

### 3.4 ridership_od_brt_daily.json

- **Title:** Daily Origin-Destination Ridership: BRT Sunway Line
- **Description:** Daily OD ridership for all 7 stops on the BRT Sunway Line
- **Structure:** OD pair records. One row per date + origin + destination.
- **Columns (4 total):**
  - `date` (Date, YYYY-MM-DD)
  - `origin` (String)
  - `destination` (String)
  - `ridership` (Integer)
- **Date Range:** `dataset_begin: 2023` to `dataset_end: 2026`
- **Editions:** 2023, 2024, 2025, 2026
- **Data As Of:** 2026-05-24 23:59
- **Update Frequency:** Daily
- **Data Sources:** Prasarana, MOT
- **Parquet:** `https://storage.data.gov.my/transportation/bus/brt_YYYY-MM-DD_daily.parquet`
- **CSV:** `https://storage.data.gov.my/transportation/bus/brt_YYYY-MM-DD_daily.csv`
- **Preview:** `https://storage.data.gov.my/transportation/bus/brt_daily_preview.parquet`
- **OpenAPI:** NO

### 3.5 ridership_od_ets.json

- **Title:** Hourly Origin-Destination Ridership: ETS
- **Description:** Hourly OD ridership for ETS service. Single source of truth for all ETS ridership data.
- **Structure:** OD pair records at hourly granularity. One row per date + time + origin + destination.
- **Columns (5 total):**
  - `date` (Date, YYYY-MM-DD)
  - `time` (String, HH:00 format - hour of transaction)
  - `origin` (String, station name)
  - `destination` (String, station name)
  - `ridership` (Integer)
- **Date Range:** `dataset_begin: 2020` to `dataset_end: 2025`
- **Editions:** 2020, 2021, 2022, 2023, 2024, 2025, 2026
- **Data As Of:** 2026-05-25 23:59
- **Update Frequency:** Daily
- **Data Sources:** KTMB, MOT
- **Parquet:** `https://storage.data.gov.my/transportation/ktmb/ets_YYYY-MM-DD.parquet`
- **CSV:** `https://storage.data.gov.my/transportation/ktmb/ets_YYYY-MM-DD.csv`
- **Preview:** `https://storage.data.gov.my/transportation/ktmb/ets_preview.parquet`
- **OpenAPI:** NO

### 3.6 ridership_od_intercity.json

- **Title:** Hourly Origin-Destination Ridership: Intercity
- **Description:** Hourly OD ridership for Intercity service. Single source of truth.
- **Structure:** Same as ETS (hourly OD pairs)
- **Columns (5 total):** date, time, origin, destination, ridership
- **Date Range:** `dataset_begin: 2020` to `dataset_end: 2025`
- **Editions:** 2020, 2021, 2022, 2023, 2024, 2025, 2026
- **Data As Of:** 2026-05-25 23:59
- **Parquet:** `https://storage.data.gov.my/transportation/ktmb/intercity_YYYY-MM-DD.parquet`
- **OpenAPI:** NO

### 3.7 ridership_od_komuter.json

- **Title:** Hourly Origin-Destination Ridership: Komuter
- **Description:** Hourly OD ridership for Komuter service. Single source of truth.
- **Structure:** Same as ETS (hourly OD pairs)
- **Columns (5 total):** date, time, origin, destination, ridership
- **Date Range:** `dataset_begin: 2023` to `dataset_end: 2025` (shorter history than ETS/Intercity)
- **Editions:** 2023, 2024, 2025, 2026
- **Data As Of:** 2026-05-25 23:59
- **Parquet:** `https://storage.data.gov.my/transportation/ktmb/komuter_YYYY-MM-DD.parquet`
- **OpenAPI:** NO
- **Caveat:** Exceeds Excel row limit since 2023

### 3.8 ridership_od_komuter_utara.json

- **Title:** Hourly Origin-Destination Ridership: Komuter Utara
- **Description:** Hourly OD ridership for Komuter Utara service. Single source of truth.
- **Structure:** Same as ETS (hourly OD pairs)
- **Columns (5 total):** date, time, origin, destination, ridership
- **Date Range:** `dataset_begin: 2020` to `dataset_end: 2025`
- **Editions:** 2020, 2021, 2022, 2023, 2024, 2025, 2026
- **Data As Of:** 2026-05-25 23:59
- **Parquet:** `https://storage.data.gov.my/transportation/ktmb/komuter_utara_YYYY-MM-DD.parquet`
- **OpenAPI:** NO

### 3.9 ridership_od_shuttle_tebrau.json

- **Title:** Hourly Origin-Destination Ridership: Shuttle Tebrau
- **Description:** Hourly OD ridership for Shuttle Tebrau service. Single source of truth.
- **Structure:** Same as ETS (hourly OD pairs)
- **Columns (5 total):** date, time, origin, destination, ridership
- **Date Range:** `dataset_begin: 2022` to `dataset_end: 2025`
- **Editions:** 2022, 2023, 2024, 2025, 2026
- **Data As Of:** 2026-05-25 23:59
- **Parquet:** `https://storage.data.gov.my/transportation/ktmb/shuttle_tebrau_YYYY-MM-DD.parquet`
- **OpenAPI:** NO

### 3.10 Explorer: prasarana.json

- **Explorer Name:** Prasarana
- **Route:** `/dashboard/rapid-explorer`
- **Tables:**
  - `PrasaranaTimeseries`: `https://storage.data.gov.my/dashboards/prasarana_timeseries.parquet` (data as of 2026-05-24)
  - `PrasaranaTimeseriesCallout`: `https://storage.data.gov.my/dashboards/prasarana_timeseries_callout.parquet` (data as of 2026-05-24)
- **Update Strategy:** REBUILD (full rebuild on each update)
- **Update Schedule:** Daily at ~02:39 MYT, next update 22:00
- **Purpose:** Pre-computed timeseries data for the Rapid Rail explorer dashboard. Likely contains per-line daily totals (derived from OD data).

### 3.11 Explorer: ktmb.json

- **Explorer Name:** KTMB
- **Route:** `/dashboard/ktmb-explorer`
- **Tables:**
  - `KTMBTimeseries`: `https://storage.data.gov.my/dashboards/ktmb_timeseries.parquet` (data as of 2026-05-25)
  - `KTMBTimeseriesCallout`: `https://storage.data.gov.my/dashboards/ktmb_timeseries_callout.parquet` (data as of 2026-05-25)
- **Update Strategy:** REBUILD
- **Update Schedule:** Daily at ~03:30 MYT
- **Purpose:** Pre-computed timeseries data for the KTMB explorer dashboard. Likely contains per-service daily totals.

---

## 4. Data Source / API Endpoints

### 4.1 OpenAPI-Accessible Endpoints (2 datasets)

These datasets are available via the data.gov.my OpenAPI:

| Dataset | API Path | Method |
|---------|----------|--------|
| ridership_headline | `https://api.data.gov.my/data-catalogue/ridership_headline` | GET |
| ridership_ktmb_daily | `https://api.data.gov.my/data-catalogue/ridership_ktmb_daily` | GET |

### 4.2 Direct Parquet/CSV Downloads (all datasets)

| Dataset | Parquet URL | CSV URL |
|---------|-------------|---------|
| Headline | `https://storage.data.gov.my/transportation/ridership_headline.parquet` | `.csv` |
| KTMB Daily | `https://storage.data.gov.my/transportation/ktmb/ridership_ktmb_daily.parquet` | `.csv` |
| Rapid Rail OD | `https://storage.data.gov.my/transportation/rail/rapidrail_YYYY-MM-DD_daily.parquet` (yearly editions) | `.csv` |
| BRT OD | `https://storage.data.gov.my/transportation/bus/brt_YYYY-MM-DD_daily.parquet` | `.csv` |
| ETS OD | `https://storage.data.gov.my/transportation/ktmb/ets_YYYY-MM-DD.parquet` (yearly editions) | `.csv` |
| Intercity OD | `https://storage.data.gov.my/transportation/ktmb/intercity_YYYY-MM-DD.parquet` | `.csv` |
| Komuter OD | `https://storage.data.gov.my/transportation/ktmb/komuter_YYYY-MM-DD.parquet` | `.csv` |
| Komuter Utara OD | `https://storage.data.gov.my/transportation/ktmb/komuter_utara_YYYY-MM-DD.parquet` | `.csv` |
| Shuttle Tebrau OD | `https://storage.data.gov.my/transportation/ktmb/shuttle_tebrau_YYYY-MM-DD.parquet` | `.csv` |

### 4.3 Explorer Dashboard Tables

| Explorer | Table | URL |
|----------|-------|-----|
| Prasarana | Timeseries | `https://storage.data.gov.my/dashboards/prasarana_timeseries.parquet` |
| Prasarana | Callout | `https://storage.data.gov.my/dashboards/prasarana_timeseries_callout.parquet` |
| KTMB | Timeseries | `https://storage.data.gov.my/dashboards/ktmb_timeseries.parquet` |
| KTMB | Callout | `https://storage.data.gov.my/dashboards/ktmb_timeseries_callout.parquet` |

---

## 5. Data Overlap & Uniqueness Analysis

### 5.1 Overlapping Data (same service, different granularity)

| Service | Headline (Dataset #1) | Aggregated (Dataset #2) | OD Granular |
|---------|----------------------|------------------------|-------------|
| **KTM Komuter** | Total per day (column) | Total per day (row) | Hourly OD pairs (#7) |
| **KTM Komuter Utara** | Total per day (column) | Total per day (row) | Hourly OD pairs (#8) |
| **KTM Intercity** | Total per day (column) | Total per day (row) | Hourly OD pairs (#6) |
| **KTM ETS** | Total per day (column) | Total per day (row) | Hourly OD pairs (#5) |
| **KTM Shuttle Tebrau** | Total per day (column) | Total per day (row) | Hourly OD pairs (#9) |
| **Rapid Rail (all)** | Line-level totals (columns) | N/A | Daily OD pairs (#3, NO line attribution) |
| **BRT Sunway** | N/A | N/A | Daily OD pairs (#4) |

### 5.2 Uniqueness Summary

- **Dataset #1 (headline)** is the ONLY source that has:
  - Per-line Prasarana totals (LRT Ampang, LRT KJ, Monorail, MRT Kajang, MRT Putrajaya)
  - Bus ridership (KL, Kuantan, Penang)
  - Cross-operator view in a single dataset
  - BUT: only covers through 2023, updated monthly

- **Dataset #2 (ktmb_daily)** is the ONLY source with:
  - Current/near-real-time KTMB data (daily updates through 2026-05-25)
  - Covers 2020-2025+ for all 5 KTMB services
  - API-accessible

- **Datasets #3-4 (Prasarana OD)** are the ONLY sources with:
  - Station-level granularity for Prasarana services
  - Current data through 2026 (daily updates)
  - BUT: no line attribution in OD data (all Rapid Rail lines combined)

- **Datasets #5-9 (KTMB OD)** are the ONLY sources with:
  - Station-level + hourly granularity for KTMB services
  - Single source of truth for all KTMB data

- **Explorer tables (#10-11)** are the ONLY sources with:
  - Pre-computed timeseries for dashboards (unknown schema, needs inspection)

---

## 6. Data Freshness Comparison

| Dataset | Data Lag | Update Frequency | Currency |
|---------|----------|-----------------|----------|
| ridership_headline | ~1 month | Monthly | 2026-04-30 |
| ridership_ktmb_daily | ~1 day | Daily | 2026-05-25 |
| OD Rapid Rail | ~2 days | Daily | 2026-05-24 |
| OD BRT | ~2 days | Daily | 2026-05-24 |
| OD ETS | ~1 day | Daily | 2026-05-25 |
| OD Intercity | ~1 day | Daily | 2026-05-25 |
| OD Komuter | ~1 day | Daily | 2026-05-25 |
| OD Komuter Utara | ~1 day | Daily | 2026-05-25 |
| OD Shuttle Tebrau | ~1 day | Daily | 2026-05-25 |
| Explorer Prasarana | ~2 days | Daily (rebuild) | 2026-05-24 |
| Explorer KTMB | ~1 day | Daily (rebuild) | 2026-05-25 |

---

## 7. Recommended Data Pipeline Strategy

### 7.1 Requirement: Full Daily Time Series for All Rail Services (Including MRT Kajang)

**Challenge:** MRT Kajang line-level daily totals only exist in the `ridership_headline` dataset, which has a monthly lag and only goes through 2023.

**Recommended approach:**

1. **Historical baseline (2020-2023):** Use `ridership_headline` for per-line Prasarana totals (LRT Ampang, LRT KJ, Monorail, MRT Kajang, MRT Putrajaya).

2. **Current/near-real-time (2023-present):** Aggregate from `ridership_od_rapidrail_daily` OD data:
   ```
   SELECT date, SUM(ridership) as total_rapid_rail FROM rapidrail_od GROUP BY date
   ```
   **Limitation:** OD data does NOT have line attribution - you get a single total for ALL Rapid Rail lines combined. You cannot separate MRT Kajang from LRT Ampang from this data alone.

3. **Alternative:** Fetch the `PrasaranaTimeseries` explorer parquet file - this may contain pre-computed per-line totals derived from OD data. This is likely the best single source for current Prasarana daily data.

4. **For KTMB services (2020-present):** Use `ridership_ktmb_daily` - it's API-accessible, daily-updated, and has per-service totals.

### 7.2 Requirement: Historical Data Going Back Multiple Years

| Service | Best Source | Years Covered |
|---------|------------|---------------|
| All services (totals) | `ridership_headline` | 2020-2023 |
| KTMB services (totals) | `ridership_ktmb_daily` | 2020-present |
| ETS OD (station-level) | `ridership_od_ets` | 2020-present |
| Intercity OD | `ridership_od_intercity` | 2020-present |
| Komuter Utara OD | `ridership_od_komuter_utara` | 2020-present |
| Komuter OD | `ridership_od_komuter` | 2023-present |
| Shuttle Tebrau OD | `ridership_od_shuttle_tebrau` | 2022-present |
| Rapid Rail OD | `ridership_od_rapidrail_daily` | 2023-present |
| BRT OD | `ridership_od_brt_daily` | 2023-present |
| Bus totals | `ridership_headline` only | 2020-2023 |

**Gaps:**
- No per-line Prasarana data before 2023 in OD form
- No bus OD data at all (only headline totals)
- Komuter OD starts 2023 (not 2020 like other KTMB services)

### 7.3 Requirement: Calendar Date Comparisons (e.g., YoY, WoW)

**Best sources:**
- **`ridership_headline`**: Wide format with `date` column - perfect for calendar joins (2020-2023). Filter by date ranges easily.
- **`ridership_ktmb_daily`**: Long format with `date` + `service` - pivot by date for YoY comparisons. Full 2020-present coverage.
- **OD datasets**: Aggregate to daily totals with `GROUP BY date`, then join on calendar date.

**Implementation pattern:**
```sql
-- YoY comparison example (from headline data)
SELECT
    EXTRACT(MONTH FROM date) as month,
    EXTRACT(DAY FROM date) as day,
    EXTRACT(DOW FROM date) as dow,
    AVG(CASE WHEN EXTRACT(YEAR FROM date) = 2023 THEN rail_mrt_kajang END) as avg_2023,
    AVG(CASE WHEN EXTRACT(YEAR FROM date) = 2022 THEN rail_mrt_kajang END) as avg_2022
FROM ridership_headline
GROUP BY 1, 2, 3
```

---

## 8. Complete Data Pipeline Architecture Recommendation

```
                    ┌─────────────────────────────────────────────┐
                    │           DATA SOURCES                      │
                    └─────────────────────────────────────────────┘

 ┌──────────────────────────┐     ┌──────────────────────────────────┐
 │  API Sources (poll daily) │     │  Parquet Sources (download)       │
 │                          │     │                                  │
 │  • ridership_headline    │     │  • rapidrail_YYYY_daily.parquet  │
 │  • ridership_ktmb_daily  │     │  • brt_YYYY_daily.parquet        │
 │                          │     │  • ktmb/{service}_YYYY.parquet   │
 └──────────┬───────────────┘     │  • prasarana_timeseries.parquet  │
            │                     │  • ktmb_timeseries.parquet       │
            │                     └──────────────┬───────────────────┘
            │                                    │
            ▼                                    ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                    INGESTION LAYER                                │
 │  • Fetch headline via API (monthly check)                         │
 │  • Fetch ktmb_daily via API (daily poll at 04:00 MYT)            │
 │  • Download explorer parquets (daily)                             │
 │  • For station-level: download yearly OD parquets on demand       │
 └──────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                  TRANSFORMATION LAYER                             │
 │  1. Normalize dates to YYYY-MM-DD                                 │
 │  2. Pivot ktmb_daily from long to wide format                    │
 │  3. Merge headline + ktmb_daily for comprehensive KTMB view      │
 │  4. Use explorer parquets for current Prasarana per-line data    │
 │  5. Generate day-of-week, holiday, and calendar comparison flags  │
 │  6. Compute 7-day rolling averages, WoW, YoY deltas              │
 └──────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                   DASHBOARD SERVING                               │
 │  • KPI Cards: total ridership, WoW%, YoY%                         │
 │  • Time Series Charts: daily, weekly, monthly trends              │
 │  • Service Breakdown: stacked bar per service/line                │
 │  • Calendar Heatmap: ridership by day-of-week and date            │
 │  • Station Analytics: busiest stations/routes (from OD data)      │
 └──────────────────────────────────────────────────────────────────┘
```

### Priority Data Fetch Order:

1. **`ridership_ktmb_daily`** via API - covers all KTMB, current, daily updates
2. **`prasarana_timeseries.parquet`** via direct download - likely per-line Prasarana daily data
3. **`ktmb_timeseries.parquet`** via direct download - likely per-service KTMB daily data (may duplicate #1 but worth checking)
4. **`ridership_headline`** via API - historical cross-operator view (2020-2023)
5. **OD parquets** on-demand - for station-level analytics only

---

## 9. Key Caveats & Considerations

1. **"Ridership" = trips, not unique passengers.** A single person taking 2 trips counts as 2.

2. **Prasarana line attribution is complex.** The headline dataset warns that you cannot reliably derive per-line totals from OD data due to interchange station methodology. The `prasarana_timeseries.parquet` explorer file is likely the best bet for current per-line data.

3. **The headline dataset (dataset #1) only goes to 2023.** For 2024-2026 Prasarana per-line data, you MUST use the explorer parquet files or compute from OD data (losing line-level breakdown).

4. **KTMB OD data is the single source of truth** for all KTMB ridership. The `ridership_ktmb_daily` aggregated file is derived directly from it.

5. **Yearly edition parquets** use `YYYY-MM-DD` in the filename pattern. For Rapid Rail OD, the pattern is `rapidrail_YYYY-MM-DD_daily.parquet` where the date appears to be a year marker.

6. **No bus OD data exists.** Bus ridership is only available as headline totals (Rapid Bus KL/Kuantan/Penang) in the headline dataset.

7. **Explorer parquets** (`prasarana_timeseries`, `ktmb_timeseries`) have unknown schemas - they need to be downloaded and inspected to determine exact columns.

---

*Report generated from metadata analysis of 11 data catalogue/explorer JSON files from data-gov-my/datagovmy-meta repository.*
