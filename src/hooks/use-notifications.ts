'use client';

import { useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/store';

interface NotificationsResponse {
  notifications: import('@/lib/store').NotificationItem[];
  analytics: import('@/lib/store').AnalyticsState;
  freshness: import('@/lib/store').DataFreshness;
  generatedAt: string;
}

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useNotifications() {
  const {
    setNotifications,
    setAnalyticsState,
    setFreshness,
    setLastSynced,
    setLoadingNotifications,
    loadingNotifications,
    notifications,
    unreadCount,
    freshness,
    analyticsState,
    lastSynced,
    markAsRead,
    markAllRead,
  } = useAppStore(
    useShallow((s) => ({
      setNotifications: s.setNotifications,
      setAnalyticsState: s.setAnalyticsState,
      setFreshness: s.setFreshness,
      setLastSynced: s.setLastSynced,
      setLoadingNotifications: s.setLoadingNotifications,
      loadingNotifications: s.loadingNotifications,
      notifications: s.notifications,
      unreadCount: s.unreadCount,
      freshness: s.freshness,
      analyticsState: s.analyticsState,
      lastSynced: s.lastSynced,
      markAsRead: s.markAsRead,
      markAllRead: s.markAllRead,
    }))
  );

  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data: NotificationsResponse = await res.json();

      setNotifications(data.notifications);
      setAnalyticsState(data.analytics);
      setFreshness(data.freshness);
      setLastSynced(data.generatedAt);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  }, [setNotifications, setAnalyticsState, setFreshness, setLastSynced, setLoadingNotifications]);

  useEffect(() => {
    fetchNotifications();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchNotifications, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    freshness,
    analyticsState,
    lastSynced,
    loadingNotifications,
    markAsRead,
    markAllRead,
    refetch: fetchNotifications,
  };
}
