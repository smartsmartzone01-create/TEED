"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";

import { Tooltip } from "@/components/global/primitives/tooltip";
import { Link } from "@/i18n/navigation";
import { useNotifications } from "@/providers/notifications/notifications-provider";

function NotificationBell() {
  const t = useTranslations("NotificationInbox");
  const { unreadCount } = useNotifications();

  return (
    <Tooltip content={t("bellTooltip", { count: unreadCount })}>
      <Link
        aria-label={t("bellLabel", { count: unreadCount })}
        className="relative inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
        href="/dashboard/notifications"
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>
    </Tooltip>
  );
}

export { NotificationBell };
