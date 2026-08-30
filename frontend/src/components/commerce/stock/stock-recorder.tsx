"use client";

import { CircleHelp, PackagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { ProgressiveStockWorkspace } from "@/components/commerce/stock/stock-progressive-workspace";
import { Button } from "@/components/global/primitives/button";
import { Tooltip } from "@/components/global/primitives/tooltip";

function StockRecorder({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceStock");
  const hostRef = useRef<HTMLDivElement>(null);
  const [recordingOpen, setRecordingOpen] = useState(false);
  const [activeStage, setActiveStage] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const syncRecorderState = () => {
      const layout = host.querySelector<HTMLElement>(
        ":scope > div > section:first-child > div.grid:has(> aside)",
      );
      const editor = layout?.querySelector<HTMLElement>(":scope > div:last-child");
      const stepPanel = layout?.querySelector<HTMLElement>(":scope > aside");
      const navigation = stepPanel?.querySelector<HTMLElement>(":scope > div:last-child");

      layout?.classList.add("stock-recorder-layout");
      editor?.classList.add("stock-recorder-editor");
      stepPanel?.classList.add("stock-step-panel");
      navigation?.classList.add("stock-step-navigation");

      let nextStage: 0 | 1 | 2 | 3 = 3;
      if (editor?.querySelector('input[type="datetime-local"]')) {
        nextStage = 0;
      } else {
        const directForm = Array.from(editor?.children ?? []).find(
          (child): child is HTMLFormElement => child instanceof HTMLFormElement,
        );
        const directActiveInput = directForm?.querySelector(
          "input[data-stock-active-step]",
        );
        const isGroupRecorder = Boolean(
          directForm?.querySelector('input[name="group-method"]'),
        );
        const productDraftInput = Array.from(editor?.children ?? []).some((child) =>
          child.querySelector?.("form input[data-stock-active-step]"),
        );

        if (directActiveInput && !isGroupRecorder) {
          nextStage = 1;
        } else if (productDraftInput) {
          nextStage = 2;
        }
      }

      setActiveStage(nextStage);

      const lateDeliveryActive = Boolean(
        host.querySelector(
          ":scope > div > section:nth-of-type(2) > div:first-child > button",
        ),
      );
      if (lateDeliveryActive) setRecordingOpen(true);
    };

    const frame = window.requestAnimationFrame(syncRecorderState);
    const observer = new MutationObserver(syncRecorderState);
    observer.observe(host, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className="stock-recorder-shell grid min-w-0 gap-5"
      data-recording-open={recordingOpen ? "true" : "false"}
      data-stock-stage={activeStage}
    >
      <section className="stock-recording-launcher rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("launcher.title")}
            </p>
            <Tooltip content={t("launcher.description")} side="top">
              <button
                aria-label={t("launcher.description")}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                type="button"
              >
                <CircleHelp className="size-4" />
              </button>
            </Tooltip>
          </div>

          <Button
            aria-controls="stock-recording-workspace"
            aria-expanded={recordingOpen}
            className="shrink-0"
            type="button"
            variant="outline"
            onClick={() => setRecordingOpen((current) => !current)}
          >
            {recordingOpen ? <X className="size-4" /> : <PackagePlus className="size-4" />}
            {recordingOpen ? t("launcher.close") : t("launcher.start")}
          </Button>
        </div>
      </section>

      <div
        id="stock-recording-workspace"
        ref={hostRef}
        className="stock-progressive-host min-w-0 max-w-full"
      >
        <ProgressiveStockWorkspace businessId={businessId} />
      </div>

      <style jsx global>{`
        .stock-recorder-shell,
        .stock-progressive-host,
        .stock-progressive-host > div,
        .stock-progressive-host > div > section,
        .stock-recorder-layout,
        .stock-step-panel,
        .stock-recorder-editor {
          min-width: 0;
          max-width: 100%;
        }

        .stock-recorder-shell[data-recording-open="false"]
          .stock-progressive-host
          > div
          > section:first-child {
          display: none;
        }

        .stock-progressive-host > div > section:first-child {
          border-radius: 0.75rem;
        }

        .stock-recorder-layout {
          display: block !important;
        }

        .stock-step-panel {
          overflow: visible !important;
          border-right: 0 !important;
          border-bottom: 1px solid rgb(226 232 240);
        }

        .dark .stock-step-panel {
          border-bottom-color: rgb(30 41 59);
        }

        .stock-step-panel > div:first-child {
          display: none;
        }

        .stock-step-navigation {
          display: flex !important;
          flex-wrap: wrap;
          align-items: stretch;
          gap: 0.5rem;
          max-height: none !important;
          overflow: visible !important;
          padding: 0.75rem !important;
        }

        .stock-step-navigation > div:nth-child(n + 5) {
          display: none;
        }

        .stock-step-navigation > div:nth-child(-n + 4) {
          position: relative;
          min-width: 0;
          max-width: calc(50% - 0.25rem);
          flex: 1 1 calc(50% - 0.25rem);
          border: 0;
          border-radius: 0.5rem;
          background: transparent;
          padding: 0.55rem 0.65rem;
          color: rgb(100 116 139);
          transition:
            background-color 160ms ease,
            color 160ms ease,
            opacity 160ms ease;
        }

        .dark .stock-step-navigation > div:nth-child(-n + 4) {
          color: rgb(148 163 184);
        }

        .stock-step-navigation > div:nth-child(-n + 4) > div {
          min-width: 0;
          pointer-events: none;
        }

        .stock-step-navigation
          > div:nth-child(-n + 4)
          > div
          > p:first-child {
          color: inherit;
          font-size: 0.75rem;
          font-weight: 700;
          line-height: 1rem;
          overflow-wrap: anywhere;
          white-space: normal;
        }

        .stock-step-navigation
          > div:nth-child(-n + 4)
          > div
          > p:last-child {
          display: none;
        }

        .stock-step-navigation > div:nth-child(-n + 4) > button {
          position: absolute;
          inset: 0;
          z-index: 2;
          width: 100%;
          height: 100%;
          opacity: 0;
        }

        .stock-step-navigation > div:nth-child(-n + 4):has(> button) {
          cursor: pointer;
        }

        .stock-step-navigation
          > div:nth-child(-n + 4):has(> button:hover),
        .stock-step-navigation
          > div:nth-child(-n + 4):has(> button:focus-visible) {
          background: rgb(241 245 249);
          color: rgb(15 23 42);
        }

        .dark
          .stock-step-navigation
          > div:nth-child(-n + 4):has(> button:hover),
        .dark
          .stock-step-navigation
          > div:nth-child(-n + 4):has(> button:focus-visible) {
          background: rgb(30 41 59);
          color: rgb(248 250 252);
        }

        .stock-step-navigation > div:nth-child(-n + 4):not(:has(> button)) {
          opacity: 0.5;
        }

        .stock-recorder-shell[data-stock-stage="0"]
          .stock-step-navigation
          > div:nth-child(1),
        .stock-recorder-shell[data-stock-stage="1"]
          .stock-step-navigation
          > div:nth-child(2),
        .stock-recorder-shell[data-stock-stage="2"]
          .stock-step-navigation
          > div:nth-child(3),
        .stock-recorder-shell[data-stock-stage="3"]
          .stock-step-navigation
          > div:nth-child(4) {
          background: rgb(15 23 42);
          color: white;
          opacity: 1;
        }

        .dark
          .stock-recorder-shell[data-stock-stage="0"]
          .stock-step-navigation
          > div:nth-child(1),
        .dark
          .stock-recorder-shell[data-stock-stage="1"]
          .stock-step-navigation
          > div:nth-child(2),
        .dark
          .stock-recorder-shell[data-stock-stage="2"]
          .stock-step-navigation
          > div:nth-child(3),
        .dark
          .stock-recorder-shell[data-stock-stage="3"]
          .stock-step-navigation
          > div:nth-child(4) {
          background: white;
          color: rgb(15 23 42);
        }

        .stock-recorder-editor {
          min-height: 0 !important;
          overflow: visible !important;
          padding: 0.875rem !important;
        }

        .stock-recorder-editor form,
        .stock-recorder-editor .grid,
        .stock-recorder-editor label,
        .stock-recorder-editor input:not([type="radio"]):not([type="checkbox"]),
        .stock-recorder-editor select {
          min-width: 0;
          max-width: 100%;
        }

        .stock-recorder-editor input:not([type="radio"]):not([type="checkbox"]),
        .stock-recorder-editor select {
          width: 100%;
        }

        .stock-recorder-editor input[type="radio"],
        .stock-recorder-editor input[type="checkbox"] {
          width: auto;
          max-width: none;
        }

        .stock-recorder-editor button {
          max-width: 100%;
        }

        .stock-progressive-host
          > div
          > section:nth-of-type(2)
          > div:first-child
          > button {
          position: static;
          inset: auto;
          z-index: auto;
          box-shadow: none;
        }

        @media (max-width: 639px) {
          .stock-recording-launcher > div {
            align-items: center;
          }

          .stock-recording-launcher p {
            overflow-wrap: anywhere;
          }

          .stock-recorder-editor h2 {
            font-size: 1rem;
            line-height: 1.5rem;
          }

          .stock-recorder-editor h2 + p {
            font-size: 0.8125rem;
            line-height: 1.25rem;
          }

          .stock-recorder-editor label > div.grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .stock-recorder-editor form > button,
          .stock-recorder-editor > div.grid > button,
          .stock-recorder-editor > div.grid > form > button {
            width: 100%;
          }

          .stock-recorder-editor .flex.justify-between {
            flex-wrap: wrap;
          }

          .stock-recorder-editor strong,
          .stock-recorder-editor span,
          .stock-recorder-editor p {
            overflow-wrap: anywhere;
          }

          .stock-recorder-shell[data-stock-stage="2"]
            .stock-recorder-editor
            .divide-y
            > div {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .stock-recorder-shell[data-stock-stage="2"]
            .stock-recorder-editor
            .divide-y
            > div
            > div:first-child {
            min-width: 0;
            flex: 1 1 10rem;
          }
        }

        @media (min-width: 640px) {
          .stock-step-navigation > div:nth-child(-n + 4) {
            max-width: none;
            flex: 1 1 0;
          }

          .stock-recorder-editor {
            padding: 1.25rem !important;
          }

          .stock-recorder-editor label > div.grid {
            grid-template-columns: 8.5rem minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

export { StockRecorder };
