'use client';

import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface MetaData {
  headline: {
    latest_date: string;
    next_update_approx: string;
    lag_days: number;
  };
}

export function NotificationBell() {
  const [meta, setMeta] = useState<MetaData | null>(null);

  useEffect(() => {
    fetch('/api/metadata')
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => {});
  }, []);

  const nextUpdate = meta?.headline.next_update_approx;
  const isOverdue = nextUpdate
    ? new Date(nextUpdate.replace('~', '')) < new Date()
    : false;
  const hasNotification = isOverdue;
  const overdueDays = isOverdue && nextUpdate
    ? Math.floor((Date.now() - new Date(nextUpdate.replace('~', '')).getTime()) / 864e5)
    : 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-active)] transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {hasNotification && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 bg-[var(--bg-dropdown)]/95 backdrop-blur-xl border border-[var(--border-subtle)] rounded-xl"
      >
        <DropdownMenuLabel className="text-xs font-semibold text-[var(--text-secondary)]">
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--surface-hover)]" />

        {meta ? (
          <>
            {isOverdue && (
              <DropdownMenuItem className="flex items-start gap-3 py-3 cursor-default">
                <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-orange-300">
                    Headline data overdue
                  </p>
                  <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                    Expected ~{format(new Date(nextUpdate!.replace('~', '')), 'dd MMM yyyy')}
                    {overdueDays > 0 && ` · ${overdueDays}d overdue`}
                  </p>
                </div>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem className="flex items-start gap-3 py-3 cursor-default">
              <Clock className="w-4 h-4 text-[var(--accent-primary)] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  Latest data available
                </p>
                <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                  {meta.headline.latest_date
                    ? format(new Date(meta.headline.latest_date + 'T00:00:00'), 'dd MMM yyyy')
                    : '—'}
                  {' · '}~{meta.headline.lag_days}d publication lag
                </p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem className="flex items-start gap-3 py-3 cursor-default">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  Holiday data source active
                </p>
                <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                  Malaysia Calendar API — confirmed + estimated dates loaded
                </p>
              </div>
            </DropdownMenuItem>
          </>
        ) : (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-[var(--text-faint)]">Loading notifications...</p>
          </div>
        )}

        <DropdownMenuSeparator className="bg-[var(--surface-hover)]" />
        <div className="px-3 py-2">
          <p className="text-[9px] text-[var(--text-ghost)]">
            Notifications are computed from data.gov.my metadata
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
