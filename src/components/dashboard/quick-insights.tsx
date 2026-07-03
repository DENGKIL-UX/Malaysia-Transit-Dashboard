'use client';

import { useAppStore } from '@/lib/store';
import { Lightbulb } from 'lucide-react';

export function QuickInsights() {
  const analyticsState = useAppStore((s) => s.analyticsState);

  const insight = analyticsState?.insights?.[0];

  return (
    <div className="mt-[100px] sm:mt-[108px] mx-4 sm:mx-6 md:mx-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 flex items-center gap-3 animate-fade-in-up">
      <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        {insight ?? 'Tracking 14 transit services across Malaysia'}
      </p>
    </div>
  );
}