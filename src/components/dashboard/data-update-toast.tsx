'use client';

import { useMemo } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { differenceInHours } from 'date-fns';

/**
 * Subtle toast that appears when new data is detected and the dashboard
 * auto-refreshes. Shows the new freshest date and source.
 * Dismissed by user click — stays visible until acknowledged.
 */
export function DataUpdateToast() {
  const dataUpdateTimestamp = useAppStore((s) => s.dataUpdateTimestamp);
  const metadata = useAppStore((s) => s.metadata);

  const lagLabel = useMemo(() => {
    if (!metadata?.freshest_date) return '';
    try {
      const hours = differenceInHours(Date.now(), new Date(metadata.freshest_date + 'T00:00:00'));
      return hours < 24 ? '· T-1' : `${Math.round(hours / 24)}d lag`;
    } catch {
      return '';
    }
  }, [metadata?.freshest_date]);

  if (!dataUpdateTimestamp) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-elevated)] backdrop-blur-xl border border-emerald-400/20 shadow-2xl px-4 py-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-400/10 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            New batch detected
          </span>
          {metadata?.freshest_date && (
            <span className="text-[10px] text-[var(--text-muted)]">
              Data through {metadata.freshest_date}
              {metadata.freshest_source && (
                <span className="text-[var(--text-ghost)]">
                  {' '}({metadata.freshest_source}{' '}{lagLabel})
                </span>
              )}
            </span>
          )}
        </div>
        <button
          onClick={() => useAppStore.getState().setDataUpdateTimestamp(null)}
          className="ml-2 p-1 rounded-md hover:bg-[var(--surface-card)] text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
