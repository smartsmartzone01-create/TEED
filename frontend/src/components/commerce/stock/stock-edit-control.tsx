"use client";

import { ArrowLeft, ChevronRight, Pencil, Truck, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import type { StockReceipt } from "@/types/commerce/inventory";

type EditMode = "correct" | "late_delivery";

type StockEditControlProps = {
  receipts: StockReceipt[];
  onCorrect: (receipt: StockReceipt) => void;
  onLateDelivery: (receipt: StockReceipt) => void;
};

function StockEditControl({
  receipts,
  onCorrect,
  onLateDelivery,
}: StockEditControlProps) {
  const t = useTranslations("CommerceStock");
  const commerceT = useTranslations("Commerce");
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<EditMode | null>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setMode(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMode(null);
      }
    };

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setMode(null);
  };

  const chooseReceipt = (receipt: StockReceipt) => {
    if (mode === "correct") {
      if (!receipt.correction_open) return;
      close();
      onCorrect(receipt);
      return;
    }
    if (mode === "late_delivery") {
      if (receipt.status !== "received") return;
      close();
      onLateDelivery(receipt);
    }
  };

  return (
    <>
      <div className="relative" ref={rootRef}>
        <Button
          aria-expanded={open}
          className="h-8 shrink-0 px-3 text-xs"
          onClick={() => {
            setOpen((current) => !current);
            if (open) setMode(null);
          }}
          type="button"
          variant="outline"
        >
          <Pencil className="size-3.5" />
          {t("actions.editStock")}
        </Button>

        {open ? (
          <div className="absolute right-0 top-full z-30 mt-2 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950">
            {!mode ? (
              <div className="grid gap-3 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-sm text-slate-950 dark:text-white">
                      {t("editStock.title")}
                    </strong>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t("editStock.chooseAction")}
                    </p>
                  </div>
                  <Button
                    aria-label={commerceT("actions.cancel")}
                    className="size-7 shrink-0 rounded-md p-0"
                    onClick={close}
                    size="small"
                    type="button"
                    variant="ghost"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="h-auto min-h-16 items-start justify-start gap-2 px-3 py-2.5 text-left"
                    onClick={() => setMode("correct")}
                    type="button"
                    variant="outline"
                  >
                    <Pencil className="mt-0.5 size-4 shrink-0" />
                    <span className="grid gap-0.5">
                      <strong className="text-xs">{commerceT("actions.correctStock")}</strong>
                      <span className="text-[0.65rem] font-normal text-slate-500">
                        {t("editStock.correctHelp")}
                      </span>
                    </span>
                  </Button>
                  <Button
                    className="h-auto min-h-16 items-start justify-start gap-2 px-3 py-2.5 text-left"
                    onClick={() => setMode("late_delivery")}
                    type="button"
                    variant="outline"
                  >
                    <Truck className="mt-0.5 size-4 shrink-0" />
                    <span className="grid gap-0.5">
                      <strong className="text-xs">{commerceT("actions.addLateDelivery")}</strong>
                      <span className="text-[0.65rem] font-normal text-slate-500">
                        {t("editStock.lateDeliveryHelp")}
                      </span>
                    </span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid max-h-[min(70vh,34rem)] grid-rows-[auto_minmax(0,1fr)]">
                <div className="flex items-start gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
                  <Button
                    aria-label={t("editStock.back")}
                    className="size-7 shrink-0 rounded-md p-0"
                    onClick={() => setMode(null)}
                    size="small"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowLeft className="size-3.5" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm text-slate-950 dark:text-white">
                      {mode === "correct"
                        ? commerceT("actions.correctStock")
                        : commerceT("actions.addLateDelivery")}
                    </strong>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t("editStock.chooseStock")}
                    </p>
                  </div>
                  <Button
                    aria-label={commerceT("actions.cancel")}
                    className="size-7 shrink-0 rounded-md p-0"
                    onClick={close}
                    size="small"
                    type="button"
                    variant="ghost"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>

                <div className="overflow-y-auto p-1.5">
                  {receipts.length ? (
                    receipts.map((receipt) => {
                      const correctionClosed = mode === "correct" && !receipt.correction_open;
                      const lateDeliveryUnavailable =
                        mode === "late_delivery" && receipt.status !== "received";
                      const disabled = correctionClosed || lateDeliveryUnavailable;
                      const batchNames = Array.from(
                        new Set(receipt.batches.map((batch) => batch.name).filter(Boolean)),
                      ).join(" · ");
                      const receiptDate = receipt.received_at || receipt.created_at;

                      return (
                        <button
                          className="flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-900"
                          disabled={disabled}
                          key={receipt.id}
                          onClick={() => chooseReceipt(receipt)}
                          type="button"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <strong className="text-xs text-slate-950 dark:text-white">
                                {receipt.reference}
                              </strong>
                              <span className="text-[0.625rem] font-semibold text-slate-500">
                                {t(`ledger.status.${receipt.status}`)}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[0.68rem] text-slate-600 dark:text-slate-300">
                              {receipt.supplier_name || t("values.noSupplier")}
                              {batchNames ? ` · ${batchNames}` : ""}
                            </span>
                            <span className="mt-0.5 block text-[0.625rem] text-slate-500">
                              {receiptDate
                                ? new Date(receiptDate).toLocaleDateString(locale, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "—"}
                              {correctionClosed
                                ? ` · ${t("editStock.correctionClosed")}`
                                : lateDeliveryUnavailable
                                  ? ` · ${t("editStock.lateDeliveryUnavailable")}`
                                  : ""}
                            </span>
                          </span>
                          {!disabled ? (
                            <ChevronRight className="size-4 shrink-0 text-slate-400" />
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <p className="p-3 text-xs text-slate-500">{t("editStock.noStock")}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <style jsx global>{`
        body
          .stock-progressive-host
          > div
          > section:nth-of-type(2)
          > div:last-child
          > article {
          display: block !important;
          gap: 0 !important;
          padding: 0 !important;
        }

        body
          .stock-progressive-host
          > div
          > section:nth-of-type(2)
          > div:last-child
          > article
          > :not(.stock-received-ledger-entry):not(.stock-summary-actions-standalone) {
          display: none !important;
        }

        body
          .stock-progressive-host
          > div
          > section:nth-of-type(2)
          > div:last-child
          > article
          > .stock-summary-actions-standalone {
          display: none !important;
        }

        body
          .stock-progressive-host
          > div
          > section:nth-of-type(2)
          > div:last-child
          > article
          > .stock-received-ledger-entry {
          display: block !important;
        }

        body
          .stock-progressive-host
          > div
          > section:nth-of-type(2)
          > div:last-child
          > article:first-of-type
          .stock-ledger-header {
          display: grid;
        }
      `}</style>
    </>
  );
}

export { StockEditControl };
