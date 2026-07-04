#!/usr/bin/env python3
"""
Process data.gov.my explorer parquets into JSON for the dashboard.

Outputs to OUTPUT_DIR (default: public/) or /tmp for local dev.
Used by GitHub Actions cron (daily) and locally for manual refresh.

Outputs:
  1. prasarana_timeseries.parquet   → {OUTPUT}/prasarana-daily-totals.json (per-line daily)
  2. prasarana_timeseries.parquet   → {OUTPUT}/prasarana-stations.json (top 20 stations)
  3. prasarana_timeseries_callout   → {OUTPUT}/prasarana-routes.json (top 20 O-D pairs)
  4. ktmb_timeseries.parquet        → {OUTPUT}/ktmb-daily.json (per-service daily)
  5. ktmb_timeseries.parquet        → {OUTPUT}/ktmb-stations.json (top 20 stations)
  6. ktmb_timeseries_callout        → {OUTPUT}/ktmb-routes.json (top 20 O-D pairs)
"""
import pandas as pd
import json
import sys
import os
import subprocess

BASE_URL = 'https://storage.data.gov.my/dashboards'
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '/tmp')

def download(url, path):
    subprocess.run(['curl', '-sL', url, '-o', path], check=True)

def process_prasarana_daily(out_dir):
    """Daily per-line totals for Rapid Rail + BRT."""
    print('Processing prasarana_timeseries (daily)...', file=sys.stderr)
    path = f'{out_dir}/_prasarana_timeseries.parquet'
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

    out = f'{out_dir}/prasarana-daily-totals.json'
    with open(out, 'w') as f:
        json.dump(records, f)
    print(f'  → {len(records)} days, last={records[-1]["date"] if records else "?"}', file=sys.stderr)

    # Also write a flat daily version (used by use-prasarana-daily.ts)
    out2 = f'{out_dir}/prasarana-daily.json'
    with open(out2, 'w') as f:
        json.dump(records, f)

    # Cleanup temp parquet
    os.remove(path)
    return len(records)

def process_prasarana_stations(out_dir):
    """Per-station daily passenger totals from timeseries data."""
    print('Processing prasarana_timeseries (stations)...', file=sys.stderr)
    path = f'{out_dir}/_prasarana_timeseries.parquet'
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

    station_daily = station.groupby(['date', 'origin_code', 'station_name', 'line'])['passengers'].sum().reset_index()

    latest_date = station_daily['date'].max()
    latest = station_daily[station_daily['date'] == latest_date].sort_values('passengers', ascending=False)

    top20 = latest.head(20)
    top_stations = []
    for _, row in top20.iterrows():
        top_stations.append({
            'code': row['origin_code'],
            'name': row['station_name'],
            'line': row['line'],
            'passengers': int(row['passengers']),
        })

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

    line_counts = station_daily[station_daily['date'] == latest_date].groupby('line')['origin_code'].nunique().to_dict()

    output = {
        'data_as_of': str(latest_date),
        'total_stations': int(station_daily[station_daily['date'] == latest_date]['origin_code'].nunique()),
        'stations_per_line': {k: int(v) for k, v in line_counts.items()},
        'top_stations': top_stations,
        'station_series': station_series,
    }

    out = f'{out_dir}/prasarana-stations.json'
    with open(out, 'w') as f:
        json.dump(output, f)
    print(f'  → {len(top_stations)} top stations, {latest_date}', file=sys.stderr)

    if os.path.exists(path):
        os.remove(path)
    return len(top_stations)

def process_prasarana_callout(out_dir):
    """Latest snapshot of station-to-station flow from callout."""
    print('Processing prasarana_timeseries_callout...', file=sys.stderr)
    path = f'{out_dir}/_prasarana_callout.parquet'
    download(f'{BASE_URL}/prasarana_timeseries_callout.parquet', path)

    df = pd.read_parquet(path)
    daily = df[df['frequency'] == 'daily'].copy()

    daily['origin_code'] = daily['origin'].str.extract(r'^([A-Z]{2}\d+|BRT\d+|PYL\d+|A0)')
    daily['dest_code'] = daily['destination'].str.extract(r'^([A-Z]{2}\d+|BRT\d+|PYL\d+|A0)')

    od_pairs = daily[~daily['origin'].str.startswith('A0')].sort_values('passengers', ascending=False).head(20)
    top_od = []
    for _, row in od_pairs.iterrows():
        top_od.append({
            'origin': row['origin'],
            'destination': row['destination'],
            'passengers': int(row['passengers']),
        })

    output = {'top_routes': top_od}

    out = f'{out_dir}/prasarana-routes.json'
    with open(out, 'w') as f:
        json.dump(output, f)
    print(f'  → {len(top_od)} top routes', file=sys.stderr)

    os.remove(path)
    return len(top_od)

def process_ktmb_daily(out_dir):
    """Daily per-service totals for KTMB rail."""
    print('Processing ktmb_timeseries (daily)...', file=sys.stderr)
    path = f'{out_dir}/_ktmb_timeseries.parquet'
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

    out = f'{out_dir}/ktmb-daily.json'
    with open(out, 'w') as f:
        json.dump(records, f)
    print(f'  → {len(records)} days, last={records[-1]["date"] if records else "?"}', file=sys.stderr)

    os.remove(path)
    return len(records)

def process_ktmb_stations(out_dir):
    """Per-station daily passenger totals from KTMB timeseries."""
    print('Processing ktmb_timeseries (stations)...', file=sys.stderr)
    path = f'{out_dir}/_ktmb_timeseries.parquet'
    if not os.path.exists(path):
        download(f'{BASE_URL}/ktmb_timeseries.parquet', path)

    df = pd.read_parquet(path)
    daily = df[df['frequency'] == 'daily'].copy()

    station_daily = daily.groupby(['service', 'origin', 'date'])['passengers'].sum().reset_index()

    latest_date = station_daily['date'].max()

    latest_all = station_daily[station_daily['date'] == latest_date].copy()
    latest_agg = latest_all.groupby('origin')['passengers'].sum().reset_index()
    latest_agg_sorted = latest_agg.sort_values('passengers', ascending=False).head(20)
    top_overall = [
        {'name': row['origin'], 'passengers': int(row['passengers'])}
        for _, row in latest_agg_sorted.iterrows()
    ]

    top_by_service = {}
    for service in sorted(station_daily['service'].unique()):
        svc_data = latest_all[latest_all['service'] == service]
        svc_sorted = svc_data.sort_values('passengers', ascending=False).head(10)
        top_by_service[service] = [
            {'name': row['origin'], 'passengers': int(row['passengers'])}
            for _, row in svc_sorted.iterrows()
        ]

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

    out = f'{out_dir}/ktmb-stations.json'
    with open(out, 'w') as f:
        json.dump(output, f)
    print(f'  → {len(top_overall)} top stations, {total_stations} total, {latest_date}', file=sys.stderr)

    if os.path.exists(path):
        os.remove(path)
    return len(top_overall)

def process_ktmb_callout(out_dir):
    """Latest snapshot of KTMB station-to-station flow from callout."""
    print('Processing ktmb_timeseries_callout...', file=sys.stderr)
    path = f'{out_dir}/_ktmb_callout.parquet'
    download(f'{BASE_URL}/ktmb_timeseries_callout.parquet', path)

    df = pd.read_parquet(path)
    daily = df[df['frequency'] == 'daily'].copy()

    od_pairs = daily.sort_values('passengers', ascending=False).head(20)
    top_od = []
    for _, row in od_pairs.iterrows():
        top_od.append({
            'service': row['service'],
            'origin': row['origin'],
            'destination': row['destination'],
            'passengers': int(row['passengers']),
        })

    output = {'top_routes': top_od}

    out = f'{out_dir}/ktmb-routes.json'
    with open(out, 'w') as f:
        json.dump(output, f)
    print(f'  → {len(top_od)} top routes', file=sys.stderr)

    os.remove(path)
    return len(top_od)

def main():
    out_dir = OUTPUT_DIR
    os.makedirs(out_dir, exist_ok=True)

    print(f'=== Starting parquet processing → {out_dir} ===', file=sys.stderr)
    process_prasarana_daily(out_dir)
    process_prasarana_stations(out_dir)
    process_prasarana_callout(out_dir)
    process_ktmb_daily(out_dir)
    process_ktmb_stations(out_dir)
    process_ktmb_callout(out_dir)
    print('=== Done ===', file=sys.stderr)

if __name__ == '__main__':
    main()