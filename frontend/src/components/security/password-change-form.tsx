"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { PasswordInput } from "@/components/global/primitives/password-input";
import { useRouter } from "@/i18n/navigation";
import { useNotification } from "@/providers/global/notification-provider";
import { useSecurity } from "@/providers/security/security-provider";

import { SecurityPage } from "./security-page";

function PasswordChangeForm() {
  const t = useTranslations("SecurityPassword");
  const { changePassword } = useSecurity();
  const { notify } = useNotification();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);

    try {
      await changePassword({
        current_password: String(data.get("current_password")),
        new_password: String(data.get("new_password")),
        confirm_password: String(data.get("confirm_password")),
      });
      form.reset();
      notify({
        message: t("success"),
        title: t("successTitle"),
        tone: "success",
      });
      router.push("/dashboard/security");
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : t("failure"),
        title: t("failureTitle"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SecurityPage title={t("title")} description={t("description")}>
      <form
        className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
        onSubmit={submit}
      >
        <label className="block text-sm font-medium">
          {t("current")}
          <PasswordInput
            className="mt-2"
            hideLabel={t("hidePassword")}
            name="current_password"
            required
            showLabel={t("showPassword")}
          />
        </label>
        <label className="block text-sm font-medium">
          {t("new")}
          <PasswordInput
            className="mt-2"
            hideLabel={t("hidePassword")}
            name="new_password"
            required
            showLabel={t("showPassword")}
          />
        </label>
        <label className="block text-sm font-medium">
          {t("confirm")}
          <PasswordInput
            className="mt-2"
            hideLabel={t("hidePassword")}
            name="confirm_password"
            required
            showLabel={t("showPassword")}
          />
        </label>

        <aside className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold">{t("rulesTitle")}</h2>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5">
                <li>{t("rules.length")}</li>
                <li>{t("rules.personal")}</li>
                <li>{t("rules.common")}</li>
                <li>{t("rules.reuse")}</li>
              </ul>
            </div>
          </div>
        </aside>

        <Button disabled={busy} type="submit">
          {busy ? t("saving") : t("save")}
        </Button>
      </form>
    </SecurityPage>
  );
}

export { PasswordChangeForm };
