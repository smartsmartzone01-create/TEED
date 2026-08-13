"use client";

import { useEffect } from "react";

import { BusinessLifecycleState } from "@/components/workspace/business-lifecycle-state";
import { useRouter } from "@/i18n/navigation";
import { useWorkspace } from "@/providers/workspace/workspace-provider";

function DashboardBusinessLifecycle({ businessId }: { businessId: string }) {
  const router = useRouter();
  const { businesses, status } = useWorkspace();
  const business = businesses.find((candidate) => candidate.id === businessId);

  useEffect(() => {
    if (status !== "ready") return;
    if (!business) {
      router.replace("/dashboard/workspaces");
      return;
    }
    if (business.status === "active") {
      router.replace(`/workspace/${business.id}`);
    }
  }, [business, router, status]);

  if (status === "loading" || !business || business.status === "active") {
    return null;
  }

  return <BusinessLifecycleState business={business} />;
}

export { DashboardBusinessLifecycle };
