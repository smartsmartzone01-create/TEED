"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { useRouter } from "@/i18n/navigation";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { logoutCurrentSession } from "@/services/identity/entry";

function IdentityDashboard() {
  const t = useTranslations("Dashboard");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { clearSession, user } = useIdentitySession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logoutCurrentSession();
      clearSession();
      router.replace("/login");
    } catch {
      notify({
        message: errorsT("logout_failed"),
        tone: "error",
      });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="page-container flex min-h-[70svh] items-center justify-center py-12">
      <section className="w-full max-w-2xl rounded-2xl border border-border bg-background p-8 text-center shadow-xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t("signedInAs", { email: user?.email ?? "" })}
        </p>
        <p className="mt-6 leading-7 text-muted-foreground">
          {t("description")}
        </p>
        <Button
          className="mt-8"
          loading={isLoggingOut}
          onClick={handleLogout}
          variant="outline"
        >
          {t("logout")}
        </Button>
      </section>
    </main>
  );
}

export { IdentityDashboard };
