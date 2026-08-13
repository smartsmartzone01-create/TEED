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
  NotificationScope,
} from "@/types/notifications/notifications";

type ContextValue = {
  category: NotificationCategory | "all";
  error: Error | null;
  items: NotificationItem[];
  loading: boolean;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  loadUnreadCount: (scope?: NotificationScope, businessId?: string) => Promise<number>;
  page: number;
  refresh: () => Promise<void>;
  setCategory: (category: NotificationCategory | "all") => void;
  setPage: (page: number) => void;
  setUnreadOnly: (value: boolean) => void;
  totalPages: number;
  unreadCount: number;
  unreadOnly: boolean;
  setContextFilter: (scope?: NotificationScope, businessId?: string) => void;
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
  const [scope, setScope] = useState<NotificationScope | undefined>();
  const [businessId, setBusinessId] = useState<string | undefined>();

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
        getNotifications(token, {
          businessId,
          category,
          page,
          scope,
          surface: scope ? undefined : "dashboard",
          unreadOnly,
        }),
      );
      setItems(response.data?.notifications ?? []);
      setUnreadCount(response.data?.unread_count ?? 0);
      setTotalPages(Number(response.meta?.total_pages ?? 1));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error("Notification request failed."));
    } finally {
      setLoading(false);
    }
  }, [accessToken, businessId, category, page, scope, unreadOnly, withToken]);

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

  const setContextFilter = useCallback(
    (nextScope?: NotificationScope, nextBusinessId?: string) => {
      setScope(nextScope);
      setBusinessId(nextBusinessId);
      setPageState(1);
    },
    [],
  );

  const loadUnreadCount = useCallback(
    async (nextScope?: NotificationScope, nextBusinessId?: string) => {
      const response = await withToken((token) =>
        getNotifications(token, {
          businessId: nextBusinessId,
          scope: nextScope,
          surface: nextScope ? undefined : "dashboard",
          unreadOnly: true,
        }),
      );
      return response.data?.unread_count ?? 0;
    },
    [withToken],
  );

  const value = useMemo<ContextValue>(() => ({
    category,
    error,
    items,
    loading,
    loadUnreadCount,
    markAllRead: async () => {
      await withToken((token) =>
        markAllNotificationsRead(token, {
          businessId,
          scope,
          surface: scope ? undefined : "dashboard",
        }),
      );
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
    setContextFilter,
    totalPages,
    unreadCount,
    unreadOnly,
  }), [businessId, category, error, items, loadUnreadCount, loading, page, refresh, scope, setContextFilter, totalPages, unreadCount, unreadOnly, withToken]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used inside NotificationsProvider.");
  return context;
}

export { NotificationsProvider, useNotifications };
