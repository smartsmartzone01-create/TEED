"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { useRouter } from "@/i18n/navigation";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { getBusinesses } from "@/services/workspace/workspace";
import { workspaceClassForType } from "@/utils/workspace/workspace-class";

function PostAuthRouter() {
  const t = useTranslations("WorkspaceRefinement.routing");
  const router = useRouter();
  const { accessToken, status } = useIdentitySession();
  const started = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken || started.current) return;
    started.current = true;

    const controller = new AbortController();
    void getBusinesses(accessToken, controller.signal)
      .then((response) => {
        const businesses = response.data?.businesses ?? [];
        const hasBusinessWorkspace = businesses.some(
          (business) =>
            business.status === "active" &&
            workspaceClassForType(business.workspace_type) === "business",
        );
        router.replace(hasBusinessWorkspace ? "/workspaces" : "/dashboard");
      })
      .catch(() => {
        if (!controller.signal.aborted) router.replace("/dashboard");
      });

    return () => controller.abort();
  }, [accessToken, router, status]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <LoaderCircle className="mx-auto size-5 animate-spin text-brand-orange" />
        <h1 className="mt-3 text-lg font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t("description")}
        </p>
      </div>
    </main>
  );
}

export { PostAuthRouter };
