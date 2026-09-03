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
    <main className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <BrandLoader label={t("title")} />
        <h1 className="mt-4 text-base font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("description")}
        </p>
      </div>
    </main>
  );
}

export { PostAuthRouter };
