"use client";

import { CircleHelp, PackagePlus, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { StockProgressiveWorkspaceV2 } from "@/components/commerce/stock/stock-progressive-workspace-v2";
import { Button } from "@/components/global/primitives/button";
import { Tooltip } from "@/components/global/primitives/tooltip";

function StockRecorderV2({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceStockV2");
  const stockT = useTranslations("CommerceStock");
  const [recordingOpen, setRecordingOpen] = useState(false);
  const [activeStage, setActiveStage] = useState<0 | 1 | 2 | 3>(0);
  const help = [t("help.stock"), t("help.catalog"), t("help.record"), t("help.review")][activeStage];

  return (
    <div className="stock-recorder-shell grid min-w-0 gap-4">
      <section className="rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200 sm:text-sm">
              {stockT("launcher.title")}
            </p>
            <Tooltip content={recordingOpen ? help : stockT("launcher.description")} side="top">
              <button
                aria-label={recordingOpen ? help : stockT("launcher.description")}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                type="button"
              >
                <CircleHelp className="size-3.5" />
              </button>
            </Tooltip>
          </div>
          <Button
            aria-expanded={recordingOpen}
            className="h-8 shrink-0 px-3 text-xs"
            type="button"
            variant="outline"
            onClick={() => setRecordingOpen((current) => !current)}
          >
            {recordingOpen ? <X className="size-3.5" /> : <PackagePlus className="size-3.5" />}
            {recordingOpen ? stockT("launcher.close") : stockT("launcher.start")}
          </Button>
        </div>
      </section>

      <div className="stock-progressive-host min-w-0 max-w-full">
        <div className={recordingOpen ? "block" : "hidden"}>
          <StockProgressiveWorkspaceV2 businessId={businessId} onStageChange={setActiveStage} />
        </div>
      </div>
    </div>
  );
}

export { StockRecorderV2 };
