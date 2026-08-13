"use client";

import { AlertTriangle, ArrowLeft, CalendarClock, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { BusinessIcon } from "@/components/workspace/business-icon";
import { Link } from "@/i18n/navigation";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import type { BusinessSecurityData, WorkspaceBusinessListItem } from "@/types/workspace/workspace";

function BusinessLifecycleState({ business }: { business: WorkspaceBusinessListItem }) {
  const t = useTranslations("BusinessLifecycleState");
  const { notify } = useNotification();
  const { createControl, decideControl, loadSecurity } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [security, setSecurity] = useState<BusinessSecurityData | null>(null);
  const pendingDeletion = business.status === "deletion_pending";

  async function reload() {
    setSecurity(await loadSecurity(business.id));
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadSecurity(business.id, controller.signal).then(setSecurity).catch(() => undefined);
    return () => controller.abort();
  }, [business.id, loadSecurity]);

  async function restore() {
    setBusy(true);
    try {
      const request = await createControl(
        business.id,
        pendingDeletion ? "cancel_deletion" : "reactivate",
      );
      await reload();
      notify({
        message: t(request.status === "approved" ? "restored" : "approvalRequested"),
        tone: "success",
      });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : t("failed"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function decide(requestId: string, decision: "approve" | "reject") {
    setBusy(true);
    try {
      await decideControl(business.id, requestId, decision);
      await reload();
      notify({ message: t("decisionRecorded"), tone: "success" });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : t("failed"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const expectedAction = pendingDeletion ? "cancel_deletion" : "reactivate";
  const pendingRequest = security?.pending_controls.find(
    (request) => request.action === expectedAction,
  );
  const initiatedByCurrentUser =
    pendingRequest?.initiated_by_id === security?.membership.user_id;

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-white sm:p-8">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <BusinessIcon
          className="size-14 rounded-2xl"
          logoUrl={business.logo_url}
          name={business.name}
          primaryColor={business.primary_brand_color}
          secondaryColor={business.secondary_brand_color}
        />
        <p className="mt-6 text-xs font-semibold uppercase tracking-[.18em] text-slate-500">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {t(pendingDeletion ? "deletionTitle" : "disabledTitle", {
            name: business.name,
          })}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {t(pendingDeletion ? "deletionDescription" : "disabledDescription")}
        </p>
        {pendingDeletion && business.deletion_scheduled_for ? (
          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <CalendarClock className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t("recoveryWindow")}</p>
              <p className="mt-1 text-sm">
                {t("scheduledFor", {
                  date: new Date(business.deletion_scheduled_for).toLocaleString(),
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <p className="text-sm">{t("disabledNotice")}</p>
          </div>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {pendingRequest ? (
            initiatedByCurrentUser ? (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium dark:bg-slate-800">
                {t("awaitingApproval")}
              </p>
            ) : (
              <>
                <Button disabled={busy} onClick={() => void decide(pendingRequest.id, "approve")}>
                  {t("approveRecovery")}
                </Button>
                <Button disabled={busy} onClick={() => void decide(pendingRequest.id, "reject")} variant="outline">
                  {t("rejectRecovery")}
                </Button>
              </>
            )
          ) : (
            <Button disabled={busy} onClick={() => void restore()}>
              <RotateCcw className="size-4" />
              {t(pendingDeletion ? "cancelDeletion" : "reactivate")}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/dashboard/workspaces">
              <ArrowLeft className="size-4" />
              {t("back")}
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

export { BusinessLifecycleState };
