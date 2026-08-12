"use client";

import { ArrowUpRight, CheckCheck, Inbox, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/global/primitives/button";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";
import { useNotification } from "@/providers/global/notification-provider";
import { useNotifications } from "@/providers/notifications/notifications-provider";
import type { NotificationCategory, NotificationScope } from "@/types/notifications/notifications";

const categories = ["all", "security", "account", "workspace", "system"] as const;

function NotificationInbox({
  businessId,
  scope,
}: {
  businessId?: string;
  scope?: NotificationScope;
} = {}) {
  const t = useTranslations("NotificationInbox");
  const { notify } = useNotification();
  const {
    category,
    error,
    items,
    loading,
    markAllRead,
    markRead,
    page,
    refresh,
    setCategory,
    setPage,
    setUnreadOnly,
    setContextFilter,
    totalPages,
    unreadCount,
    unreadOnly,
  } = useNotifications();

  useEffect(() => {
    setContextFilter(scope, businessId);
    return () => setContextFilter();
  }, [businessId, scope, setContextFilter]);

  async function run(action: () => Promise<void>, success?: string) {
    try {
      await action();
      if (success) notify({ message: success, tone: "success" });
    } catch (requestError) {
      notify({
        message: requestError instanceof Error ? requestError.message : t("actionFailed"),
        tone: "error",
      });
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-500">{t(scope === "workspace" ? "workspaceEyebrow" : "eyebrow")}</p>
          <h1 className="mt-2 text-2xl font-semibold">{t(scope === "workspace" ? "workspaceTitle" : "title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{t(scope === "workspace" ? "workspaceDescription" : "description")}</p>
        </div>
        <div className="flex gap-2">
          <Tooltip content={t("refreshTooltip")}>
            <Button onClick={() => void refresh()} size="icon" variant="outline">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </Button>
          </Tooltip>
          <Button disabled={unreadCount === 0} onClick={() => void run(markAllRead, t("allReadSuccess"))} variant="secondary">
            <CheckCheck className="size-4" />
            {t("markAllRead")}
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((item) => (
            <button
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold transition",
                category === item
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900",
              )}
              key={item}
              onClick={() => setCategory(item as NotificationCategory | "all")}
              type="button"
            >
              {t(`categories.${item}`)}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 px-2 text-xs font-medium text-slate-500">
            <input checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} type="checkbox" />
            {t("unreadOnly")}
          </label>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
          <p>{t("loadFailed")}</p>
          <Button className="mt-3" onClick={() => void refresh()}>{t("retry")}</Button>
        </div>
      ) : null}

      {!error && !loading && items.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-950">
          <Inbox className="size-8 text-slate-400" />
          <h2 className="mt-3 font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("emptyDescription")}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const titleKey = `templates.${item.template}.title`;
          const messageKey = `templates.${item.template}.message`;
          const title = t.has(titleKey) ? t(titleKey) : t("templates.default.title");
          const message = t.has(messageKey)
            ? t(messageKey, item.context)
            : t("templates.default.message");
          return (
            <article
              className={cn(
                "rounded-2xl border p-5 transition",
                item.is_read
                  ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                  : "border-blue-200 bg-blue-50/65 dark:border-blue-900 dark:bg-blue-950/25",
              )}
              key={item.id}
            >
              <div className="flex gap-4">
                <span className={cn("mt-2 size-2.5 shrink-0 rounded-full", item.is_read ? "bg-slate-300 dark:bg-slate-700" : "bg-blue-500")} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(`categories.${item.category}`)}</span>
                      <h2 className="mt-1 font-semibold">{title}</h2>
                    </div>
                    <time className="text-xs text-slate-400" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!item.is_read ? (
                      <Button onClick={() => void run(() => markRead(item.id))} size="small" variant="secondary">{t("markRead")}</Button>
                    ) : null}
                    {item.action_path ? (
                      <Tooltip content={t("openActionTooltip")}>
                        <Button asChild size="small" variant="outline">
                          <Link href={item.action_path as never} onClick={() => void markRead(item.id)}>
                            {t("openAction")}<ArrowUpRight className="size-4" />
                          </Link>
                        </Button>
                      </Tooltip>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <nav aria-label={t("paginationLabel")} className="flex items-center justify-between">
          <Button disabled={page <= 1} onClick={() => setPage(page - 1)} variant="outline">{t("previous")}</Button>
          <span className="text-sm text-slate-500">{t("page", { page, total: totalPages })}</span>
          <Button disabled={page >= totalPages} onClick={() => setPage(page + 1)} variant="outline">{t("next")}</Button>
        </nav>
      ) : null}
    </div>
  );
}

export { NotificationInbox };
