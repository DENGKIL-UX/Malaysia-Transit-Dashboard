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
import glob

# Cross-platform data dir: Git Bash and Windows Python must agree on the path
DATA_DIR = 'C:/tmp/dosm-sync' if platform.system() == 'Windows' else '/tmp/dosm-sync'

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


def main():
    print('=== Processing DOSM OD Daily Parquets ===', file=sys.stderr)
    os.makedirs(DATA_DIR, exist_ok=True)

    year = pd.Timestamp.now().year

    rail = process_rapidrail(year)
    brt = process_brt(year)
    combined = process_combined(rail, brt)

    # Write outputs
    outputs = {
        'rapidrail-daily-totals.json': rail,
        'brt-daily-totals.json': brt,
        'combined-daily-totals.json': combined,
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