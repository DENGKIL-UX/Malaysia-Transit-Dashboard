'use client';

import { Train, Users, Bus, TramFront, MousePointer2 } from 'lucide-react';
import type { RidershipDay } from '@/hooks/use-ridership';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type MetricKey = 'mrtKajang' | 'mrtPutrajaya' | 'total' | 'busKl' | 'ets' | 'intercity';

function DeltaBadge({ value }: { value: string }) {
  const num = parseFloat(value);
  const isPositive = num > 0;
  const isNegative = num < 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isPositive && 'text-emerald-400',
        isNegative && 'text-red-400',
        !isPositive && !isNegative && 'text-[var(--text-muted)]'
      )}
    >
      {isPositive && '↑'}
      {isNegative && '↓'}
      {Math.abs(num).toFixed(1)}%
    </span>
  );
}

function SkeletonPulse() {
  return (
    <div className="h-24 rounded-2xl border border-[var(--border-subtle)] bg-[var(--skeleton-bg)] backdrop-blur-md animate-pulse" />
  );
}

/**
 * Lightweight 7-day sparkline — pure SVG, no charting library.
 * Renders a smooth cubic-bezier curve with a gradient fill beneath
 * and a dot on the final data point.
 */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;

  const W = 100;
  const H = 24;
  const PAD_X = 2;
  const PAD_Y = 3;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_Y * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points: [number, number][] = data.map((v, i) => [
    PAD_X + (i / (data.length - 1)) * plotW,
    PAD_Y + plotH - ((v - min) / range) * plotH,
  ]);

  // Smooth cubic-bezier path through all points
  const smoothPath = (pts: [number, number][]): string => {
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const cpx = (x1 + x2) / 2;
      d += ` C ${cpx} ${y1}, ${cpx} ${y2}, ${x2} ${y2}`;
    }
    return d;
  };

  const linePath = smoothPath(points);
  const [lastX, lastY] = points[points.length - 1];
  const fillPath = `${linePath} L ${lastX} ${H} L ${points[0][0]} ${H} Z`;
  const gradId = `spark-${color.replace('#', '')}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-6 block"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
      <circle cx={lastX} cy={lastY} r="1" fill="var(--bg-base, #070e07)" />
    </svg>
  );
}

interface KpiCardsProps {
  /** Ridership data array — passed from parent to avoid duplicate fetching */
  data: RidershipDay[];
  loading: boolean;
}

export function KpiCards({ data, loading }: KpiCardsProps) {
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];
  const highlightedLine = useAppStore((s) => s.highlightedLine);
  const setHighlightedLine = useAppStore((s) => s.setHighlightedLine);

  const delta = (curr: number, last: number) =>
    last ? (((curr - last) / last) * 100).toFixed(1) : '0.0';

  const cards: {
    label: string;
    value: number;
    delta: string;
    metricKey: MetricKey;
    sparkColor: string;
    icon: typeof Train;
    accent: string;
    border: string;
    bg: string;
    glow: string;
  }[] = [
    {
      label: 'MRT Kajang Line',
      value: latest?.mrtKajang ?? 0,
      delta: latest && prev ? delta(latest.mrtKajang, prev.mrtKajang) : '0.0',
      metricKey: 'mrtKajang',
      sparkColor: '#fbbf24',
      icon: Train,
      accent: 'text-amber-400',
      border: 'border-amber-400/20',
      bg: 'bg-amber-400/10',
      glow: 'shadow-amber-400/5',
    },
    {
      label: 'MRT Putrajaya Line',
      value: latest?.mrtPutrajaya ?? 0,
      delta: latest && prev ? delta(latest.mrtPutrajaya, prev.mrtPutrajaya) : '0.0',
      metricKey: 'mrtPutrajaya',
      sparkColor: '#38bdf8',
      icon: TramFront,
      accent: 'text-sky-400',
      border: 'border-sky-400/20',
      bg: 'bg-sky-400/10',
      glow: 'shadow-sky-400/5',
    },
    {
      label: 'Total Ridership',
      value: latest?.total ?? 0,
      delta: latest && prev ? delta(latest.total, prev.total) : '0.0',
      metricKey: 'total',
      sparkColor: '#85AB8B',
      icon: Users,
      accent: 'text-[#85AB8B]',
      border: 'border-[#85AB8B]/20',
      bg: 'bg-[#85AB8B]/10',
      glow: 'shadow-[#85AB8B]/5',
    },
    {
      label: 'Bus (KL)',
      value: latest?.busKl ?? 0,
      delta: latest && prev ? delta(latest.busKl, prev.busKl) : '0.0',
      metricKey: 'busKl',
      sparkColor: '#fb923c',
      icon: Bus,
      accent: 'text-orange-400',
      border: 'border-orange-400/20',
      bg: 'bg-orange-400/10',
      glow: 'shadow-orange-400/5',
    },
    {
      label: 'ETS',
      value: latest?.ets ?? 0,
      delta: latest && prev ? delta(latest.ets, prev.ets) : '0.0',
      metricKey: 'ets',
      sparkColor: '#22d3ee',
      icon: Train,
      accent: 'text-cyan-400',
      border: 'border-cyan-400/20',
      bg: 'bg-cyan-400/10',
      glow: 'shadow-cyan-400/5',
    },
    {
      label: 'KTM Intercity',
      value: latest?.intercity ?? 0,
      delta: latest && prev ? delta(latest.intercity, prev.intercity) : '0.0',
      metricKey: 'intercity',
      sparkColor: '#a3e635',
      icon: Train,
      accent: 'text-lime-400',
      border: 'border-lime-400/20',
      bg: 'bg-lime-400/10',
      glow: 'shadow-lime-400/5',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonPulse key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((c, i) => {
        const sparkData = data.slice(-7).map((d) => d[c.metricKey]);

        return (
          <div
            key={c.label}
            className={cn(
              'relative overflow-hidden rounded-2xl border cursor-pointer',
              c.border,
              c.bg,
              'backdrop-blur-md p-5 shadow-lg',
              c.glow,
              'animate-fade-in-up group',
              'hover:shadow-xl hover:scale-[1.02] transition-all duration-300',
              highlightedLine === c.metricKey && 'ring-1 ring-[var(--border-subtle)] shadow-xl scale-[1.02]'
            )}
            style={{ animationDelay: `${100 + i * 100}ms`, opacity: 0 }}
            onClick={() => setHighlightedLine(highlightedLine === c.metricKey ? null : c.metricKey)}
            role="button"
            tabIndex={0}
            aria-pressed={highlightedLine === c.metricKey}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ')
                setHighlightedLine(highlightedLine === c.metricKey ? null : c.metricKey);
            }}
          >
            {/* Decorative gradient dot */}
            <div
              className={cn(
                'absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30',
                c.bg
              )}
            />

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                  {c.label}
                </span>
                <c.icon className={cn('w-4 h-4', c.accent)} />
              </div>
              <div className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tabular-nums tracking-tight">
                {c.value.toLocaleString()}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <DeltaBadge value={c.delta} />
                <span className="text-[10px] text-[var(--text-faint)]" title={prev ? `vs ${prev.date}` : undefined}>
                  vs prior day
                </span>
              </div>
              {/* 7-day sparkline */}
              <div className="mt-2">
                <Sparkline data={sparkData} color={c.sparkColor} />
              </div>
              {/* Source badge — bus is OD, others are headline */}
              <div className="mt-1.5 flex items-center justify-between">
                <span className={cn(
                  'text-[9px] font-medium px-1.5 py-0.5 rounded',
                  c.metricKey === 'busKl'
                    ? 'bg-emerald-400/15 text-emerald-300/70'
                    : 'bg-orange-400/15 text-orange-300/70'
                )}>
                  ● {c.metricKey === 'busKl' ? 'batch OD' : 'headline audited'}
                </span>
                <MousePointer2 className="w-3 h-3 text-[var(--text-ghost)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
