import {
  notificationActionSchema,
  notificationListSchema,
} from "@/schemas/notifications/notifications";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";
import type { NotificationCategory } from "@/types/notifications/notifications";

type ListOptions = {
  category?: NotificationCategory | "all";
  page?: number;
  unreadOnly?: boolean;
};

function getNotifications(accessToken: string, options: ListOptions = {}) {
  const query = new URLSearchParams();
  if (options.category && options.category !== "all") query.set("category", options.category);
  if (options.page && options.page > 1) query.set("page", String(options.page));
  if (options.unreadOnly) query.set("unread", "true");
  const suffix = query.size ? `?${query.toString()}` : "";
  return requestApi({
    accessToken,
    path: `/api/v1/notifications/me/${suffix}`,
    schema: notificationListSchema,
  });
}

function markNotificationRead(accessToken: string, notificationId: string) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: {},
      csrfToken,
      method: "POST",
      path: `/api/v1/notifications/me/${notificationId}/read/`,
      schema: notificationActionSchema,
    }),
  );
}

function markAllNotificationsRead(accessToken: string) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: {},
      csrfToken,
      method: "POST",
      path: "/api/v1/notifications/me/read-all/",
      schema: notificationActionSchema,
    }),
  );
}

export { getNotifications, markAllNotificationsRead, markNotificationRead };
export type { ListOptions };
