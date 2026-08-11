"use client";

import { useEffect } from "react";

import { Button } from "@/components/global/primitives/button";
import { useRouter } from "@/i18n/navigation";
import { useWorkspace } from "@/providers/workspace/workspace-provider";

function WorkspaceEntry() {
  const router = useRouter();
  const { businesses, refresh, status } = useWorkspace();

  useEffect(() => {
    if (status !== "ready") return;
    if (businesses[0]) router.replace(`/workspace/${businesses[0].id}`);
    else router.replace("/dashboard/workspaces");
  }, [businesses, router, status]);

  if (status === "error") {
    return <Button onClick={() => void refresh()}>Try again</Button>;
  }
  return <p className="text-sm text-slate-500">Loading workspace…</p>;
}

export { WorkspaceEntry };
