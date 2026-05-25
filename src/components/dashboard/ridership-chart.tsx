'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useRidership } from '@/hooks/use-ridership';

// Deterministic pseudo-random heights (no Math.random to avoid hydration mismatch)
const SKELETON_HEIGHTS = [
  42, 65, 38, 72, 55, 80, 45, 60, 75, 50, 68, 35, 58, 82, 48, 63, 70, 40, 76, 53,
];

function ChartSkeleton() {
  return (
    <div className="h-[400px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--skeleton-bg)] backdrop-blur-md animate-pulse flex items-end gap-1 p-6">
      {SKELETON_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-[var(--skeleton-bg)] rounded-t"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[var(--bg-tooltip)] backdrop-blur-md border border-[var(--border-subtle)] rounded-xl p-3 shadow-xl">
      <p className="text-[10px] font-medium text-[#85AB8B] uppercase tracking-widest mb-2">
        {label}
      </p>
      {payload.map((item: TooltipPayloadItem) => (
        <div key={item.name} className="flex items-center justify-between gap-4">
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

export function RidershipChart() {
  const { data, loading } = useRidership();

  if (loading) {
    return <ChartSkeleton />;
  }

  if (!data.length) {
    return (
      <div className="h-[400px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md flex items-center justify-center">
        <p className="text-[var(--text-faint)] text-sm">No data available</p>
      </div>
    );
  }

  return (
    <div
      data-chart
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 shadow-lg animate-fade-in-up"
      style={{ animationDelay: '400ms', opacity: 0 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            30-Day Rail Ridership
          </h3>
          <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
            Daily passenger boardings across all rail lines
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] text-[var(--text-muted)] font-medium">
              MRT Kajang
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-[10px] text-[var(--text-muted)] font-medium">
              MRT Putrajaya
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#85AB8B]" />
            <span className="text-[10px] text-[var(--text-muted)] font-medium">
              Total
            </span>
          </div>
        </div>
      </div>

      <div className="h-56 sm:h-72 md:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="kajangGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="putrajayaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#85AB8B" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#85AB8B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--chart-grid)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="var(--chart-axis)"
              fontSize={10}
              tickFormatter={(d: string) => {
                const parts = d.split('-');
                return `${parts[1]}/${parts[2]}`;
              }}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              stroke="var(--chart-axis)"
              fontSize={10}
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                return v.toString();
              }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#85AB8B"
              strokeWidth={1.5}
              fill="url(#totalGrad)"
              name="Total"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="mrtKajang"
              stroke="#fbbf24"
              strokeWidth={2}
              fill="url(#kajangGrad)"
              name="MRT Kajang"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="mrtPutrajaya"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#putrajayaGrad)"
              name="MRT Putrajaya"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-faint)]">
        <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest">
          Source: data.gov.my · CC-BY 4.0
        </span>
        <span className="text-[10px] text-[var(--text-faint)]">
          {data.length} days of data
        </span>
      </div>
    </div>
  );
}
