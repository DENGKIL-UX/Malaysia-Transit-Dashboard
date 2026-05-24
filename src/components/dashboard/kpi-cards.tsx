'use client';

import { Train, Users, Bus, TramFront } from 'lucide-react';
import { useRidership } from '@/hooks/use-ridership';
import { cn } from '@/lib/utils';

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

export function KpiCards() {
  const { data, loading } = useRidership();
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];

  const delta = (curr: number, last: number) =>
    last ? (((curr - last) / last) * 100).toFixed(1) : '0.0';

  const cards = [
    {
      label: 'MRT Kajang Line',
      value: latest?.mrtKajang ?? 0,
      delta: latest && prev ? delta(latest.mrtKajang, prev.mrtKajang) : '0.0',
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
      icon: TramFront,
      accent: 'text-sky-400',
      border: 'border-sky-400/20',
      bg: 'bg-sky-400/10',
      glow: 'shadow-sky-400/5',
    },
    {
      label: 'Total Rail Ridership',
      value: latest?.total ?? 0,
      delta: latest && prev ? delta(latest.total, prev.total) : '0.0',
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
      icon: Bus,
      accent: 'text-orange-400',
      border: 'border-orange-400/20',
      bg: 'bg-orange-400/10',
      glow: 'shadow-orange-400/5',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonPulse key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className={cn(
            'relative overflow-hidden rounded-2xl border',
            c.border,
            c.bg,
            'backdrop-blur-md p-5 shadow-lg',
            c.glow,
            'animate-fade-in-up'
          )}
          style={{ animationDelay: `${100 + i * 100}ms`, opacity: 0 }}
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
            {/* Source badge */}
            <div className="mt-2">
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-orange-400/15 text-orange-300/70">
                ● headline audited
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
