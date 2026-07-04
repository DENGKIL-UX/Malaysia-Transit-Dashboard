#!/usr/bin/env python3
"""
Process all 4 data.gov.my explorer parquets into JSON:
  1. prasarana_timeseries.parquet   → /tmp/prasarana_daily.json
  2. prasarana_timeseries_callout.parquet → /tmp/prasarana_callout.json  (latest station→station flow)
  3. ktmb_timeseries.parquet        → /tmp/ktmb_daily.json
  4. ktmb_timeseries_callout.parquet   → /tmp/ktmb_callout.json  (latest station→station flow)
  5. prasarana_timeseries.parquet   → /tmp/prasarana_stations.json  (per-station daily from timeseries)
  6. ktmb_timeseries.parquet        → /tmp/ktmb_stations.json  (per-station daily from timeseries)
"""
import pandas as pd
import json
import sys
import os

BASE_URL = 'https://storage.data.gov.my/dashboards'
TMP_DIR = '/tmp'

def download(url, path):
    os.system(f'curl -sL "{url}" -o "{path}"')

def process_prasarana_daily():
    """Daily per-line totals for Rapid Rail + BRT."""
    print('Processing prasarana_timeseries (daily)...', file=sys.stderr)
    path = f'{TMP_DIR}/prasarana_timeseries.parquet'
    download(f'{BASE_URL}/prasarana_timeseries.parquet', path)

    df = pd.read_parquet(path)
    daily = df[df['frequency'] == 'daily']
    station = daily[daily['origin'] != 'A0: All Stations'].copy()
    station['origin_code'] = station['origin'].str.extract(r'^([A-Z]{2}\d+|BRT\d+|PYL\d+)')

    def get_line(code):
        if pd.isna(code): return 'skip'
        code = str(code)
        if code.startswith('KG'): return 'mrt_pjy'
        if code.startswith('KJ'): return 'lrt_kj'
        if code.startswith('AG') or code.startswith('SP'): return 'lrt_ampang'
        if code.startswith('MR'): return 'monorail'
        if code.startswith('BRT'): return 'brt'
        if code.startswith('PYL'): return 'mrt_pjy'
        return 'skip'

    station['line'] = station['origin_code'].apply(get_line)
    station = station[station['line'] != 'skip']

    line_totals = station.groupby(['date', 'line'])['passengers'].sum().reset_index()
    pivot = line_totals.pivot(index='date', columns='line', values='passengers').fillna(0).astype(int).reset_index()
    for col in ['mrt_pjy', 'lrt_kj', 'lrt_ampang', 'monorail', 'brt']:
        if col not in pivot.columns:
            pivot[col] = 0
    pivot['total'] = pivot[['mrt_pjy', 'lrt_kj', 'lrt_ampang', 'monorail', 'brt']].sum(axis=1).astype(int)

    records = pivot.to_dict('records')
    for r in records:
        r['date'] = str(r['date'])

    out = f'{TMP_DIR}/prasarana_daily.json'
    with open(out, 'w') as f:
        json.dump(records, f)
    print(f'  → {len(records)} days', file=sys.stderr)
    return len(records)

def process_prasarana_stations():
    """Per-station daily passenger totals from timeseries data (has date dimension)."""
    print('Processing prasarana_timeseries (stations)...', file=sys.stderr)
    path = f'{TMP_DIR}/prasarana_timeseries.parquet'
    if not os.path.exists(path):
        download(f'{BASE_URL}/prasarana_timeseries.parquet', path)

    df = pd.read_parquet(path)
    daily = df[df['frequency'] == 'daily'].copy()
    station = daily[daily['origin'] != 'A0: All Stations'].copy()
    station['origin_code'] = station['origin'].str.extract(r'^([A-Z]{2}\d+|BRT\d+|PYL\d+)')
    station['station_name'] = station['origin'].str.replace(r'^(?:[A-Z]{2}\d+|BRT\d+|PYL\d+): ', '', regex=True)

    def get_line(code):
        if pd.isna(code): return 'unknown'
        code = str(code)
        if code.startswith('KG'): return 'mrt_pjy'
        if code.startswith('KJ'): return 'lrt_kj'
        if code.startswith('AG') or code.startswith('SP'): return 'lrt_ampang'
        if code.startswith('MR'): return 'monorail'
        if code.startswith('BRT'): return 'brt'
        if code.startswith('PYL'): return 'mrt_pjy'
        return 'unknown'

    station['line'] = station['origin_code'].apply(get_line)
    station = station[station['line'] != 'unknown']

    # Aggregate: total passengers per station per date (sum of all destinations)
    station_daily = station.groupby(['date', 'origin_code', 'station_name', 'line'])['passengers'].sum().reset_index()

    # Latest date
    latest_date = station_daily['date'].max()
    latest = station_daily[station_daily['date'] == latest_date].sort_values('passengers', ascending=False)

    # Top 20 stations
    top20 = latest.head(20)
    top_stations = []
    for _, row in top20.iterrows():
        top_stations.append({
            'code': row['origin_code'],
            'name': row['station_name'],
            'line': row['line'],
            'passengers': int(row['passengers']),
        })

    # Daily series for top 20 (last 30 days)
    top_codes = set(s['code'] for s in top_stations)
    recent = station_daily[station_daily['origin_code'].isin(top_codes)].copy()
    recent = recent.sort_values('date').groupby('origin_code').tail(30)
    station_series = {}
    for code in top_codes:
        rows = recent[recent['origin_code'] == code].sort_values('date')
        station_series[code] = [
            {'date': str(r['date']), 'passengers': int(r['passengers'])}
            for _, r in rows.iterrows()
        ]

    # Per-line station counts
    line_counts = station_daily[station_daily['date'] == latest_date].groupby('line')['origin_code'].nunique().to_dict()

    output = {
        'data_as_of': str(latest_date),
        'total_stations': int(station_daily[station_daily['date'] == latest_date]['origin_code'].nunique()),
        'stations_per_line': {k: int(v) for k, v in line_counts.items()},
        'top_stations': top_stations,
        'station_series': station_series,
    }

    out = f'{TMP_DIR}/prasarana_stations.json'
    with open(out, 'w') as f:
        json.dump(output, f)
    print(f'  → {len(top_stations)} top stations, {latest_date}', file=sys.stderr)
    return len(top_stations)

def process_prasarana_callout():
    """Latest snapshot of station-to-station flow from callout (no date dimension)."""
    print('Processing prasarana_timeseries_callout...', file=sys.stderr)
    path = f'{TMP_DIR}/prasarana_timeseries_callout.parquet'
    download(f'{BASE_URL}/prasarana_timeseries_callout.parquet', path)

    df = pd.read_parquet(path)
    daily = df[df['frequency'] == 'daily'].copy()

    # Extract station names
    daily['origin_code'] = daily['origin'].str.extract(r'^([A-Z]{2}\d+|BRT\d+|PYL\d+|A0)')
    daily['dest_code'] = daily['destination'].str.extract(r'^([A-Z]{2}\d+|BRT\d+|PYL\d+|A0)')

    # Top 10 origin-destination pairs (excluding All Stations → station)
    od_pairs = daily[~daily['origin'].str.startswith('A0')].sort_values('passengers', ascending=False).head(20)
    top_od = []
    for _, row in od_pairs.iterrows():
        top_od.append({
            'origin': row['origin'],
            'destination': row['destination'],
            'passengers': int(row['passengers']),
        })

    output = {
        'top_routes': top_od,
    }

    out = f'{TMP_DIR}/prasarana_callout.json'
    with open(out, 'w') as f:
        json.dump(output, f)
    print(f'  → {len(top_od)} top routes', file=sys.stderr)
    return len(top_od)

def process_ktmb_daily():
    """Daily per-service totals for KTMB rail."""
    print('Processing ktmb_timeseries (daily)...', file=sys.stderr)
    path = f'{TMP_DIR}/ktmb_timeseries.parquet'
    download(f'{BASE_URL}/ktmb_timeseries.parquet', path)

    df = pd.read_parquet(path)
    daily = df[df['frequency'] == 'daily'].copy()

    svc = daily.groupby(['date', 'service'])['passengers'].sum().reset_index()
    pivot = svc.pivot(index='date', columns='service', values='passengers').fillna(0).astype(int).reset_index()

    for col in ['ets', 'intercity', 'komuter', 'komuter_utara', 'tebrau']:
        if col not in pivot.columns:
            pivot[col] = 0
    pivot['total'] = pivot[['ets', 'intercity', 'komuter', 'komuter_utara', 'tebrau']].sum(axis=1).astype(int)

    records = pivot.to_dict('records')
    for r in records:
        r['date'] = str(r['date'])

    out = f'{TMP_DIR}/ktmb_daily.json'
    with open(out, 'w') as f:
        json.dump(records, f)
    print(f'  → {len(records)} days', file=sys.stderr)
    return len(records)

def process_ktmb_stations():
    """Per-station daily passenger totals from KTMB timeseries."""
    print('Processing ktmb_timeseries (stations)...', file=sys.stderr)
    path = f'{TMP_DIR}/ktmb_timeseries.parquet'
    if not os.path.exists(path):
        download(f'{BASE_URL}/ktmb_timeseries.parquet', path)

    df = pd.read_parquet(path)
    daily = df[df['frequency'] == 'daily'].copy()

    # Aggregate per station (origin) per date
    station_daily = daily.groupby(['service', 'origin', 'date'])['passengers'].sum().reset_index()

    latest_date = station_daily['date'].max()

    # Overall top 20 stations
    latest_all = station_daily[station_daily['date'] == latest_date].copy()
    latest_agg = latest_all.groupby('origin')['passengers'].sum().reset_index()
    latest_agg_sorted = latest_agg.sort_values('passengers', ascending=False).head(20)
    top_overall = [
        {'name': row['origin'], 'passengers': int(row['passengers'])}
        for _, row in latest_agg_sorted.iterrows()
    ]

    # Per-service top stations
    top_by_service = {}
    for service in sorted(station_daily['service'].unique()):
        svc_data = latest_all[latest_all['service'] == service]
        svc_sorted = svc_data.sort_values('passengers', ascending=False).head(10)
        top_by_service[service] = [
            {'name': row['origin'], 'passengers': int(row['passengers'])}
            for _, row in svc_sorted.iterrows()
        ]

    # Daily series for top 10 overall stations (last 30 days)
    top_names = [s['name'] for s in top_overall[:10]]
    recent = station_daily[station_daily['origin'].isin(top_names)].copy()
    recent_agg = recent.groupby(['date', 'origin'])['passengers'].sum().reset_index()
    recent_agg = recent_agg.sort_values('date')
    station_series = {}
    for name in top_names:
        rows = recent_agg[recent_agg['origin'] == name]
        station_series[name] = [
            {'date': str(r['date']), 'passengers': int(r['passengers'])}
            for _, r in rows.iterrows()
        ]

    total_stations = int(latest_all['origin'].nunique())

    output = {
        'data_as_of': str(latest_date),
        'total_stations': total_stations,
        'top_overall': top_overall,
        'top_by_service': top_by_service,
        'station_series': station_series,
    }

    out = f'{TMP_DIR}/ktmb_stations.json'
    with open(out, 'w') as f:
        json.dump(output, f)
    print(f'  → {len(top_overall)} top stations, {total_stations} total, {latest_date}', file=sys.stderr)
    return len(top_overall)

def process_ktmb_callout():
    """Latest snapshot of KTMB station-to-station flow from callout."""
    print('Processing ktmb_timeseries_callout...', file=sys.stderr)
    path = f'{TMP_DIR}/ktmb_timeseries_callout.parquet'
    download(f'{BASE_URL}/ktmb_timeseries_callout.parquet', path)

    df = pd.read_parquet(path)
    daily = df[df['frequency'] == 'daily'].copy()

    # Top 20 O-D pairs
    od_pairs = daily.sort_values('passengers', ascending=False).head(20)
    top_od = []
    for _, row in od_pairs.iterrows():
        top_od.append({
            'service': row['service'],
            'origin': row['origin'],
            'destination': row['destination'],
            'passengers': int(row['passengers']),
        })

    output = {
        'top_routes': top_od,
    }

    out = f'{TMP_DIR}/ktmb_callout.json'
    with open(out, 'w') as f:
        json.dump(output, f)
    print(f'  → {len(top_od)} top routes', file=sys.stderr)
    return len(top_od)

def main():
    print('=== Starting parquet processing ===', file=sys.stderr)
    process_prasarana_daily()
    process_prasarana_stations()
    process_prasarana_callout()
    process_ktmb_daily()
    process_ktmb_stations()
    process_ktmb_callout()
    print('=== Done ===', file=sys.stderr)

if __name__ == '__main__':
    main()
