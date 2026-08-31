"use client";

import { Copy, Printer, Share2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/global/primitives/button";
import { useNotification } from "@/providers/global/notification-provider";
import type {
  StockReceipt,
  StockReceiptBatch,
  StockReceiptGroup,
  StockReceiptLine,
} from "@/types/commerce/inventory";
import { formatQuantityWithUnit } from "@/utils/commerce/quantity";

type ReceiptEntry = {
  id: string;
  kind: "item" | "group";
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  buyingAmount: number;
};

type ReceiptBatch = {
  id: string;
  name: string;
  entries: ReceiptEntry[];
};

type ShareableStockReceipt = {
  reference: string;
  status: string;
  receivedAt: string;
  supplier: string;
  lateDelivery: boolean;
  batches: ReceiptBatch[];
  totalBuyingPrice: number;
};

const finiteNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const lineQuantity = (line: StockReceiptLine) => {
  const conversion = finiteNumber(line.conversion_to_base || "1") || 1;
  return finiteNumber(line.quantity_received) / conversion;
};

const isDirectGroup = (group: StockReceiptGroup) =>
  group.types.length === 1 && group.name === group.types[0].product_name;

const entryForDirectGroup = (group: StockReceiptGroup): ReceiptEntry => {
  const line = group.types[0];
  return {
    id: line.id,
    kind: "item",
    name: line.product_name,
    sku: line.product_sku,
    quantity: lineQuantity(line),
    unit: line.received_unit,
    buyingAmount: finiteNumber(line.total_buying_cost),
  };
};

const entryForGroupedStock = (group: StockReceiptGroup): ReceiptEntry => ({
  id: group.id,
  kind: "group",
  name: group.name,
  sku: "",
  quantity: finiteNumber(group.quantity),
  unit: group.unit,
  buyingAmount: group.types.reduce(
    (total, line) => total + finiteNumber(line.total_buying_cost),
    0,
  ),
});

const batchForReceipt = (batch: StockReceiptBatch): ReceiptBatch => ({
  id: batch.id,
  name: batch.name,
  entries: batch.groups.map((group) =>
    isDirectGroup(group) ? entryForDirectGroup(group) : entryForGroupedStock(group),
  ),
});

function useShareableStockReceipt(receipt: StockReceipt) {
  const locale = useLocale();
  const t = useTranslations("CommerceStock");
  const { notify } = useNotification();

  const labels = {
    title: t("receipt.title"),
    stockId: t("receipt.stockId"),
    status: t("fields.status"),
    date: t("fields.dateReceived"),
    supplier: t("fields.supplier"),
    batch: t("summary.batch"),
    product: t("receipt.product"),
    productGroup: t("ledger.headers.productGroup"),
    productId: t("ledger.headers.productSku"),
    quantity: t("fields.quantity"),
    buyingAmount: t("receipt.buyingAmount"),
    totalBuyingPrice: t("receipt.totalBuyingPrice"),
    lateDelivery: t("receipt.lateDelivery"),
  };

  const receiptView: ShareableStockReceipt = {
    reference: receipt.reference,
    status: t(`ledger.status.${receipt.status}`),
    receivedAt: receipt.received_at
      ? new Date(receipt.received_at).toLocaleString(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
    supplier: receipt.supplier_name || "—",
    lateDelivery: Boolean(receipt.parent_receipt),
    batches: receipt.batches.map(batchForReceipt),
    totalBuyingPrice: finiteNumber(receipt.total_buying_value),
  };

  const moneyText = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);

  const rows = [
    labels.title,
    `${labels.stockId}: ${receiptView.reference}`,
    `${labels.status}: ${receiptView.status}`,
    `${labels.date}: ${receiptView.receivedAt}`,
    `${labels.supplier}: ${receiptView.supplier}`,
  ];

  if (receiptView.lateDelivery) rows.push(labels.lateDelivery);

  for (const batch of receiptView.batches) {
    rows.push("", `${labels.batch}: ${batch.name}`);
    for (const entry of batch.entries) {
      rows.push(`${entry.kind === "group" ? labels.productGroup : labels.product}: ${entry.name}`);
      if (entry.kind === "item" && entry.sku) {
        rows.push(`${labels.productId}: ${entry.sku}`);
      }
      rows.push(
        `${labels.quantity}: ${formatQuantityWithUnit(entry.quantity, entry.unit, locale)}`,
      );
      rows.push(`${labels.buyingAmount}: ${moneyText(entry.buyingAmount)}`);
    }
  }

  rows.push("", `${labels.totalBuyingPrice}: ${moneyText(receiptView.totalBuyingPrice)}`);
  const text = rows.join("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    notify({ message: t("success.copied"), tone: "success" });
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${labels.title} ${receiptView.reference}`,
        text,
      });
      return;
    }
    await copy();
  };

  const print = () => {
    const escaped = text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    const escapedReference = receiptView.reference
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.border = "0";
    frame.style.opacity = "0";
    document.body.appendChild(frame);

    const printWindow = frame.contentWindow;
    const printDocument = frame.contentDocument;
    if (!printWindow || !printDocument) {
      frame.remove();
      return;
    }

    printDocument.open();
    printDocument.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${escapedReference}</title><style>@page{margin:16mm}body{font-family:Arial,sans-serif;color:#111;margin:0 auto;max-width:720px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.55 Arial,sans-serif;margin:0}</style></head><body><pre>${escaped}</pre></body></html>`,
    );
    printDocument.close();

    const cleanup = () => window.setTimeout(() => frame.remove(), 500);
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      cleanup();
    }, 150);
  };

  return { receiptView, labels, moneyText, copy, share, print };
}

function StockReceiptPreview({ receipt }: { receipt: StockReceipt }) {
  const locale = useLocale();
  const { receiptView, labels, moneyText } = useShareableStockReceipt(receipt);

  return (
    <div className="grid gap-4 text-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/50">
        <div>
          <span className="block text-slate-500">{labels.stockId}</span>
          <strong>{receiptView.reference}</strong>
        </div>
        <div>
          <span className="block text-slate-500">{labels.status}</span>
          <strong>{receiptView.status}</strong>
        </div>
        <div>
          <span className="block text-slate-500">{labels.date}</span>
          <strong>{receiptView.receivedAt}</strong>
        </div>
        <div>
          <span className="block text-slate-500">{labels.supplier}</span>
          <strong>{receiptView.supplier}</strong>
        </div>
      </div>

      {receiptView.lateDelivery ? (
        <span className="w-fit rounded-full bg-slate-100 px-2 py-1 text-[0.7rem] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {labels.lateDelivery}
        </span>
      ) : null}

      {receiptView.batches.map((batch) => (
        <section
          className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
          key={batch.id}
        >
          <div className="border-b border-slate-200 bg-slate-100/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">
              {labels.batch}
            </span>
            <strong className="ml-2 text-sm">{batch.name}</strong>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {batch.entries.map((entry) => (
              <div className="grid gap-2 p-3" key={entry.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">
                      {entry.kind === "group" ? labels.productGroup : labels.product}
                    </span>
                    <strong className="block truncate">{entry.name}</strong>
                    {entry.kind === "item" && entry.sku ? (
                      <span className="text-xs text-slate-500">
                        {labels.productId}: {entry.sku}
                      </span>
                    ) : null}
                  </div>
                  <strong className="shrink-0 text-right text-xs">
                    {formatQuantityWithUnit(entry.quantity, entry.unit, locale)}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">{labels.buyingAmount}</span>
                  <strong>{moneyText(entry.buyingAmount)}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex items-center justify-between border-t border-slate-300 pt-3 dark:border-slate-700">
        <strong>{labels.totalBuyingPrice}</strong>
        <strong className="text-base">{moneyText(receiptView.totalBuyingPrice)}</strong>
      </div>
    </div>
  );
}

function StockReceiptIconActions({
  receipt,
  className,
}: {
  receipt: StockReceipt;
  className: string;
}) {
  const t = useTranslations("CommerceStock");
  const { copy, share, print } = useShareableStockReceipt(receipt);

  return (
    <div className={className}>
      <Button
        aria-label={t("actions.copy")}
        className="size-8 rounded-md p-0"
        onClick={() => void copy()}
        size="small"
        title={t("actions.copy")}
        type="button"
        variant="ghost"
      >
        <Copy className="size-3.5" />
      </Button>
      <Button
        aria-label={t("actions.share")}
        className="size-8 rounded-md p-0"
        onClick={() => void share()}
        size="small"
        title={t("actions.share")}
        type="button"
        variant="ghost"
      >
        <Share2 className="size-3.5" />
      </Button>
      <Button
        aria-label={t("actions.print")}
        className="size-8 rounded-md p-0"
        onClick={print}
        size="small"
        title={t("actions.print")}
        type="button"
        variant="ghost"
      >
        <Printer className="size-3.5" />
      </Button>
    </div>
  );
}

function StockReceiptDialog({
  receipt,
  open,
  onClose,
}: {
  receipt: StockReceipt;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("CommerceStock");
  const { copy, share, print } = useShareableStockReceipt(receipt);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-2 sm:items-center sm:p-4"
      role="presentation"
    >
      <section
        aria-labelledby={`stock-receipt-dialog-${receipt.id}`}
        aria-modal="true"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-h-[calc(100dvh-2rem)]"
        role="dialog"
      >
        <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold" id={`stock-receipt-dialog-${receipt.id}`}>
              {t("receipt.savedTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{t("receipt.savedHint")}</p>
          </div>
          <Button
            aria-label={t("receipt.close")}
            className="size-8 shrink-0 rounded-md p-0"
            onClick={onClose}
            size="small"
            title={t("receipt.close")}
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <StockReceiptPreview receipt={receipt} />
        </div>

        <footer className="grid grid-cols-3 gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <Button
            className="min-w-0 gap-1.5 px-2 text-xs"
            onClick={() => void share()}
            size="small"
            type="button"
          >
            <Share2 className="size-3.5 shrink-0" />
            <span className="truncate">{t("actions.share")}</span>
          </Button>
          <Button
            className="min-w-0 gap-1.5 px-2 text-xs"
            onClick={() => void copy()}
            size="small"
            type="button"
            variant="outline"
          >
            <Copy className="size-3.5 shrink-0" />
            <span className="truncate">{t("actions.copy")}</span>
          </Button>
          <Button
            className="min-w-0 gap-1.5 px-2 text-xs"
            onClick={print}
            size="small"
            type="button"
            variant="outline"
          >
            <Printer className="size-3.5 shrink-0" />
            <span className="truncate">{t("actions.print")}</span>
          </Button>
        </footer>
      </section>
    </div>
  );
}

export { StockReceiptDialog, StockReceiptIconActions, StockReceiptPreview };
