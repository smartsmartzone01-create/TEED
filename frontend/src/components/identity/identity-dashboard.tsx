"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { Link, useRouter } from "@/i18n/navigation";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { logoutCurrentSession } from "@/services/identity/entry";

function IdentityDashboard() {
  const t = useTranslations("Dashboard");
  const loginT = useTranslations("Login");
  const common = useTranslations("IdentityCommon");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { clearSession, status, user } = useIdentitySession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logoutCurrentSession();
    } catch {
      notify({
        message: errorsT("unexpected_error"),
        tone: "error",
      });
    } finally {
      clearSession();
      setIsLoggingOut(false);
      router.push("/login");
    }
  }

  if (status === "initializing") {
    return (
      <main className="page-container flex min-h-[70svh] items-center justify-center py-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          {common("restoringSession")}
        </div>
      </main>
    );
  }

  if (!user?.isOnboardingComplete) {
    return (
      <main className="page-container flex min-h-[70svh] items-center justify-center py-12">
        <div className="max-w-md text-center">
          <p className="text-muted-foreground">
            {loginT("cardDescription")}
          </p>
          <Button asChild className="mt-5">
            <Link href="/login">{loginT("submit")}</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container flex min-h-[70svh] items-center justify-center py-12">
      <section className="w-full max-w-2xl rounded-2xl border border-border bg-background p-8 text-center shadow-xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t("signedInAs", { email: user.email })}
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
