"use client";

import { PackagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { ProgressiveStockWorkspace } from "@/components/commerce/stock/stock-progressive-workspace";
import { Button } from "@/components/global/primitives/button";

function StockRecorder({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceStock");
  const hostRef = useRef<HTMLDivElement>(null);
  const [recordingOpen, setRecordingOpen] = useState(false);
  const [activeStage, setActiveStage] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const syncRecorderState = () => {
      const editor = host.querySelector<HTMLElement>(
        ":scope > div > section:first-child > div.grid:has(> aside) > div:last-child",
      );

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

      const navigation = host.querySelector<HTMLElement>(
        ":scope > div > section:first-child > div.grid:has(> aside) > aside > div:last-child",
      );
      const segment = navigation?.children.item(nextStage) as HTMLElement | null;
      if (navigation && segment) {
        const left = Math.max(0, segment.offsetLeft - navigation.offsetLeft - 12);
        navigation.scrollTo({ left, behavior: "smooth" });
      }
    };

    syncRecorderState();
    const observer = new MutationObserver(syncRecorderState);
    observer.observe(host, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="stock-recorder-shell grid gap-5"
      data-recording-open={recordingOpen ? "true" : "false"}
      data-stock-stage={activeStage}
    >
      <section className="stock-recording-launcher rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="stock-recording-launcher-icon mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <PackagePlus className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                {t("launcher.title")}
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                {t("launcher.description")}
              </p>
            </div>
          </div>
          <Button
            aria-controls="stock-recording-workspace"
            aria-expanded={recordingOpen}
            className="w-full shrink-0 sm:w-auto"
            type="button"
            variant="outline"
            onClick={() => setRecordingOpen((current) => !current)}
          >
            {recordingOpen ? <X className="size-4" /> : <PackagePlus className="size-4" />}
            {recordingOpen ? t("launcher.close") : t("launcher.start")}
          </Button>
        </div>
      </section>

      <div id="stock-recording-workspace" ref={hostRef} className="stock-progressive-host">
        <ProgressiveStockWorkspace businessId={businessId} />
      </div>

      <style jsx global>{`
        .stock-recording-launcher-icon {
          color: color-mix(
            in srgb,
            var(--workspace-primary, var(--brand-navy)) 82%,
            #ffffff 18%
          );
        }

        .stock-recorder-shell[data-recording-open="false"]
          .stock-progressive-host
          > div
          > section:first-child {
          display: none;
        }

        .stock-progressive-host > div > section:first-child {
          border-radius: 0.5rem;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside) {
          display: block;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside {
          overflow: hidden;
          border-right: 0;
          border-bottom: 1px solid rgb(226 232 240);
        }

        .dark
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside {
          border-bottom-color: rgb(30 41 59);
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:first-child {
          display: none;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child {
          display: flex;
          max-height: none;
          gap: 1.15rem;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0.75rem;
          scrollbar-width: none;
          scroll-snap-type: x proximity;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child::-webkit-scrollbar {
          display: none;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div {
          position: relative;
          min-width: 9.25rem;
          flex: 1 0 9.25rem;
          scroll-snap-align: start;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
          background: rgb(248 250 252);
          padding: 0.65rem 0.75rem;
          transition:
            border-color 160ms ease,
            background-color 160ms ease,
            opacity 160ms ease;
        }

        .dark
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div {
          border-color: rgb(30 41 59);
          background: rgb(15 23 42 / 0.55);
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(n + 5) {
          display: none;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(-n + 3)::after {
          content: "›";
          position: absolute;
          top: 50%;
          right: -0.82rem;
          transform: translate(50%, -50%);
          color: rgb(148 163 184);
          font-size: 1rem;
          font-weight: 800;
          pointer-events: none;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div
          > div {
          min-width: 0;
          pointer-events: none;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div
          > div
          > p:first-child {
          overflow: hidden;
          color: rgb(51 65 85);
          font-size: 0.75rem;
          font-weight: 700;
          line-height: 1.15rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dark
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div
          > div
          > p:first-child {
          color: rgb(203 213 225);
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div
          > div
          > p:last-child {
          display: none;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div
          > button {
          position: absolute;
          inset: 0;
          z-index: 2;
          width: 100%;
          height: 100%;
          opacity: 0;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:has(> button) {
          cursor: pointer;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:not(:has(> button)) {
          opacity: 0.52;
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:has(> button:hover),
        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:has(> button:focus-visible) {
          border-color: rgb(148 163 184);
          background: rgb(241 245 249);
          opacity: 1;
        }

        .dark
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:has(> button:hover),
        .dark
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:has(> button:focus-visible) {
          border-color: rgb(71 85 105);
          background: rgb(30 41 59 / 0.7);
        }

        .stock-recorder-shell[data-stock-stage="0"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(1),
        .stock-recorder-shell[data-stock-stage="1"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(2),
        .stock-recorder-shell[data-stock-stage="2"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(3),
        .stock-recorder-shell[data-stock-stage="3"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(4) {
          border-color: color-mix(
            in srgb,
            var(--workspace-primary, var(--brand-navy)) 42%,
            rgb(203 213 225) 58%
          );
          background: color-mix(
            in srgb,
            var(--workspace-primary, var(--brand-navy)) 8%,
            #ffffff 92%
          );
          opacity: 1;
        }

        .stock-recorder-shell[data-stock-stage="0"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(1)
          > div
          > p:first-child,
        .stock-recorder-shell[data-stock-stage="1"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(2)
          > div
          > p:first-child,
        .stock-recorder-shell[data-stock-stage="2"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(3)
          > div
          > p:first-child,
        .stock-recorder-shell[data-stock-stage="3"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(4)
          > div
          > p:first-child {
          color: color-mix(
            in srgb,
            var(--workspace-primary, var(--brand-navy)) 82%,
            rgb(15 23 42) 18%
          );
        }

        .dark
          .stock-recorder-shell[data-stock-stage="0"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(1),
        .dark
          .stock-recorder-shell[data-stock-stage="1"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(2),
        .dark
          .stock-recorder-shell[data-stock-stage="2"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(3),
        .dark
          .stock-recorder-shell[data-stock-stage="3"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(4) {
          border-color: color-mix(
            in srgb,
            var(--workspace-primary, var(--brand-navy)) 58%,
            rgb(71 85 105) 42%
          );
          background: color-mix(
            in srgb,
            var(--workspace-primary, var(--brand-navy)) 20%,
            rgb(15 23 42) 80%
          );
        }

        .dark
          .stock-recorder-shell[data-stock-stage="0"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(1)
          > div
          > p:first-child,
        .dark
          .stock-recorder-shell[data-stock-stage="1"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(2)
          > div
          > p:first-child,
        .dark
          .stock-recorder-shell[data-stock-stage="2"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(3)
          > div
          > p:first-child,
        .dark
          .stock-recorder-shell[data-stock-stage="3"]
          .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > aside
          > div:last-child
          > div:nth-child(4)
          > div
          > p:first-child {
          color: color-mix(
            in srgb,
            var(--workspace-primary, var(--brand-navy)) 62%,
            #ffffff 38%
          );
        }

        .stock-progressive-host
          > div
          > section:first-child
          > div.grid:has(> aside)
          > div:last-child {
          min-height: 0 !important;
          padding: 1rem;
        }

        /* Late-delivery cancel belongs to the page flow, directly after the recorder. */
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

        @media (min-width: 768px) {
          .stock-progressive-host
            > div
            > section:first-child
            > div.grid:has(> aside)
            > aside
            > div:last-child
            > div {
            min-width: 0;
            flex-basis: 0;
          }

          .stock-progressive-host
            > div
            > section:first-child
            > div.grid:has(> aside)
            > div:last-child {
            padding: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}

export { StockRecorder };
