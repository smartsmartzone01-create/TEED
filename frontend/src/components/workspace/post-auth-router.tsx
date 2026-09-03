"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { BrandLoader } from "@/components/global/brand/brand-loader";
import { useRouter } from "@/i18n/navigation";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import { workspaceClassForType } from "@/utils/workspace/workspace-class";

function PostAuthRouter() {
  const t = useTranslations("WorkspaceRefinement.routing");
  const router = useRouter();
  const { businesses, status } = useWorkspace();
  const resolved = useRef(false);

  useEffect(() => {
    if (resolved.current || status === "loading") return;
    resolved.current = true;

    if (status === "error") {
      router.replace("/dashboard");
      return;
    }

    const hasBusinessWorkspace = businesses.some(
      (business) =>
        business.status === "active" &&
        workspaceClassForType(business.workspace_type) === "business",
    );
    router.replace(hasBusinessWorkspace ? "/workspaces" : "/dashboard");
  }, [businesses, router, status]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <BrandLoader label={t("title")} size="compact" />
        <h1 className="mt-3 text-lg font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t("description")}
        </p>
      </div>
    </main>
  );
}

export { PostAuthRouter };
