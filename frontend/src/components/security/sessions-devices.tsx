"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/global/primitives/button";
import { useSecurity } from "@/providers/security/security-provider";

import { SecurityPage } from "./security-page";

function SessionsDevices() {
  const t = useTranslations("SecuritySessions");
  const { sessions, revoke, revokeOthers } = useSecurity();
  const [busy, setBusy] = useState("");

  return (
    <SecurityPage title={t("title")} description={t("description")}>
      <div className="flex justify-end">
        <Button
          disabled={Boolean(busy) || sessions.length < 2}
          onClick={async () => {
            setBusy("all");
            try {
              await revokeOthers();
            } finally {
              setBusy("");
            }
          }}
        >
          {t("revokeOthers")}
        </Button>
      </div>
      <div className="space-y-3">
        {sessions.map((session) => (
          <article
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"
            key={session.id}
          >
            <div>
              <h2 className="font-semibold">
                {session.device_label}{" "}
                {session.current ? `· ${t("current")}` : ""}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {[
                  session.browser,
                  session.operating_system,
                  session.ip_address,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {t("lastSeen", {
                  date: new Date(session.last_seen_at).toLocaleString(),
                })}
              </p>
            </div>
            {!session.current ? (
              <Button
                disabled={Boolean(busy)}
                onClick={async () => {
                  setBusy(session.id);
                  try {
                    await revoke(session.id);
                  } finally {
                    setBusy("");
                  }
                }}
                variant="secondary"
              >
                {t("revoke")}
              </Button>
            ) : null}
          </article>
        ))}
      </div>
    </SecurityPage>
  );
}

export { SessionsDevices };
