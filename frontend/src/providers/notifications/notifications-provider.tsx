"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { ApiClientError } from "@/services/global/api-client";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications/notifications";
import type {
  NotificationCategory,
  NotificationItem,
} from "@/types/notifications/notifications";

type ContextValue = {
  category: NotificationCategory | "all";
  error: Error | null;
  items: NotificationItem[];
  loading: boolean;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  page: number;
  refresh: () => Promise<void>;
  setCategory: (category: NotificationCategory | "all") => void;
  setPage: (page: number) => void;
  setUnreadOnly: (value: boolean) => void;
  totalPages: number;
  unreadCount: number;
  unreadOnly: boolean;
};

const NotificationsContext = createContext<ContextValue | null>(null);

function NotificationsProvider({ children }: { children: ReactNode }) {
  const { accessToken, clearSession, refreshAccessToken } = useIdentitySession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPageState] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategoryState] = useState<NotificationCategory | "all">("all");
  const [unreadOnly, setUnreadOnlyState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const withToken = useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    if (!accessToken) throw new Error("Authentication required.");
    try {
      return await operation(accessToken);
    } catch (requestError) {
      if (!(requestError instanceof ApiClientError) || requestError.details.kind !== "unauthenticated") throw requestError;
      try {
        return await operation(await refreshAccessToken());
      } catch (refreshError) {
        clearSession();
        throw refreshError;
      }
    }
  }, [accessToken, clearSession, refreshAccessToken]);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const response = await withToken((token) =>
        getNotifications(token, { category, page, unreadOnly }),
      );
      setItems(response.data?.notifications ?? []);
      setUnreadCount(response.data?.unread_count ?? 0);
      setTotalPages(Number(response.meta?.total_pages ?? 1));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error("Notification request failed."));
    } finally {
      setLoading(false);
    }
  }, [accessToken, category, page, unreadOnly, withToken]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 30000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const value = useMemo<ContextValue>(() => ({
    category,
    error,
    items,
    loading,
    markAllRead: async () => {
      await withToken(markAllNotificationsRead);
      await refresh();
    },
    markRead: async (id) => {
      const item = items.find((notification) => notification.id === id);
      if (item?.is_read) return;
      await withToken((token) => markNotificationRead(token, id));
      await refresh();
    },
    page,
    refresh,
    setCategory: (next) => {
      setCategoryState(next);
      setPageState(1);
    },
    setPage: setPageState,
    setUnreadOnly: (next) => {
      setUnreadOnlyState(next);
      setPageState(1);
    },
    totalPages,
    unreadCount,
    unreadOnly,
  }), [category, error, items, loading, page, refresh, totalPages, unreadCount, unreadOnly, withToken]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used inside NotificationsProvider.");
  return context;
}

export { NotificationsProvider, useNotifications };
