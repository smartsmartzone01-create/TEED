"use client";

import { Copy, Printer, Share2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/global/primitives/button";
import { useNotification } from "@/providers/global/notification-provider";
import type { StockReceipt, StockReceiptLine } from "@/types/commerce/inventory";
import { formatQuantityWithUnit } from "@/utils/commerce/quantity";

type CustomerReceiptLine = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
};

type CustomerStockReceipt = {
  status: string;
  receivedAt: string;
  lines: CustomerReceiptLine[];
};

const finiteNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const lineQuantity = (line: StockReceiptLine) => {
  const conversion = finiteNumber(line.conversion_to_base || "1") || 1;
  return finiteNumber(line.quantity_received) / conversion;
};

function useShareableStockReceipt(receipt: StockReceipt) {
  const locale = useLocale();
  const t = useTranslations("CommerceStock");
  const { notify } = useNotification();

  const labels = {
    title: t("receipt.title"),
    status: t("fields.status"),
    date: t("fields.dateReceived"),
    product: t("receipt.product"),
    quantity: t("fields.quantity"),
  };

  const receiptView: CustomerStockReceipt = {
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
    lines: receipt.lines.map((line) => ({
      id: line.id,
      name: line.product_name,
      quantity: lineQuantity(line),
      unit: line.received_unit,
    })),
  };

  const rows = [
    labels.title,
    `${labels.status}: ${receiptView.status}`,
    `${labels.date}: ${receiptView.receivedAt}`,
  ];

  for (const line of receiptView.lines) {
    rows.push("", `${labels.product}: ${line.name}`);
    rows.push(
      `${labels.quantity}: ${formatQuantityWithUnit(line.quantity, line.unit, locale)}`,
    );
  }

  const text = rows.join("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    notify({ message: t("success.copied"), tone: "success" });
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: labels.title, text });
      return;
    }
    await copy();
  };

  const print = () => {
    const escapeHtml = (value: string) =>
      value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
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
      `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(labels.title)}</title><style>@page{margin:16mm}body{font-family:Arial,sans-serif;color:#111;margin:0 auto;max-width:720px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.55 Arial,sans-serif;margin:0}</style></head><body><pre>${escapeHtml(text)}</pre></body></html>`,
    );
    printDocument.close();

    const cleanup = () => window.setTimeout(() => frame.remove(), 500);
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      cleanup();
    }, 150);
  };

  return { receiptView, labels, copy, share, print };
}

function StockReceiptPreview({ receipt }: { receipt: StockReceipt }) {
  const locale = useLocale();
  const { receiptView, labels } = useShareableStockReceipt(receipt);

  return (
    <div className="grid gap-4 text-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/50">
        <div>
          <span className="block text-slate-500">{labels.status}</span>
          <strong>{receiptView.status}</strong>
        </div>
        <div>
          <span className="block text-slate-500">{labels.date}</span>
          <strong>{receiptView.receivedAt}</strong>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {receiptView.lines.map((line) => (
            <div className="flex items-start justify-between gap-3 p-3" key={line.id}>
              <div className="min-w-0">
                <span className="block text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">
                  {labels.product}
                </span>
                <strong className="block truncate">{line.name}</strong>
              </div>
              <strong className="shrink-0 text-right text-xs">
                {formatQuantityWithUnit(line.quantity, line.unit, locale)}
              </strong>
            </div>
          ))}
        </div>
      </section>
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
