'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarCheck2, Gauge, ShieldCheck, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EnrichedDay } from '@/hooks/use-analytics';

const DAY_MS = 24 * 60 * 60 * 1000;
const BASELINE_YEAR = '2019';
const ROLLING_DAYS = 30;
const INDEX_BASELINE = 100;

const CORE_LINES = [
  { key: 'mrtKajang', label: 'MRT Kajang', color: '#fbbf24' },
  { key: 'lrtKelanaJaya', label: 'LRT Kelana Jaya', color: '#a78bfa' },
  { key: 'lrtAmpang', label: 'LRT Ampang', color: '#fb7185' },
  { key: 'monorail', label: 'Monorail', color: '#34d399' },
] as const;

type CoreLineKey = (typeof CORE_LINES)[number]['key'];

interface DailyCoreTotal {
  date: string;
  timestamp: number;
  total: number;
}

interface RecoveryPoint extends DailyCoreTotal {
  rollingAverage: number;
  index: number;
}

interface RecoveryStats {
  baseline: number;
  points: RecoveryPoint[];
  latest: RecoveryPoint;
  trough: RecoveryPoint;
  firstRecovery: RecoveryPoint | null;
}

interface Props {
  ridership: EnrichedDay[];
  loading: boolean;
  headlineThrough?: string | null;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RecoveryPoint }>;
}

// ponytail: show the four national MCO milestones; a state-by-state policy
// calendar can replace these fixed annotations if the pipeline later provides one.
const RESTRICTION_PERIODS = [
  {
    label: 'MCO 1.0',
    start: '2020-03-18',
    end: '2020-05-03',
    dateLabel: '18 Mar – 3 May 2020',
    color: '#f87171',
  },
  {
    label: 'MCO 2.0',
    start: '2021-01-13',
    end: '2021-03-04',
    dateLabel: '13 Jan – 4 Mar 2021',
    color: '#fb923c',
  },
  {
    label: 'MCO 3.0',
    start: '2021-05-12',
    end: '2021-05-31',
    dateLabel: '12 – 31 May 2021',
    color: '#f87171',
  },
  {
    label: 'FMCO',
    start: '2021-06-01',
    end: '2021-06-28',
    dateLabel: '1 – 28 Jun 2021',
    color: '#ef4444',
  },
] as const;

function toTimestamp(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString('en-MY');
}

function getCoreTotal(day: EnrichedDay): number | null {
  let total = 0;

  for (const { key } of CORE_LINES) {
    const value = day[key as CoreLineKey];
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    total += value;
  }

  return total;
}

function calculateRecovery(
  ridership: EnrichedDay[],
  headlineThrough?: string | null
): RecoveryStats | null {
  const daily: DailyCoreTotal[] = ridership
    .filter((day) => !headlineThrough || day.date <= headlineThrough)
    .map((day) => {
      const total = getCoreTotal(day);
      return total === null
        ? null
        : { date: day.date, timestamp: toTimestamp(day.date), total };
    })
    .filter((day): day is DailyCoreTotal => day !== null)
    .sort((a, b) => a.timestamp - b.timestamp);

  const baselineDays = daily.filter((day) => day.date.startsWith(BASELINE_YEAR));
  const hasCompleteBaseline =
    baselineDays.length === 365 &&
    baselineDays[baselineDays.length - 1].timestamp - baselineDays[0].timestamp === 364 * DAY_MS;
  if (!hasCompleteBaseline) return null;

  const baseline = baselineDays.reduce((sum, day) => sum + day.total, 0) / baselineDays.length;
  if (!Number.isFinite(baseline) || baseline <= 0) return null;

  const points: RecoveryPoint[] = [];
  let rollingSum = 0;

  for (let index = 0; index < daily.length; index += 1) {
    rollingSum += daily[index].total;
    if (index >= ROLLING_DAYS) rollingSum -= daily[index - ROLLING_DAYS].total;
    if (index < ROLLING_DAYS - 1) continue;

    const firstDay = daily[index - (ROLLING_DAYS - 1)];
    const lastDay = daily[index];

    // A 30-row window must also span exactly 30 calendar days. This prevents
    // a publication gap from silently becoming a longer, misleading average.
    if (lastDay.timestamp - firstDay.timestamp !== (ROLLING_DAYS - 1) * DAY_MS) {
      continue;
    }

    const rollingAverage = rollingSum / ROLLING_DAYS;
    points.push({
      ...lastDay,
      rollingAverage,
      index: (rollingAverage / baseline) * INDEX_BASELINE,
    });
  }

  if (!points.length) return null;

  const postMco = points.filter((point) => point.date >= RESTRICTION_PERIODS[0].start);
  const troughPool = postMco.length ? postMco : points;
  const trough = troughPool.reduce((lowest, point) =>
    point.index < lowest.index ? point : lowest
  );
  const firstRecovery = points.find(
    (point) => point.timestamp > trough.timestamp && point.index >= INDEX_BASELINE
  ) ?? null;

  return {
    baseline,
    points,
    latest: points[points.length - 1],
    trough,
    firstRecovery,
  };
}

function RecoveryTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tooltip)] backdrop-blur-md p-3 shadow-xl">
      <p className="text-[10px] font-medium uppercase tracking-widest text-[#85AB8B]">
        {formatDate(point.date)}
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-6">
        <span className="text-[11px] text-[var(--text-muted)]">Recovery index</span>
        <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
          {point.index.toFixed(1)}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-6">
        <span className="text-[11px] text-[var(--text-muted)]">30-day average</span>
        <span className="text-[11px] font-medium tabular-nums text-[var(--text-secondary)]">
          {Math.round(point.rollingAverage).toLocaleString('en-MY')}/day
        </span>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 sm:p-6 animate-pulse">
      <div className="h-4 w-48 rounded bg-[var(--skeleton-bg)]" />
      <div className="mt-2 h-3 w-72 max-w-full rounded bg-[var(--skeleton-bg)]" />
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 rounded-xl bg-[var(--skeleton-bg)]" />
        ))}
      </div>
      <div className="mt-5 h-72 rounded-xl bg-[var(--skeleton-bg)]" />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'text-[#85AB8B]',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-faint)] bg-[var(--bg-elevated)]/50 p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">
          {label}
        </p>
        <Icon className={`h-3.5 w-3.5 ${tone}`} aria-hidden="true" />
      </div>
      <p className={`mt-2 text-lg font-semibold tracking-tight tabular-nums ${tone}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

export function CovidRecoveryIndex({ ridership, loading, headlineThrough }: Props) {
  const stats = useMemo(
    () => calculateRecovery(ridership, headlineThrough),
    [ridership, headlineThrough]
  );

  if (loading) return <LoadingState />;

  if (!stats) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-12 text-center">
        <p className="text-sm font-medium text-[var(--text-secondary)]">Historical baseline unavailable</p>
        <p className="mt-1 text-[11px] text-[var(--text-faint)]">
          The recovery index needs a complete 365-day baseline for 2019.
        </p>
      </div>
    );
  }

  const latestDelta = stats.latest.index - INDEX_BASELINE;
  const troughDrop = INDEX_BASELINE - stats.trough.index;
  const chartMax = Math.ceil(Math.max(130, ...stats.points.map((point) => point.index)) / 10) * 10;

  return (
    <section
      data-chart
      aria-labelledby="covid-recovery-title"
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-lg backdrop-blur-md sm:p-6 animate-fade-in-up"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 id="covid-recovery-title" className="text-sm font-semibold text-[var(--text-primary)]">
              COVID-19 Recovery Index
            </h3>
            <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-400">
              2019 = 100
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[var(--text-muted)]">
            Index = trailing 30-day average ÷ 2019 daily average × 100, across four Rapid Rail lines with uninterrupted coverage. Audited headline data only.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" aria-label="Included lines">
          {CORE_LINES.map((line) => (
            <span key={line.key} className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: line.color }} />
              {line.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={Gauge}
          label="2019 baseline"
          value={formatCompact(stats.baseline)}
          detail="average riders per day · index 100"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Latest index"
          value={stats.latest.index.toFixed(1)}
          detail={`${latestDelta >= 0 ? '+' : ''}${latestDelta.toFixed(1)}% vs 2019 · ${formatDate(stats.latest.date)}`}
          tone={latestDelta >= 0 ? 'text-emerald-400' : 'text-orange-400'}
        />
        <SummaryCard
          icon={Gauge}
          label="Pandemic trough"
          value={stats.trough.index.toFixed(1)}
          detail={`−${troughDrop.toFixed(1)}% vs 2019 · ${formatDate(stats.trough.date)}`}
          tone="text-red-400"
        />
        <SummaryCard
          icon={CalendarCheck2}
          label="First return to 100"
          value={stats.firstRecovery ? formatDate(stats.firstRecovery.date) : 'Not yet'}
          detail="first 30-day average at baseline after the trough"
          tone={stats.firstRecovery ? 'text-sky-400' : 'text-orange-400'}
        />
      </div>

      <div
        className="mt-5 h-72 w-full sm:h-80 md:h-[360px]"
        role="img"
        aria-label={`Recovery index from ${formatDate(stats.points[0].date)} to ${formatDate(stats.latest.date)}. The lowest index was ${stats.trough.index.toFixed(1)} on ${formatDate(stats.trough.date)}, and the latest index is ${stats.latest.index.toFixed(1)}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.points} margin={{ top: 14, right: 8, left: -14, bottom: 2 }}>
            <defs>
              <linearGradient id="recoveryIndexFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#85AB8B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#85AB8B" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              type="number"
              dataKey="timestamp"
              domain={['dataMin', 'dataMax']}
              scale="time"
              tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
              tickFormatter={(timestamp: number) => String(new Date(timestamp).getUTCFullYear())}
              tickLine={false}
              axisLine={false}
              minTickGap={42}
              dy={8}
            />
            <YAxis
              domain={[0, chartMax]}
              ticks={[0, 25, 50, 75, 100, 125].filter((tick) => tick <= chartMax)}
              tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
              tickFormatter={(value: number) => `${value}`}
              tickLine={false}
              axisLine={false}
              width={38}
            />

            {RESTRICTION_PERIODS.map((period) => (
              <ReferenceArea
                key={period.label}
                x1={toTimestamp(period.start)}
                x2={toTimestamp(period.end)}
                fill={period.color}
                fillOpacity={0.1}
                strokeOpacity={0}
              />
            ))}
            <ReferenceLine
              y={INDEX_BASELINE}
              stroke="#facc15"
              strokeDasharray="5 5"
              strokeOpacity={0.8}
              label={{
                value: '2019 baseline',
                position: 'insideTopRight',
                fill: '#facc15',
                fontSize: 9,
              }}
            />
            <ReferenceLine
              x={toTimestamp('2022-04-01')}
              stroke="#38bdf8"
              strokeDasharray="3 4"
              strokeOpacity={0.6}
            />
            <Tooltip content={<RecoveryTooltip />} cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }} />
            <Area
              type="monotone"
              dataKey="index"
              stroke="#85AB8B"
              strokeWidth={2}
              fill="url(#recoveryIndexFill)"
              dot={false}
              activeDot={{ r: 4, fill: '#85AB8B', stroke: 'var(--bg-base)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Movement restriction timeline">
        {RESTRICTION_PERIODS.map((period) => (
          <span
            key={period.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-faint)] bg-[var(--bg-elevated)]/50 px-2.5 py-1 text-[9px] text-[var(--text-muted)]"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: period.color }} />
            <strong className="font-semibold text-[var(--text-secondary)]">{period.label}</strong>
            <span className="tabular-nums">{period.dateLabel}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/15 bg-sky-400/5 px-2.5 py-1 text-[9px] text-[var(--text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          <strong className="font-semibold text-sky-400">Endemic transition</strong>
          <span className="tabular-nums">1 Apr 2022</span>
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border-faint)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#85AB8B]" aria-hidden="true" />
          <p className="max-w-3xl text-[10px] leading-relaxed text-[var(--text-faint)]">
            Coverage-safe comparison: MRT Putrajaya, KTM and bus services are excluded because their series begin later. Restriction dates are national milestones; implementation varied by state, and the overlays provide context rather than causal attribution.
          </p>
        </div>
        <span className="shrink-0 text-[9px] uppercase tracking-widest text-[var(--text-ghost)]">
          Source: data.gov.my · CC-BY 4.0
        </span>
      </div>
    </section>
  );
}
