'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bell,
  Database,
  AlertTriangle,
  Brain,
  TrendingUp,
  Settings,
  Check,
  Loader2,
} from 'lucide-react';
import { useAppStore, type NotificationItem } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';

// ─── Icon by notification type ──────────────────────────────────────

function NotificationIcon({ type, severity }: { type: NotificationItem['type']; severity: NotificationItem['severity'] }) {
  const colorMap: Record<NotificationItem['severity'], string> = {
    info: 'text-[var(--text-muted)]',
    warning: 'text-amber-400',
    success: 'text-emerald-400',
    critical: 'text-red-400',
  };

  const Icon = {
    data_update: Database,
    anomaly: AlertTriangle,
    insight: Brain,
    projection: TrendingUp,
    system: Settings,
  }[type];

  return (
    <div className={`shrink-0 ${colorMap[severity]}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

// ─── Severity indicator ─────────────────────────────────────────────

function SeverityDot({ severity }: { severity: NotificationItem['severity'] }) {
  const colorMap: Record<NotificationItem['severity'], string> = {
    info: 'bg-[var(--text-ghost)]',
    warning: 'bg-amber-400',
    success: 'bg-emerald-400',
    critical: 'bg-red-400',
  };
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorMap[severity]}`} />;
}

// ─── Source badge ───────────────────────────────────────────────────

function SourceBadge({ source }: { source: NotificationItem['source'] }) {
  const colorMap: Record<NotificationItem['source'], string> = {
    'KTMB OD': 'bg-teal-400/10 text-teal-400 border-teal-400/20',
    'Rapid Rail OD': 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    'Headline Audit': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    'Analytics Engine': 'bg-[#85AB8B]/10 text-[#85AB8B] border-[#85AB8B]/20',
    'System': 'bg-[var(--surface-active)] text-[var(--text-muted)] border-[var(--border-subtle)]',
  };

  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${colorMap[source]}`}>
      {source}
    </span>
  );
}

// ─── Time grouping ──────────────────────────────────────────────────

function groupByTime(notifications: NotificationItem[]) {
  const now = Date.now();
  const groups: { label: string; items: NotificationItem[] }[] = [
    { label: 'Just now', items: [] },
    { label: 'Today', items: [] },
    { label: 'Earlier', items: [] },
  ];

  for (const n of notifications) {
    const age = now - new Date(n.timestamp).getTime();
    if (age < 10 * 60 * 1000) {
      // 10 minutes
      groups[0].items.push(n);
    } else if (age < 24 * 60 * 60 * 1000) {
      groups[1].items.push(n);
    } else {
      groups[2].items.push(n);
    }
  }

  return groups.filter(g => g.items.length > 0);
}

// ─── Single notification row ───────────────────────────────────────

function NotificationRow({
  item,
  onRead,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
}) {
  const relativeTime = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  }, [item.timestamp]);

  return (
    <button
      onClick={() => onRead(item.id)}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-hover)] transition-colors duration-150 border-b border-[var(--border-faint)] last:border-b-0 ${
        !item.read ? 'bg-[var(--surface-card)]' : ''
      }`}
    >
      {/* Left: severity + icon */}
      <div className="flex flex-col items-center gap-1.5 pt-0.5">
        {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
        {item.read && <span className="w-1.5 h-1.5" />}
        <NotificationIcon type={item.type} severity={item.severity} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-[var(--text-primary)] truncate">
            {item.title}
          </span>
        </div>
        <p className="text-[10px] text-[var(--text-faint)] leading-relaxed line-clamp-2 mb-1.5">
          {item.description}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge source={item.source} />
          <SeverityDot severity={item.severity} />
          <span className="text-[9px] text-[var(--text-ghost)]">{relativeTime}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = useAppStore((s) => s.unreadCount);
  const notifications = useAppStore((s) => s.notifications);
  const lastSynced = useAppStore((s) => s.lastSynced);
  const loadingNotifications = useAppStore((s) => s.loadingNotifications);
  const markAsRead = useAppStore((s) => s.markAsRead);
  const markAllRead = useAppStore((s) => s.markAllRead);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close panel on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const grouped = useMemo(() => groupByTime(notifications), [notifications]);
  const syncLabel = useMemo(() => {
    if (!lastSynced) return 'Not synced yet';
    try {
      return formatDistanceToNow(new Date(lastSynced), { addSuffix: true });
    } catch {
      return '';
    }
  }, [lastSynced]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-active)] transition-all duration-200"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-red-500 rounded-full shadow-sm shadow-red-500/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 backdrop-blur-xl shadow-2xl shadow-black/20 z-50 animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium text-[var(--text-muted)] px-1.5 py-0.5 rounded-full bg-[var(--surface-active)]">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAllRead();
                }}
                className="flex items-center gap-1 text-[10px] font-medium text-[#85AB8B] hover:text-[#85AB8B]/80 transition-colors"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Body: scrollable notification list */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {loadingNotifications ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-[var(--text-ghost)] animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Bell className="w-8 h-8 text-[var(--text-ghost)]" />
                <p className="text-xs text-[var(--text-faint)]">No notifications yet</p>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.label}>
                  <div className="px-4 py-2 bg-[var(--surface-card)]/50">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-ghost)]">
                      {group.label}
                    </span>
                  </div>
                  {group.items.map((item) => (
                    <NotificationRow key={item.id} item={item} onRead={markAsRead} />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[var(--border-faint)] bg-[var(--surface-card)]/30 rounded-b-2xl">
            <p className="text-[9px] text-[var(--text-ghost)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#85AB8B]/50" />
              Last synced: {syncLabel}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
