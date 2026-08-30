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

  const activeHelp = [
    t("help.stock"),
    t("help.batch"),
    t("help.products"),
    t("help.method"),
  ][activeStage];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const getEditor = () => {
      const layout = host.querySelector<HTMLElement>(
        ":scope > div > section:first-child > div.grid:has(> aside)",
      );
      return layout?.querySelector<HTMLElement>(":scope > div:last-child") ?? null;
    };

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

    const advanceProductEntry = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const editor = getEditor();
      const productShell = form.parentElement;
      const productInput = form.querySelector<HTMLInputElement>(
        'input[data-stock-active-step]',
      );
      if (!editor || !productShell || !productInput || !productInput.value.trim()) return;
      if (!editor.contains(form) || productShell.parentElement !== editor) return;

      window.setTimeout(() => {
        if (!productShell.isConnected) return;
        const refreshedInput = form.querySelector<HTMLInputElement>(
          'input[data-stock-active-step]',
        );
        if (!refreshedInput || refreshedInput.value.trim()) return;

        const continueButton = Array.from(productShell.children).find(
          (child): child is HTMLButtonElement => child instanceof HTMLButtonElement,
        );
        continueButton?.click();
      }, 0);
    };

    const frame = window.requestAnimationFrame(syncRecorderState);
    const observer = new MutationObserver(syncRecorderState);
    observer.observe(host, { childList: true, subtree: true });
    host.addEventListener("submit", advanceProductEntry);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("submit", advanceProductEntry);
    };
  }, []);

  return (
    <div
      className="stock-recorder-shell grid min-w-0 gap-4"
      data-recording-open={recordingOpen ? "true" : "false"}
      data-stock-stage={activeStage}
    >
      <section className="stock-recording-launcher rounded-lg border border-slate-200 bg-white px-1 py-2 dark:border-slate-800 dark:bg-slate-950 sm:px-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200 sm:text-sm">
              {t("launcher.title")}
            </p>
            <Tooltip
              content={recordingOpen ? activeHelp : t("launcher.description")}
              side="top"
            >
              <button
                aria-label={recordingOpen ? activeHelp : t("launcher.description")}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                type="button"
              >
                <CircleHelp className="size-3.5" />
              </button>
            </Tooltip>
          </div>

          <Button
            aria-controls="stock-recording-workspace"
            aria-expanded={recordingOpen}
            className="h-8 shrink-0 px-3 text-xs"
            type="button"
            variant="outline"
            onClick={() => setRecordingOpen((current) => !current)}
          >
            {recordingOpen ? <X className="size-3.5" /> : <PackagePlus className="size-3.5" />}
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
          overflow: hidden;
          border-radius: 0 !important;
          border-color: rgb(203 213 225) !important;
          box-shadow: none !important;
        }

        .dark .stock-progressive-host > div > section:first-child {
          border-color: rgb(51 65 85) !important;
        }

        .stock-recorder-layout {
          display: block !important;
        }

        .stock-step-panel {
          overflow: hidden !important;
          border-right: 0 !important;
          border-bottom: 1px solid rgb(203 213 225) !important;
          background: rgb(248 250 252 / 0.8);
        }

        .dark .stock-step-panel {
          border-bottom-color: rgb(51 65 85) !important;
          background: rgb(15 23 42 / 0.6);
        }

        .stock-step-panel > div:first-child {
          display: none;
        }

        .stock-step-navigation {
          display: flex !important;
          flex-wrap: nowrap;
          align-items: center;
          gap: 0;
          max-height: none !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          padding: 0 !important;
          scrollbar-width: none;
        }

        .stock-step-navigation::-webkit-scrollbar {
          display: none;
        }

        .stock-step-navigation > div:nth-child(n + 5) {
          display: none;
        }

        .stock-step-navigation > div:nth-child(-n + 4) {
          position: relative;
          min-width: max-content;
          flex: 0 0 auto;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          padding: 0.7rem 1.75rem 0.7rem 0.85rem !important;
          color: rgb(100 116 139);
          opacity: 1 !important;
        }

        .dark .stock-step-navigation > div:nth-child(-n + 4) {
          color: rgb(148 163 184);
        }

        .stock-step-navigation > div:nth-child(-n + 3)::after {
          content: "›";
          position: absolute;
          top: 50%;
          right: 0.55rem;
          transform: translateY(-52%);
          color: rgb(148 163 184);
          font-size: 1rem;
          font-weight: 700;
          pointer-events: none;
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
          font-weight: 600;
          line-height: 1rem;
          white-space: nowrap;
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
          color: rgb(15 23 42);
        }

        .dark
          .stock-step-navigation
          > div:nth-child(-n + 4):has(> button:hover),
        .dark
          .stock-step-navigation
          > div:nth-child(-n + 4):has(> button:focus-visible) {
          color: rgb(248 250 252);
        }

        .stock-step-navigation > div:nth-child(-n + 4):not(:has(> button)) {
          color: rgb(148 163 184);
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
          color: rgb(15 23 42);
          font-weight: 800;
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
          color: white;
        }

        .stock-recorder-shell[data-stock-stage="0"]
          .stock-step-navigation
          > div:nth-child(1)::before,
        .stock-recorder-shell[data-stock-stage="1"]
          .stock-step-navigation
          > div:nth-child(2)::before,
        .stock-recorder-shell[data-stock-stage="2"]
          .stock-step-navigation
          > div:nth-child(3)::before,
        .stock-recorder-shell[data-stock-stage="3"]
          .stock-step-navigation
          > div:nth-child(4)::before {
          content: "";
          position: absolute;
          right: 1.75rem;
          bottom: 0;
          left: 0.85rem;
          height: 2px;
          background: currentColor;
        }

        .stock-recorder-editor {
          min-height: 0 !important;
          overflow: visible !important;
          padding: 1rem !important;
          background: white;
        }

        .dark .stock-recorder-editor {
          background: rgb(2 6 23);
        }

        .stock-recorder-editor h2 + p {
          display: none;
        }

        .stock-recorder-editor h2 {
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          line-height: 1rem !important;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgb(100 116 139);
        }

        .dark .stock-recorder-editor h2 {
          color: rgb(148 163 184);
        }

        .stock-recorder-editor form,
        .stock-recorder-editor .grid,
        .stock-recorder-editor label,
        .stock-recorder-editor input:not([type="radio"]):not([type="checkbox"]),
        .stock-recorder-editor select {
          min-width: 0;
          max-width: 100%;
        }

        .stock-recorder-editor input[type="radio"],
        .stock-recorder-editor input[type="checkbox"] {
          width: auto;
          max-width: none;
        }

        .stock-recorder-editor button {
          max-width: 100%;
        }

        .stock-recorder-shell[data-stock-stage="0"]
          .stock-recorder-editor
          > form
          > div:first-child,
        .stock-recorder-shell[data-stock-stage="1"]
          .stock-recorder-editor
          > form
          > div:first-child,
        .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > div:first-child {
          display: none;
        }

        .stock-recorder-shell[data-stock-stage="0"]
          .stock-recorder-editor
          > form,
        .stock-recorder-shell[data-stock-stage="1"]
          .stock-recorder-editor
          > form {
          gap: 0.65rem !important;
        }

        .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid {
          gap: 0.65rem !important;
        }

        .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 0.65rem !important;
          width: min(100%, 34rem);
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          padding: 0 !important;
        }

        .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form
          > div.grid {
          display: contents !important;
        }

        .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form
          > div.grid
          > label:first-child {
          grid-column: 1 / -1;
        }

        .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form
          > button {
          grid-column: 2;
          width: auto !important;
          height: 2.25rem !important;
          min-height: 0 !important;
          align-self: end;
          justify-self: start;
          border-radius: 0.5rem !important;
          padding-inline: 0.8rem !important;
          font-size: 0.75rem !important;
        }

        .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > button:last-child {
          display: none !important;
        }

        .stock-recorder-shell[data-stock-stage="0"]
          .stock-recorder-editor
          > form
          label,
        .stock-recorder-shell[data-stock-stage="1"]
          .stock-recorder-editor
          > form
          label,
        .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form
          label {
          gap: 0.3rem !important;
          color: rgb(71 85 105);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: normal;
          text-transform: none;
        }

        .dark
          .stock-recorder-shell[data-stock-stage="0"]
          .stock-recorder-editor
          > form
          label,
        .dark
          .stock-recorder-shell[data-stock-stage="1"]
          .stock-recorder-editor
          > form
          label,
        .dark
          .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form
          label {
          color: rgb(203 213 225);
        }

        .stock-recorder-shell[data-stock-stage="0"]
          .stock-recorder-editor
          > form
          label
          input,
        .stock-recorder-shell[data-stock-stage="1"]
          .stock-recorder-editor
          > form
          label
          input,
        .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form
          label
          input,
        .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form
          label
          select {
          height: 2.25rem !important;
          border: 1px solid rgb(203 213 225) !important;
          border-radius: 0.5rem !important;
          background: rgb(255 255 255) !important;
          padding: 0 0.65rem !important;
          color: rgb(15 23 42);
          font-size: 0.8125rem;
          font-weight: 500;
          letter-spacing: normal;
          text-transform: none;
          box-shadow: none !important;
        }

        .dark
          .stock-recorder-shell[data-stock-stage="0"]
          .stock-recorder-editor
          > form
          label
          input,
        .dark
          .stock-recorder-shell[data-stock-stage="1"]
          .stock-recorder-editor
          > form
          label
          input,
        .dark
          .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form
          label
          input,
        .dark
          .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form
          label
          select {
          border-color: rgb(51 65 85) !important;
          background: rgb(15 23 42) !important;
          color: rgb(248 250 252);
        }

        .stock-recorder-shell[data-stock-stage="0"]
          .stock-recorder-editor
          > form
          label:focus-within,
        .stock-recorder-shell[data-stock-stage="1"]
          .stock-recorder-editor
          > form
          label:focus-within,
        .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form
          label:focus-within {
          position: relative;
          z-index: 1;
          color: rgb(15 23 42);
        }

        .dark
          .stock-recorder-shell[data-stock-stage="0"]
          .stock-recorder-editor
          > form
          label:focus-within,
        .dark
          .stock-recorder-shell[data-stock-stage="1"]
          .stock-recorder-editor
          > form
          label:focus-within,
        .dark
          .stock-recorder-shell[data-stock-stage="2"]
          .stock-recorder-editor
          > div.grid
          > form
          label:focus-within {
          color: rgb(248 250 252);
        }

        .stock-recorder-shell[data-stock-stage="0"]
          .stock-recorder-editor
          > form
          > button,
        .stock-recorder-shell[data-stock-stage="1"]
          .stock-recorder-editor
          > form
          > button {
          width: auto !important;
          height: 2.25rem !important;
          min-height: 0 !important;
          align-self: end;
          border-radius: 0.5rem !important;
          padding-inline: 0.8rem !important;
          font-size: 0.75rem !important;
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
          .stock-recording-launcher p {
            font-size: 0.75rem;
          }

          .stock-step-navigation {
            overflow-x: auto !important;
            padding-inline: 0.55rem !important;
            scroll-padding-inline: 0.55rem;
            scroll-snap-type: x proximity;
            -webkit-overflow-scrolling: touch;
          }

          .stock-step-navigation > div:nth-child(-n + 4) {
            min-width: max-content;
            flex: 0 0 auto;
            padding: 0.6rem 0.9rem 0.6rem 0.4rem !important;
            scroll-snap-align: start;
          }

          .stock-step-navigation > div:nth-child(-n + 3)::after {
            right: 0.25rem;
            font-size: 0.75rem;
          }

          .stock-step-navigation
            > div:nth-child(-n + 4)
            > div
            > p:first-child {
            overflow: visible;
            font-size: 0.675rem;
            line-height: 0.85rem;
            letter-spacing: -0.01em;
            text-align: left;
            white-space: nowrap;
          }

          .stock-recorder-shell[data-stock-stage="0"]
            .stock-step-navigation
            > div:nth-child(1)::before,
          .stock-recorder-shell[data-stock-stage="1"]
            .stock-step-navigation
            > div:nth-child(2)::before,
          .stock-recorder-shell[data-stock-stage="2"]
            .stock-step-navigation
            > div:nth-child(3)::before,
          .stock-recorder-shell[data-stock-stage="3"]
            .stock-step-navigation
            > div:nth-child(4)::before {
            right: 0.9rem;
            left: 0.4rem;
          }

          .stock-recorder-editor {
            padding: 0.75rem !important;
          }

          .stock-recorder-editor label > div.grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .stock-recorder-shell[data-stock-stage="0"]
            .stock-recorder-editor
            > form {
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: end;
          }

          .stock-recorder-shell[data-stock-stage="0"]
            .stock-recorder-editor
            > form
            > label:first-of-type {
            grid-column: 1 / -1;
          }

          .stock-recorder-shell[data-stock-stage="0"]
            .stock-recorder-editor
            > form
            > div:nth-child(3) {
            display: contents;
          }

          .stock-recorder-shell[data-stock-stage="0"]
            .stock-recorder-editor
            > form
            > div:nth-child(3)
            > label:first-child {
            grid-column: 1 / -1;
          }

          .stock-recorder-shell[data-stock-stage="0"]
            .stock-recorder-editor
            > form
            > div:nth-child(3)
            > label:last-child {
            grid-column: 1;
          }

          .stock-recorder-shell[data-stock-stage="0"]
            .stock-recorder-editor
            > form
            > button {
            grid-column: 2;
            margin: 0 !important;
          }

          .stock-recorder-shell[data-stock-stage="1"]
            .stock-recorder-editor
            > form {
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: end;
          }

          .stock-recorder-shell[data-stock-stage="1"]
            .stock-recorder-editor
            > form
            > label {
            max-width: 18rem;
          }

          .stock-recorder-shell[data-stock-stage="2"]
            .stock-recorder-editor
            > div.grid
            > form {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            width: 100%;
          }

          .stock-recorder-shell[data-stock-stage="2"]
            .stock-recorder-editor
            > div.grid
            > form
            > button {
            justify-self: stretch;
          }

          .stock-recorder-editor .flex.justify-between {
            flex-wrap: wrap;
          }

          .stock-recorder-editor strong,
          .stock-recorder-editor span,
          .stock-recorder-editor p {
            overflow-wrap: anywhere;
          }
        }

        @media (min-width: 640px) {
          .stock-step-navigation > div:nth-child(-n + 4) {
            flex: 1 1 0;
            min-width: 0;
          }

          .stock-step-navigation
            > div:nth-child(-n + 4)
            > div
            > p:first-child {
            text-align: center;
          }

          .stock-recorder-editor label > div.grid {
            grid-template-columns: 8.5rem minmax(0, 1fr) !important;
          }

          .stock-recorder-shell[data-stock-stage="1"]
            .stock-recorder-editor
            > form {
            grid-template-columns: minmax(12rem, 20rem) auto;
            align-items: end;
          }
        }

        @media (min-width: 768px) {
          .stock-recorder-shell[data-stock-stage="0"]
            .stock-recorder-editor
            > form {
            grid-template-columns:
              minmax(0, 1.2fr)
              minmax(0, 1fr)
              minmax(0, 0.8fr)
              auto;
            align-items: end;
          }

          .stock-recorder-shell[data-stock-stage="0"]
            .stock-recorder-editor
            > form
            > div:nth-child(3) {
            display: contents;
          }
        }
      `}</style>
    </div>
  );
}

export { StockRecorder };
