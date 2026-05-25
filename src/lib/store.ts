import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  type: 'data_update' | 'anomaly' | 'insight' | 'forecast' | 'system';
  title: string;
  description: string;
  timestamp: string; // ISO string
  read: boolean;
  source: 'KTMB OD' | 'Rapid Rail OD' | 'Headline Audit' | 'ML Engine' | 'System';
  severity: 'info' | 'warning' | 'success' | 'critical';
  meta?: Record<string, unknown>;
}

export interface DataFreshness {
  ktmb: { latest_date: string; lag_days: number };
  prasarana_od: { latest_date: string; lag_days: number };
  headline: { latest_date: string; lag_days: number };
  freshest_date: string;
  freshest_source: string;
  lastChecked: string; // ISO timestamp
}

export interface AnalyticsState {
  lastComputed: string;
  anomalyCount: number;
  trendDirection: 'up' | 'down' | 'stable';
  weeklyGrowthRate: number;
  peakDayOfWeek: string;
  lowDayOfWeek: string;
  weekendWeekdayRatio: number;
  forecastNext: number | null;
  forecastNext2: number | null;
  forecastNext3: number | null;
  forecastStdDev: number | null;
  anomalies: Array<{
    date: string;
    source: 'KTMB OD' | 'Rapid Rail OD';
    field: string;
    value: number;
    expected: number;
    deviation: number;
    severity: 'warning' | 'critical';
  }>;
  insights: string[];
}

interface AppState {
  // Notifications
  notifications: NotificationItem[];
  unreadCount: number;
  // Data freshness
  freshness: DataFreshness | null;
  // Analytics
  analyticsState: AnalyticsState | null;
  // UI
  lastSynced: string | null;
  loadingNotifications: boolean;
  // Actions
  setNotifications: (items: NotificationItem[]) => void;
  addNotifications: (items: NotificationItem[]) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  setFreshness: (data: DataFreshness) => void;
  setAnalyticsState: (state: AnalyticsState) => void;
  setLastSynced: (ts: string) => void;
  setLoadingNotifications: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  notifications: [],
  unreadCount: 0,
  freshness: null,
  analyticsState: null,
  lastSynced: null,
  loadingNotifications: false,

  setNotifications: (items) =>
    set({
      notifications: items,
      unreadCount: items.filter((n) => !n.read).length,
    }),

  addNotifications: (items) =>
    set((state) => {
      const existingIds = new Set(state.notifications.map((n) => n.id));
      const newItems = items.filter((n) => !existingIds.has(n.id));
      const merged = [...newItems, ...state.notifications];
      return {
        notifications: merged,
        unreadCount: merged.filter((n) => !n.read).length,
      };
    }),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(
        0,
        state.notifications.filter((n) => !n.read && n.id !== id).length
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  setFreshness: (data) => set({ freshness: data }),

  setAnalyticsState: (analytics) => set({ analyticsState: analytics }),

  setLastSynced: (ts) => set({ lastSynced: ts }),

  setLoadingNotifications: (loading) =>
    set({ loadingNotifications: loading }),
}));
