"use client";

import { CircleHelp, PackagePlus, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { StockProgressiveWorkspaceV2 } from "@/components/commerce/stock/stock-progressive-workspace-v2";
import { StockReceiptList } from "@/components/commerce/stock/stock-receipt-list";
import { Button } from "@/components/global/primitives/button";
import { Tooltip } from "@/components/global/primitives/tooltip";

function StockRecorderV2({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceStockV2");
  const stockT = useTranslations("CommerceStock");
  const [recordingOpen, setRecordingOpen] = useState(false);
  const [activeStage, setActiveStage] = useState<0 | 1 | 2 | 3>(0);
  const help = [t("help.stock"), t("help.catalog"), t("help.record"), t("help.review")][activeStage];

  return (
    <div className="stock-recorder-v2-shell grid min-w-0 gap-4">
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

      <div
        className="stock-progressive-v2-host min-w-0 max-w-full"
        data-recording-open={recordingOpen ? "true" : "false"}
      >
        <StockProgressiveWorkspaceV2 businessId={businessId} onStageChange={setActiveStage} />
      </div>

      <StockReceiptList businessId={businessId} />

      <style jsx global>{`
        .stock-progressive-v2-host[data-recording-open="false"]
          > div
          > section:first-child {
          display: none;
        }

        .stock-progressive-v2-host
          > div
          > section:nth-of-type(2) {
          border-radius: 0.5rem;
        }

        .stock-progressive-v2-host
          > div
          > section:nth-of-type(2)
          > div:last-child {
          display: none;
        }
      `}</style>
    </div>
  );
}

export { StockRecorderV2 };
