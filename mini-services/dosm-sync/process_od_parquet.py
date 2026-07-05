#!/usr/bin/env python3
"""
Process the NEW DOSM OD daily parquets into per-line daily totals JSON.

Input (fetched by dosm-sync/index.ts):
  /tmp/dosm-sync/rapidrail_{YEAR}_daily.parquet   — Rapid Rail OD (AG, KG, KJ, MR, PYL, SP)
  /tmp/dosm-sync/brt_{YEAR}_daily.parquet           — BRT Sunway OD

Output (served by dosm-sync/index.ts):
  /tmp/dosm-sync/rapidrail-daily-totals.json        — Per-line daily totals for Rapid Rail
  /tmp/dosm-sync/brt-daily-totals.json              — BRT daily totals
  /tmp/dosm-sync/combined-daily-totals.json         — Combined Rapid Rail + BRT totals

Station prefix mapping (from actual data inspection):
  AG  = LRT Ampang Line (18 stations: AG01 Sentul Timur → AG18 Ampang)
  KG  = MRT Kajang / SBK Line (29 stations: KG04 Kwasa Damansara → KG35 Kajang)
  KJ  = LRT Kelana Jaya Line (36 stations: KJ01 Gombak → KJ36 Putra Heights)
  MR  = KL Monorail (11 stations: MR01 KL Sentral → MR11 Titiwangsa)
  PYL = MRT Putrajaya Line (34 stations: PYL03 Kampung Selamat → PYL38 Putrajaya Sentral)
  SP  = LRT Sri Petaling Line (18 stations: SP12 Cheras → SP31 Putra Heights)
  A0  = "All Stations" aggregate row (excluded from line totals)

Note on OD vs Headline methodology:
  OD origin-sum = total boardings from stations on that line (includes transfers)
  Headline = audited monthly line-level totals (different methodology)
  Ratios vary 0.69x–1.74x across lines — NOT directly substitutable.
  These values are tagged as "od_source": true for consumer awareness.
"""
import pandas as pd
import json
import sys
import os
import platform
import subprocess
import glob

# Cross-platform data dir: Git Bash and Windows Python must agree on the path
# Override with OUTPUT_DIR env var (used by GitHub Actions)
DEFAULT_DATA_DIR = 'C:/tmp/dosm-sync' if platform.system() == 'Windows' else '/tmp/dosm-sync'
DATA_DIR = os.environ.get('OUTPUT_DIR', DEFAULT_DATA_DIR)

# Whether to download parquets before processing (set by --download flag or env)
AUTO_DOWNLOAD = os.environ.get('AUTO_DOWNLOAD', '').lower() in ('1', 'true')

# Line mapping: station prefix → output field name
LINE_MAP = {
    'AG':  'lrt_ampang',
    'KG':  'mrt_kajang',   # ← THIS IS NEW — MRT Kajang / SBK Line
    'KJ':  'lrt_kj',
    'MR':  'monorail',
    'PYL': 'mrt_pjy',
    'SP':  'lrt_sri_petaling',  # Separate from Ampang in new data
}


def process_rapidrail(year: int) -> dict | None:
    """Process rapidrail_{year}_daily.parquet → per-line daily totals."""
    path = f'{DATA_DIR}/rapidrail_{year}_daily.parquet'
    if not os.path.exists(path):
        print(f'  [skip] {path} not found', file=sys.stderr)
        return None

    print(f'  Processing rapidrail_{year}_daily.parquet...', file=sys.stderr)
    df = pd.read_parquet(path)

    # Extract station code prefix
    df['prefix'] = df['origin'].str.extract(r'^([A-Z]+)')

    # Exclude A0 (All Stations aggregate) and unknown prefixes
    df = df[df['prefix'].isin(LINE_MAP.keys())]

    # Sum ridership by date and line prefix (origin-based = boardings)
    daily = df.groupby(['date', 'prefix'])['ridership'].sum().reset_index()
    pivot = daily.pivot(index='date', columns='prefix', values='ridership').fillna(0).astype(int)

    # Map prefixes to field names
    records = []
    for date, row in pivot.iterrows():
        rec: dict = {
            'date': str(date.date()) if hasattr(date, 'date') else str(date),
            'od_source': True,  # Tag as OD-sourced (different from headline methodology)
        }
        for prefix, field in LINE_MAP.items():
            rec[field] = int(row.get(prefix, 0))
        # Total Rapid Rail (sum of all lines)
        rec['total_rail'] = sum(rec[f] for f in LINE_MAP.values())
        records.append(rec)

    # Sort by date
    records.sort(key=lambda r: r['date'])
    print(f'    → {len(records)} days, lines: {[LINE_MAP[p] for p in pivot.columns]}', file=sys.stderr)
    return {
        'data_as_of': records[-1]['date'] if records else None,
        'row_count': len(records),
        'source_file': f'rapidrail_{year}_daily.parquet',
        'source_url': f'https://storage.data.gov.my/transportation/rail/rapidrail_{year}_daily.parquet',
        'line_mapping': LINE_MAP,
        'data': records,
    }


def process_brt(year: int) -> dict | None:
    """Process brt_{year}_daily.parquet → BRT daily totals."""
    path = f'{DATA_DIR}/brt_{year}_daily.parquet'
    if not os.path.exists(path):
        print(f'  [skip] {path} not found', file=sys.stderr)
        return None

    print(f'  Processing brt_{year}_daily.parquet...', file=sys.stderr)
    df = pd.read_parquet(path)

    # Daily totals (sum all OD pairs per day)
    daily = df.groupby('date')['ridership'].sum().reset_index()
    daily = daily.sort_values('date')

    # Count unique stations
    all_stations = set(df['origin'].unique()) | set(df['destination'].unique())
    # Remove "A0: All Stations" from count
    stations = {s for s in all_stations if not s.startswith('A0')}

    records = []
    for _, row in daily.iterrows():
        rec = {
            'date': str(row['date'].date()) if hasattr(row['date'], 'date') else str(row['date']),
            'brt': int(row['ridership']),
            'od_source': True,
        }
        records.append(rec)

    print(f'    → {len(records)} days, {len(stations)} BRT stations', file=sys.stderr)
    return {
        'data_as_of': records[-1]['date'] if records else None,
        'row_count': len(records),
        'source_file': f'brt_{year}_daily.parquet',
        'source_url': f'https://storage.data.gov.my/transportation/bus/brt_{year}_daily.parquet',
        'station_count': len(stations),
        'data': records,
    }


def process_rapidrail_stations(year: int) -> dict | None:
    """Process rapidrail OD parquet → top-20 station analytics (same format as Explorer parquet output).

    This replaces the Explorer parquet dependency for Rapid Rail station analytics.
    The DOSM OD parquet is updated more frequently (T-1 lag vs T-3 for Explorer).
    """
    path = f'{DATA_DIR}/rapidrail_{year}_daily.parquet'
    if not os.path.exists(path):
        print(f'  [skip] {path} not found', file=sys.stderr)
        return None

    print(f'  Processing rapidrail_{year}_daily.parquet (stations)...', file=sys.stderr)
    df = pd.read_parquet(path)

    # Exclude A0 (All Stations aggregate)
    df = df[~df['origin'].str.startswith('A0')].copy()

    # Extract station code and name
    df['origin_code'] = df['origin'].str.extract(r'^([A-Z]{2}\d+|PYL\d+)')
    df['station_name'] = df['origin'].str.replace(r'^[A-Z]{2}\d+: ', '', regex=True)
    df = df.dropna(subset=['origin_code'])

    # Map to line
    def get_line(code):
        code = str(code)
        if code.startswith('KG'): return 'mrt_pjy'      # MRT Kajang uses PJY line naming in dashboard
        if code.startswith('KJ'): return 'lrt_kj'
        if code.startswith('AG') or code.startswith('SP'): return 'lrt_ampang'
        if code.startswith('MR'): return 'monorail'
        if code.startswith('PYL'): return 'mrt_pjy'
        return 'unknown'

    df['line'] = df['origin_code'].apply(get_line)
    df = df[df['line'] != 'unknown']

    # Sum ridership per station per date (origin-based = total boardings)
    station_daily = df.groupby(['date', 'origin_code', 'station_name', 'line'])['ridership'].sum().reset_index()

    # Top 20 by latest date
    latest_date = station_daily['date'].max()
    latest = station_daily[station_daily['date'] == latest_date].sort_values('ridership', ascending=False)
    top20 = latest.head(20)

    top_stations = []
    for _, row in top20.iterrows():
        top_stations.append({
            'code': row['origin_code'],
            'name': row['station_name'],
            'line': row['line'],
            'passengers': int(row['ridership']),
        })

    # 30-day series for each top station
    top_codes = set(s['code'] for s in top_stations)
    recent = station_daily[station_daily['origin_code'].isin(top_codes)].copy()
    recent = recent.sort_values('date').groupby('origin_code').tail(30)

    station_series = {}
    for code in top_codes:
        rows = recent[recent['origin_code'] == code].sort_values('date')
        station_series[code] = [
            {'date': str(r['date'].date()) if hasattr(r['date'], 'date') else str(r['date']), 'passengers': int(r['ridership'])}
            for _, r in rows.iterrows()
        ]

    # Per-line station counts
    line_counts = station_daily[station_daily['date'] == latest_date].groupby('line')['origin_code'].nunique().to_dict()

    output = {
        'data_as_of': str(latest_date.date()) if hasattr(latest_date, 'date') else str(latest_date),
        'total_stations': int(station_daily[station_daily['date'] == latest_date]['origin_code'].nunique()),
        'stations_per_line': {k: int(v) for k, v in line_counts.items()},
        'top_stations': top_stations,
        'station_series': station_series,
        'od_source': True,
    }

    print(f'    → {len(top_stations)} top stations, {output["total_stations"]} total, {output["data_as_of"]}', file=sys.stderr)
    return output


def process_brt_stations(year: int) -> list | None:
    """Extract BRT station-level daily data to merge into Rapid Rail station analytics."""
    path = f'{DATA_DIR}/brt_{year}_daily.parquet'
    if not os.path.exists(path):
        print(f'  [skip] {path} not found', file=sys.stderr)
        return None

    print(f'  Processing brt_{year}_daily.parquet (stations)...', file=sys.stderr)
    df = pd.read_parquet(path)
    df = df[~df['origin'].str.startswith('A0')].copy()

    df['origin_code'] = df['origin'].str.extract(r'^(BRT\d+)')
    df['station_name'] = df['origin'].str.replace(r'^BRT\d+: ', '', regex=True)
    df = df.dropna(subset=['origin_code'])

    # Sum ridership per station per date
    station_daily = df.groupby(['date', 'origin_code', 'station_name'])['ridership'].sum().reset_index()

    latest_date = station_daily['date'].max()
    latest = station_daily[station_daily['date'] == latest_date].sort_values('ridership', ascending=False)

    top_brt = []
    for _, row in latest.head(20).iterrows():
        top_brt.append({
            'code': row['origin_code'],
            'name': row['station_name'],
            'line': 'brt',
            'passengers': int(row['ridership']),
        })

    # 30-day series for BRT stations
    brt_codes = set(s['code'] for s in top_brt)
    recent = station_daily[station_daily['origin_code'].isin(brt_codes)].copy()
    recent = recent.sort_values('date').groupby('origin_code').tail(30)

    station_series = {}
    for code in brt_codes:
        rows = recent[recent['origin_code'] == code].sort_values('date')
        station_series[code] = [
            {'date': str(r['date'].date()) if hasattr(r['date'], 'date') else str(r['date']), 'passengers': int(r['ridership'])}
            for _, r in rows.iterrows()
        ]

    brt_count = int(station_daily[station_daily['date'] == latest_date]['origin_code'].nunique())
    print(f'    → {len(top_brt)} BRT stations, {brt_count} total', file=sys.stderr)
    return {
        'top_stations': top_brt,
        'station_series': station_series,
        'station_count': brt_count,
    }


def merge_stations_with_brt(rail_stations: dict, brt_stations_data: list | None) -> dict:
    """Merge BRT station data into Rapid Rail station analytics."""
    if not brt_stations_data:
        return rail_stations

    rail_stations['stations_per_line']['brt'] = brt_stations_data['station_count']
    rail_stations['total_stations'] += brt_stations_data['station_count']

    # Merge BRT top stations (only add if not already at 20)
    remaining = 20 - len(rail_stations['top_stations'])
    if remaining > 0:
        rail_stations['top_stations'].extend(brt_stations_data['top_stations'][:remaining])

    # Merge BRT station series
    rail_stations['station_series'].update(brt_stations_data['station_series'])

    return rail_stations


def process_combined(rail_data: dict | None, brt_data: dict | None) -> dict | None:
    """Merge Rapid Rail + BRT into a single daily totals file."""
    if not rail_data:
        return None

    # Build date-indexed lookup for BRT
    brt_by_date = {}
    if brt_data:
        for row in brt_data['data']:
            brt_by_date[row['date']] = row['brt']

    # Merge
    combined = []
    for rr in rail_data['data']:
        rec = dict(rr)
        rec['brt'] = brt_by_date.get(rec['date'], 0)
        rec['total'] = rec.get('total_rail', 0) + rec['brt']
        combined.append(rec)

    return {
        'data_as_of': rail_data['data_as_of'],
        'row_count': len(combined),
        'sources': {
            'rapidrail': rail_data['source_file'],
            'brt': brt_data['source_file'] if brt_data else None,
        },
        'note': 'Rapid Rail values are OD origin-sum (includes transfers). BRT is total OD sum. These differ from headline audited values.',
        'data': combined,
    }


def download(url: str, path: str):
    """Download a file via curl (works in GitHub Actions without extra deps)."""
    print(f'  Downloading {os.path.basename(path)}...', file=sys.stderr)
    subprocess.run(['curl', '-sL', '--max-time', '120', url, '-o', path], check=True)
    size = os.path.getsize(path)
    print(f'    → {size:,} bytes', file=sys.stderr)


def download_parquets():
    """Download annual parquets from DOSM storage.
    
    In CI (GitHub Actions), we always re-download to get the latest data.
    Locally, we skip if the file already exists (for faster dev iteration).
    """
    year = pd.Timestamp.now().year
    prev_year = year - 1
    # In CI, always force re-download (no persistent storage between runs)
    force = os.environ.get('CI', '') == 'true' or os.environ.get('FORCE_DOWNLOAD', '') == 'true'

    sources = [
        ('rapidrail', f'https://storage.data.gov.my/transportation/rail/rapidrail_{{y}}_daily.parquet'),
        ('brt', f'https://storage.data.gov.my/transportation/bus/brt_{{y}}_daily.parquet'),
    ]

    for name, url_tpl in sources:
        for y in [year, prev_year]:
            url = url_tpl.format(y=y)
            out = f'{DATA_DIR}/{name}_{y}_daily.parquet'
            if not force and os.path.exists(out) and os.path.getsize(out) > 0:
                print(f'  [skip] {name}_{y}_daily.parquet exists ({os.path.getsize(out):,} bytes)', file=sys.stderr)
                continue
            try:
                download(url, out)
            except subprocess.CalledProcessError:
                print(f'  [warn] Failed to download {url}', file=sys.stderr)
                if os.path.exists(out):
                    os.remove(out)


def download_metadata():
    """Download DOSM metadata files for the dashboard API."""
    meta_urls = {
        'dosm-meta-rapidrail.json': 'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/data-catalogue/ridership_od_rapidrail_daily.json',
        'dosm-meta-brt.json': 'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/data-catalogue/ridership_od_brt_daily.json',
    }
    for filename, url in meta_urls.items():
        out = f'{DATA_DIR}/{filename}'
        try:
            download(url, out)
        except subprocess.CalledProcessError:
            print(f'  [warn] Failed to download metadata {filename}', file=sys.stderr)


def main():
    # Support --download flag
    auto_dl = '--download' in sys.argv or AUTO_DOWNLOAD

    print('=== Processing DOSM OD Daily Parquets ===', file=sys.stderr)
    os.makedirs(DATA_DIR, exist_ok=True)

    if auto_dl:
        download_parquets()
        download_metadata()

    year = pd.Timestamp.now().year
    prev_year = year - 1

    # Try current year, fall back to previous year
    rail = process_rapidrail(year) or process_rapidrail(prev_year)
    brt = process_brt(year) or process_brt(prev_year)
    combined = process_combined(rail, brt)

    # Process station analytics from OD data (replaces Explorer parquet dependency)
    stations = process_rapidrail_stations(year) or process_rapidrail_stations(prev_year)
    brt_st = process_brt_stations(year) or process_brt_stations(prev_year)
    if stations and brt_st:
        stations = merge_stations_with_brt(stations, brt_st)

    # Write outputs
    outputs = {
        'dosm-od-daily-totals.json': combined,
        'dosm-rapidrail-daily.json': rail,
        'brt-daily-totals.json': brt,
        'prasarana-stations.json': stations,  # Now sourced from DOSM OD (fresher than Explorer parquet)
    }

    for filename, data in outputs.items():
        path = f'{DATA_DIR}/{filename}'
        if data:
            with open(path, 'w') as f:
                json.dump(data, f, separators=(',', ':'))
            size = os.path.getsize(path)
            print(f'  ✓ {filename}: {size:,} bytes', file=sys.stderr)
        else:
            print(f'  ✗ {filename}: no data', file=sys.stderr)

    print('=== Done ===', file=sys.stderr)


if __name__ == '__main__':
    main()