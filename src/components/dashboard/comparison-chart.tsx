'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { EnrichedDay } from '@/hooks/use-analytics';

interface Props {
  dateA: Date;
  dateB: Date;
  dataA: EnrichedDay | undefined;
  dataB: EnrichedDay | undefined;
}

const LINES = [
  { key: 'mrtKajang', label: 'MRT Kajang', color: '#fbbf24' },
  { key: 'mrtPutrajaya', label: 'MRT Putrajaya', color: '#38bdf8' },
  { key: 'lrtAmpang', label: 'LRT Ampang', color: '#f87171' },
  { key: 'lrtKelanaJaya', label: 'LRT Kelana Jaya', color: '#a78bfa' },
  { key: 'monorail', label: 'Monorail', color: '#34d399' },
  { key: 'komuter', label: 'KTM Komuter', color: '#2dd4bf' },
  { key: 'ets', label: 'ETS', color: '#22d3ee' },
  { key: 'intercity', label: 'Intercity', color: '#a3e635' },
  { key: 'komuterUtara', label: 'Komuter Utara', color: '#f472b6' },
  { key: 'tebrau', label: 'Shuttle Tebrau', color: '#facc15' },
] as const;

interface ChartTooltipPayloadItem {
  name: string;
  value: number;
  dataKey: string;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[var(--bg-tooltip)] backdrop-blur-md border border-[var(--border-subtle)] rounded-xl p-3 shadow-xl">
      <p className="text-[10px] font-medium text-[#85AB8B] uppercase tracking-widest mb-2">
        {label}
      </p>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-[var(--text-muted)]">{item.name}</span>
          </div>
          <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
            {item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ComparisonChart({ dateA, dateB, dataA, dataB }: Props) {
  const chartData = LINES.map((line) => ({
    name: line.label,
    [line.key + 'A']: dataA ? (dataA[line.key] as number) : 0,
    [line.key + 'B']: dataB ? (dataB[line.key] as number) : 0,
    color: line.color,
  }));

  const labelA = format(dateA, 'dd MMM');
  const labelB = format(dateB, 'dd MMM');
  const noDataA = !dataA;
  const noDataB = !dataB;

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Date Comparison
          </h3>
          <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
            Ridership across all rail lines
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[var(--text-muted)] font-medium">
              {labelA}
              {noDataA && (
                <span className="text-red-400/60 ml-1">(no data)</span>
              )}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-[var(--text-muted)] font-medium">
              {labelB}
              {noDataB && (
                <span className="text-red-400/60 ml-1">(no data)</span>
              )}
            </span>
          </span>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="name"
              stroke="var(--chart-axis)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              stroke="var(--chart-axis)"
              fontSize={10}
              tickFormatter={(v: number) => {
                if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                return v.toString();
              }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            {LINES.map((line) => (
              <Bar
                key={line.key + 'A'}
                dataKey={line.key + 'A'}
                fill="#fbbf24"
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
            ))}
            {LINES.map((line) => (
              <Bar
                key={line.key + 'B'}
                dataKey={line.key + 'B'}
                fill="#38bdf8"
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data availability notes */}
      <div className="mt-3 pt-3 border-t border-[var(--border-faint)]">
        {dataA && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] text-[var(--text-faint)] w-16">{labelA}:</span>
            <span className="text-[9px] text-[var(--text-faint)]">
              {dataA.day_type === 'holiday' && dataA.holiday_name
                ? `${dataA.holiday_name} (Holiday)`
                : `${dataA.day_type.charAt(0).toUpperCase() + dataA.day_type.slice(1)}`}
              {dataA.confidence !== 'high' && (
                <span className="text-orange-400/70 ml-1">⚠ est.</span>
              )}
            </span>
          </div>
        )}
        {dataB && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[var(--text-faint)] w-16">{labelB}:</span>
            <span className="text-[9px] text-[var(--text-faint)]">
              {dataB.day_type === 'holiday' && dataB.holiday_name
                ? `${dataB.holiday_name} (Holiday)`
                : `${dataB.day_type.charAt(0).toUpperCase() + dataB.day_type.slice(1)}`}
              {dataB.confidence !== 'high' && (
                <span className="text-orange-400/70 ml-1">⚠ est.</span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
