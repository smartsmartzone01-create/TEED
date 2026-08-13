"use client";

import {
  ArrowRight,
  KeyRound,
  ScrollText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { BusinessPage } from "@/components/workspace/business-page";
import { Button } from "@/components/global/primitives/button";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { Link } from "@/i18n/navigation";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import { isRequestCancelled } from "@/services/global/api-client";
import type { BusinessSecurityData } from "@/types/workspace/workspace";

function BusinessSecurity({
  businessId,
  view = "overview",
}: {
  businessId: string;
  view?: "audit" | "control" | "overview";
}) {
  const t = useTranslations("BusinessSecurity");
  const { createControl, decideControl, loadSecurity } = useWorkspace();
  const { notify } = useNotification();
  const [data, setData] = useState<BusinessSecurityData | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void loadSecurity(businessId, controller.signal)
      .then(setData)
      .catch((error) => {
        if (!isRequestCancelled(error)) setData(null);
      });
    return () => controller.abort();
  }, [businessId, loadSecurity]);
  if (!data) return <p className="text-sm text-slate-500">{t("loading")}</p>;

  if (view === "audit")
    return (
      <BusinessPage
        description={t("audit.description")}
        title={t("audit.title")}
      >
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {data.recent_events.length ? (
            data.recent_events.map((event) => (
              <article
                className="bg-white p-4 dark:bg-slate-950"
                key={event.id}
              >
                <p className="text-sm font-semibold">{event.event_type}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {event.actor_email ?? t("system")} ·{" "}
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </article>
            ))
          ) : (
            <p className="p-5 text-sm text-slate-500">{t("audit.empty")}</p>
          )}
        </div>
      </BusinessPage>
    );
  if (view === "control") {
    const reload = async () => setData(await loadSecurity(businessId));
    const request = async (
      action: "cancel_deletion" | "delete" | "disable" | "reactivate",
    ) => {
      try {
        const control = await createControl(businessId, action);
        await reload();
        notify({
          message: t(
            control.status === "approved"
              ? "control.completed"
              : "control.requested",
          ),
          tone: "success",
        });
      } catch {
        notify({ message: t("control.failed"), tone: "error" });
      }
    };
    const decide = async (
      requestId: string,
      decision: "approve" | "reject",
    ) => {
      try {
        await decideControl(businessId, requestId, decision);
        await reload();
        notify({ message: t("control.decided"), tone: "success" });
      } catch {
        notify({ message: t("control.failed"), tone: "error" });
      }
    };
    return (
      <BusinessPage
        description={t("control.description")}
        title={t("control.title")}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
          <KeyRound className="size-5 text-amber-700" />
          <h3 className="mt-3 font-semibold">{t("control.protected")}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {t(data.can_control ? "control.available" : "control.unavailable")}
          </p>
          {data.business.deletion_scheduled_for ? (
            <p className="mt-3 text-sm font-semibold text-amber-800 dark:text-amber-300">
              {t("control.scheduledFor", {
                date: new Date(data.business.deletion_scheduled_for).toLocaleString(),
              })}
            </p>
          ) : null}
        </div>
        {data.can_control ? (
          <section>
            <h3 className="mb-3 font-semibold">{t("control.start")}</h3>
            <div className="flex flex-wrap gap-2">
              {data.business.status === "active" ? (
                <>
                  <Button
                    onClick={() => void request("disable")}
                    variant="outline"
                  >
                    {t("control.disable")}
                  </Button>
                  <Button
                    onClick={() => void request("delete")}
                    variant="outline"
                  >
                    {t("control.delete")}
                  </Button>
                </>
              ) : null}
              {data.business.status === "disabled" ? (
                <>
                  <Button
                    onClick={() => void request("reactivate")}
                    variant="outline"
                  >
                    {t("control.reactivate")}
                  </Button>
                  <Button
                    onClick={() => void request("delete")}
                    variant="outline"
                  >
                    {t("control.delete")}
                  </Button>
                </>
              ) : null}
              {data.business.status === "deletion_pending" ? (
                <Button
                  onClick={() => void request("cancel_deletion")}
                  variant="outline"
                >
                  {t("control.cancelDeletion")}
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}
        <section>
          <h3 className="mb-3 font-semibold">
            {t("control.pending", { count: data.pending_controls.length })}
          </h3>
          <div className="grid gap-3">
            {data.pending_controls.map((control) => (
              <article
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                key={control.id}
              >
                <p className="text-sm font-semibold">
                  {t(`control.actions.${control.action}`)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(control.created_at).toLocaleString()}
                </p>
                {data.can_control ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => void decide(control.id, "approve")}
                      size="small"
                    >
                      {t("control.approve")}
                    </Button>
                    <Button
                      onClick={() => void decide(control.id, "reject")}
                      size="small"
                      variant="outline"
                    >
                      {t("control.reject")}
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </BusinessPage>
    );
  }

  const cards = [
    {
      icon: ScrollText,
      key: "audit",
      href: `/workspace/${businessId}/security/audit`,
    },
    {
      icon: KeyRound,
      key: "control",
      href: `/workspace/${businessId}/security/control`,
    },
  ] as const;
  return (
    <BusinessPage
      description={t("description")}
      eyebrow={t("eyebrow")}
      title={t("title")}
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <ShieldCheck className="size-5 text-emerald-600" />
          <p className="mt-3 text-sm font-semibold">{t("role")}</p>
          <p className="mt-1 text-sm text-slate-500">{data.membership.role}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <UsersRound className="size-5" />
          <p className="mt-3 text-sm font-semibold">{t("controllers")}</p>
          <p className="mt-1 text-2xl font-semibold">
            {data.controllers.length}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <KeyRound className="size-5" />
          <p className="mt-3 text-sm font-semibold">{t("permissions")}</p>
          <p className="mt-1 text-2xl font-semibold">
            {data.permissions.length}
          </p>
        </article>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        {cards.map(({ icon: Icon, key, href }) => (
          <Tooltip content={t(`${key}.tooltip`)} key={key}>
            <Link
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              href={href}
            >
              <Icon className="size-5" />
              <h3 className="mt-4 font-semibold">{t(`${key}.title`)}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {t(`${key}.description`)}
              </p>
              <ArrowRight className="mt-4 size-4 transition group-hover:translate-x-1" />
            </Link>
          </Tooltip>
        ))}
      </section>
    </BusinessPage>
  );
}

export { BusinessSecurity };
