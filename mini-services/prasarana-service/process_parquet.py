#!/usr/bin/env python3
"""Process Prasarana timeseries parquet into daily per-line JSON."""
import pandas as pd
import json
import sys

PARQUET_PATH = '/tmp/prasarana_timeseries.parquet'
OUTPUT_PATH = '/tmp/prasarana_daily.json'

def main():
    df = pd.read_parquet(PARQUET_PATH)
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
    pivot['total'] = pivot[['mrt_pjy', 'lrt_kj', 'lrt_ampang', 'monorail', 'brt']].sum(axis=1).astype(int)

    records = pivot.to_dict('records')
    for r in records:
        r['date'] = str(r['date'])

    with open(OUTPUT_PATH, 'w') as f:
        json.dump(records, f)

    print(f'Processed {len(records)} days', file=sys.stderr)

if __name__ == '__main__':
    main()
