"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { StockReceiptIconActions } from "@/components/commerce/stock/stock-shareable-receipt";
import { StockProductSummary } from "@/components/commerce/stock/stock-summary";
import { Button } from "@/components/global/primitives/button";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import {
  STOCK_RECEIPTS_CHANGED_EVENT,
  archiveDraftStockReceipt,
  getStockReceipts,
} from "@/services/commerce/inventory";
import { isRequestCancelled } from "@/services/global/api-client";
import type { StockReceipt, StockReceiptLine } from "@/types/commerce/inventory";
import { formatQuantityWithUnit } from "@/utils/commerce/quantity";

const panel =
  "rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-4";

const money = (value: string | number | null | undefined) => {
  if (value == null || value === "") return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(parsed)
    : String(value);
};

function receiptLines(receipt: StockReceipt): StockReceiptLine[] {
  if (receipt.lines.length) return receipt.lines;
  return receipt.batches.flatMap((batch) =>
    batch.groups.flatMap((group) => group.types),
  );
}

function StockReceiptList({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceStockV2");
  const stockT = useTranslations("CommerceStock");
  const commerceT = useTranslations("Commerce");
  const locale = useLocale();
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [expandedReceiptIds, setExpandedReceiptIds] = useState<Set<string>>(new Set());
  const [busyReceiptId, setBusyReceiptId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    let active = true;

    const loadReceipts = async () => {
      try {
        const response = await getStockReceipts(
          businessId,
          accessToken,
          controller.signal,
        );
        if (!active) return;
        const data = response.data as {
          receipts?: StockReceipt[];
        } | null;
        setReceipts(data?.receipts ?? []);
      } catch (reason) {
        if (active && !isRequestCancelled(reason)) {
          notify({
            message:
              reason instanceof Error ? reason.message : commerceT("errors.load"),
            tone: "error",
          });
        }
      }
    };

    const refresh = () => {
      void loadReceipts();
    };

    void loadReceipts();
    window.addEventListener(STOCK_RECEIPTS_CHANGED_EVENT, refresh);

    return () => {
      active = false;
      controller.abort();
      window.removeEventListener(STOCK_RECEIPTS_CHANGED_EVENT, refresh);
    };
  }, [accessToken, businessId, commerceT, notify]);

  const toggleDetails = (receiptId: string) => {
    setExpandedReceiptIds((current) => {
      const next = new Set(current);
      if (next.has(receiptId)) next.delete(receiptId);
      else next.add(receiptId);
      return next;
    });
  };

  const archiveDraft = async (receipt: StockReceipt) => {
    if (!accessToken || receipt.status !== "draft") return;
    if (!window.confirm(commerceT("messages.archiveDraftConfirm"))) return;

    setBusyReceiptId(receipt.id);
    try {
      await archiveDraftStockReceipt(businessId, receipt.id, accessToken);
      notify({ message: commerceT("success.draftArchived"), tone: "success" });
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : commerceT("errors.save"),
        tone: "error",
      });
    } finally {
      setBusyReceiptId(null);
    }
  };

  return (
    <div className="grid gap-2">
      {receipts.map((receipt, index) => {
        const lines = receiptLines(receipt);
        const firstLine = lines[0];
        const expanded = expandedReceiptIds.has(receipt.id);
        const moreProductCount = Math.max(0, lines.length - 1);
        const receiptDate = receipt.received_at || receipt.created_at;
        const formattedDate = receiptDate
          ? new Date(receiptDate).toLocaleDateString(locale, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—";
        const firstQuantity = firstLine
          ? Number(firstLine.quantity_received) /
            Number(firstLine.conversion_to_base || "1")
          : 0;
        const total =
          Number(receipt.total_buying_value || 0) +
          Number(receipt.additional_cost || 0);

        return (
          <article
            className={panel}
            key={receipt.id}
            style={{
              borderInlineStartColor:
                index % 2 === 0
                  ? "var(--workspace-primary, var(--brand-navy))"
                  : "var(--workspace-secondary, var(--brand-orange))",
              borderInlineStartWidth: 3,
            }}
          >
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <strong className="wrap-break-word text-sm font-semibold text-slate-950 dark:text-white sm:text-base">
                      {firstLine?.product_name || receipt.name || receipt.reference}
                    </strong>
                    {receipt.status === "draft" ? (
                      <span className="inline-flex rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold dark:border-slate-800 sm:text-xs">
                        {stockT("ledger.status.draft")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    {firstLine?.product_sku ? (
                      <span className="wrap-break-word">{firstLine.product_sku}</span>
                    ) : null}
                    {firstLine ? (
                      <span>
                        {formatQuantityWithUnit(
                          firstQuantity,
                          firstLine.received_unit,
                          locale,
                        )}
                      </span>
                    ) : null}
                    {moreProductCount > 0 ? (
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {t("history.moreProducts", { count: moreProductCount })}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 wrap-break-word text-[11px] text-slate-500 sm:text-xs">
                    {[receipt.name, receipt.reference, receipt.supplier_name, formattedDate]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="flex items-start justify-between gap-3 sm:flex-col sm:items-end sm:text-right">
                  <div>
                    <strong className="block text-sm sm:text-base">{money(total)}</strong>
                    <span className="text-[11px] font-medium text-slate-500 sm:text-xs">
                      {stockT(`ledger.status.${receipt.status}`)}
                    </span>
                  </div>
                </div>
              </div>

              {expanded ? (
                <div className="grid gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="grid gap-2">
                    {lines.map((line) => (
                      <StockProductSummary key={line.id} line={line} />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                    <div className="min-w-0">
                      <span className="text-slate-500">{stockT("fields.supplier")}</span>
                      <strong className="block wrap-break-word text-sm">
                        {receipt.supplier_name || stockT("values.noSupplier")}
                      </strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500">{stockT("fields.dateReceived")}</span>
                      <strong className="block wrap-break-word text-sm">{formattedDate}</strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500">{stockT("fields.stockExpenses")}</span>
                      <strong className="block wrap-break-word text-sm">
                        {money(receipt.additional_cost)}
                      </strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500">{stockT("ledger.headers.total")}</span>
                      <strong className="block wrap-break-word text-sm">{money(total)}</strong>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                <StockReceiptIconActions receipt={receipt} />
                {receipt.status === "draft" ? (
                  <Button
                    disabled={busyReceiptId === receipt.id}
                    size="small"
                    type="button"
                    variant="ghost"
                    onClick={() => void archiveDraft(receipt)}
                  >
                    <Trash2 className="size-3.5" />
                    {t("actions.archiveDraft")}
                  </Button>
                ) : null}
                <button
                  aria-expanded={expanded}
                  aria-label={expanded ? t("history.hideDetails") : t("history.viewDetails")}
                  className="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:hover:bg-slate-900 dark:hover:text-white"
                  onClick={() => toggleDetails(receipt.id)}
                  title={expanded ? t("history.hideDetails") : t("history.viewDetails")}
                  type="button"
                >
                  {expanded ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </article>
        );
      })}

      {!receipts.length ? (
        <div className={panel}>
          <p className="text-sm text-slate-500">{t("history.empty")}</p>
        </div>
      ) : null}
    </div>
  );
}

export { StockReceiptList };
