"use client";

import { Copy, Printer, Share2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/global/primitives/button";
import { useNotification } from "@/providers/global/notification-provider";
import type { Sale, SaleItem } from "@/types/commerce/sales";
import { formatQuantityWithUnit } from "@/utils/commerce/quantity";

type ReceiptDetail = {
  label: string;
  value: string;
};

type ReceiptItem = {
  id: string;
  name: string;
  quantity: string;
  amount: number;
  details: ReceiptDetail[];
};

const finiteNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function addCalendarMonths(value: string, months: number) {
  const source = new Date(value);
  const result = new Date(source);
  const day = source.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function visibleItemDetails(item: SaleItem, labels: Record<string, string>) {
  if (item.tracked_unit_details) {
    const details = item.tracked_unit_details;
    return [
      { label: labels.brand, value: details.brand },
      { label: labels.model, value: details.model_name },
      { label: labels.color, value: details.color },
      { label: labels.capacity, value: details.capacity },
      ...details.identifiers.map((identifier) => ({
        label: identifier.kind.toUpperCase(),
        value: identifier.value,
      })),
    ].filter((detail) => Boolean(detail.value));
  }

  const details = item.item_details ?? {};
  const rows: ReceiptDetail[] = [
    { label: labels.brand, value: details.brand ?? "" },
    { label: labels.model, value: details.model ?? "" },
    { label: labels.color, value: details.color ?? "" },
    { label: labels.capacity, value: details.capacity ?? "" },
  ];
  if (details.identifier_kind && details.identifier_value) {
    rows.push({
      label: details.identifier_kind.toUpperCase(),
      value: details.identifier_value,
    });
  }
  return rows.filter((detail) => Boolean(detail.value));
}

function incomingTradeDetails(
  details: Record<string, string>,
  labels: Record<string, string>,
) {
  const rows: ReceiptDetail[] = [
    { label: labels.brand, value: details.brand ?? "" },
    { label: labels.model, value: details.model ?? "" },
    { label: labels.color, value: details.color ?? "" },
    { label: labels.capacity, value: details.capacity ?? "" },
  ];
  if (details.identifier_kind && details.identifier_value) {
    rows.push({
      label: details.identifier_kind.toUpperCase(),
      value: details.identifier_value,
    });
  }
  return rows.filter((detail) => Boolean(detail.value));
}

function useShareableSalesReceipt(sale: Sale) {
  const locale = useLocale();
  const t = useTranslations("CommerceSales");
  const { notify } = useNotification();
  const isTradeIn = sale.transaction_type === "trade_in" && Boolean(sale.trade_in);

  const labels = {
    title: isTradeIn ? t("saleReceipt.tradeInTitle") : t("saleReceipt.title"),
    receiptNumber: t("saleReceipt.receiptNumber"),
    date: t("saleReceipt.date"),
    customer: t("saleReceipt.customer"),
    region: t("saleReceipt.region"),
    payment: t("saleReceipt.payment"),
    warranty: t("saleReceipt.warranty"),
    validUntil: t("saleReceipt.validUntil"),
    product: t("saleReceipt.product"),
    customerItem: t("saleReceipt.customerItem"),
    quantity: t("saleReceipt.quantity"),
    amount: t("saleReceipt.amount"),
    discount: t("saleReceipt.discount"),
    totalAmount: t("saleReceipt.totalAmount"),
    cashTopUp: t("saleReceipt.cashTopUp"),
    brand: t("saleReceipt.brand"),
    model: t("saleReceipt.model"),
    color: t("saleReceipt.color"),
    capacity: t("saleReceipt.capacity"),
  };

  const moneyText = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const dateText = new Date(sale.sold_at).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const paymentText = t(sale.payment_status);
  const warrantyText = sale.warranty_months
    ? t("warrantyMonths", { months: sale.warranty_months })
    : "";
  const warrantyUntilText = sale.warranty_months
    ? addCalendarMonths(sale.sold_at, sale.warranty_months).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const items: ReceiptItem[] = sale.items.map((item) => ({
    id: item.id,
    name: item.product_name || item.item_name,
    quantity: item.product_unit
      ? formatQuantityWithUnit(item.quantity, item.product_unit, locale)
      : new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(
          finiteNumber(item.quantity),
        ),
    amount: finiteNumber(item.line_total),
    details: visibleItemDetails(item, labels),
  }));

  const tradeDetails = sale.trade_in
    ? incomingTradeDetails(sale.trade_in.incoming_item_details, labels)
    : [];
  const cashTopUp = finiteNumber(sale.trade_in?.cash_top_up);
  const discount = finiteNumber(sale.discount);

  const rows = [
    labels.title,
    `${labels.receiptNumber}: ${sale.receipt_number}`,
    `${labels.date}: ${dateText}`,
    `${labels.customer}: ${sale.customer_name || "—"}`,
    `${labels.region}: ${sale.customer_region || "—"}`,
    `${labels.payment}: ${paymentText}`,
  ];

  if (sale.warranty_months) {
    rows.push(
      `${labels.warranty}: ${warrantyText}`,
      `${labels.validUntil}: ${warrantyUntilText}`,
    );
  }

  for (const item of items) {
    rows.push("", `${labels.product}: ${item.name}`);
    for (const detail of item.details) rows.push(`${detail.label}: ${detail.value}`);
    rows.push(`${labels.quantity}: ${item.quantity}`);
    if (!isTradeIn) rows.push(`${labels.amount}: ${moneyText(item.amount)}`);
  }

  if (isTradeIn && sale.trade_in) {
    rows.push("", `${labels.customerItem}: ${sale.trade_in.incoming_item_name}`);
    for (const detail of tradeDetails) rows.push(`${detail.label}: ${detail.value}`);
    if (cashTopUp > 0) rows.push(`${labels.cashTopUp}: ${moneyText(cashTopUp)}`);
  } else {
    if (discount > 0) rows.push("", `${labels.discount}: ${moneyText(discount)}`);
    rows.push("", `${labels.totalAmount}: ${moneyText(finiteNumber(sale.total))}`);
  }

  const text = rows.join("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    notify({ message: t("saleReceipt.copied"), tone: "success" });
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${labels.title} ${sale.receipt_number}`,
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
    const escapedReference = sale.receipt_number
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

    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      window.setTimeout(() => frame.remove(), 500);
    }, 150);
  };

  return {
    isTradeIn,
    labels,
    items,
    tradeDetails,
    cashTopUp,
    discount,
    dateText,
    paymentText,
    warrantyText,
    warrantyUntilText,
    moneyText,
    copy,
    share,
    print,
  };
}

function SalesReceiptPreview({ sale }: { sale: Sale }) {
  const t = useTranslations("CommerceSales");
  const {
    isTradeIn,
    labels,
    items,
    tradeDetails,
    cashTopUp,
    discount,
    dateText,
    paymentText,
    warrantyText,
    warrantyUntilText,
    moneyText,
  } = useShareableSalesReceipt(sale);

  return (
    <div className="grid gap-4 text-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/50">
        <div>
          <span className="block text-slate-500">{labels.receiptNumber}</span>
          <strong className="wrap-anywhere">{sale.receipt_number}</strong>
        </div>
        <div>
          <span className="block text-slate-500">{labels.date}</span>
          <strong>{dateText}</strong>
        </div>
        <div>
          <span className="block text-slate-500">{labels.customer}</span>
          <strong className="wrap-break-word">{sale.customer_name || "—"}</strong>
        </div>
        <div>
          <span className="block text-slate-500">{labels.region}</span>
          <strong className="wrap-break-word">{sale.customer_region || "—"}</strong>
        </div>
        <div className="col-span-2">
          <span className="block text-slate-500">{labels.payment}</span>
          <strong>{paymentText}</strong>
        </div>
        {sale.warranty_months ? (
          <>
            <div>
              <span className="block text-slate-500">{labels.warranty}</span>
              <strong>{warrantyText}</strong>
            </div>
            <div>
              <span className="block text-slate-500">{labels.validUntil}</span>
              <strong>{warrantyUntilText}</strong>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid gap-2">
        {items.map((item) => (
          <section
            className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
            key={item.id}
          >
            <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">
              {labels.product}
            </span>
            <strong className="mt-0.5 block wrap-break-word">{item.name}</strong>
            {item.details.length ? (
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {item.details.map((detail) => (
                  <div className="min-w-0" key={`${item.id}-${detail.label}-${detail.value}`}>
                    <span className="block text-slate-500">{detail.label}</span>
                    <strong className="block wrap-anywhere">{detail.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
              <span className="text-slate-500">{labels.quantity}</span>
              <strong>{item.quantity}</strong>
            </div>
            {!isTradeIn ? (
              <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">{labels.amount}</span>
                <strong>{moneyText(item.amount)}</strong>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      {isTradeIn && sale.trade_in ? (
        <section className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">
            {labels.customerItem}
          </span>
          <strong className="mt-0.5 block wrap-break-word">
            {sale.trade_in.incoming_item_name}
          </strong>
          {tradeDetails.length ? (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {tradeDetails.map((detail) => (
                <div className="min-w-0" key={`${detail.label}-${detail.value}`}>
                  <span className="block text-slate-500">{detail.label}</span>
                  <strong className="block wrap-anywhere">{detail.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
          {cashTopUp > 0 ? (
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
              <span className="text-slate-500">{labels.cashTopUp}</span>
              <strong>{moneyText(cashTopUp)}</strong>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="grid gap-1 border-t border-slate-300 pt-3 text-sm dark:border-slate-700">
          {discount > 0 ? (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">{labels.discount}</span>
              <strong>{moneyText(discount)}</strong>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <strong>{labels.totalAmount}</strong>
            <strong className="text-base">{moneyText(finiteNumber(sale.total))}</strong>
          </div>
        </div>
      )}

      {sale.status === "voided" ? (
        <p className="text-xs font-semibold text-slate-500">{t("void")}</p>
      ) : null}
    </div>
  );
}

function SalesReceiptIconActions({ sale }: { sale: Sale }) {
  const t = useTranslations("CommerceSales");
  const { copy, share, print } = useShareableSalesReceipt(sale);

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label={t("saleReceipt.copy")}
        className="rounded-lg border border-slate-200 p-2 dark:border-slate-800"
        title={t("saleReceipt.copy")}
        type="button"
        onClick={() => void copy()}
      >
        <Copy className="size-4" />
      </button>
      <button
        aria-label={t("saleReceipt.share")}
        className="rounded-lg border border-slate-200 p-2 dark:border-slate-800"
        title={t("saleReceipt.share")}
        type="button"
        onClick={() => void share()}
      >
        <Share2 className="size-4" />
      </button>
      <button
        aria-label={t("saleReceipt.print")}
        className="rounded-lg border border-slate-200 p-2 dark:border-slate-800"
        title={t("saleReceipt.print")}
        type="button"
        onClick={print}
      >
        <Printer className="size-4" />
      </button>
    </div>
  );
}

function SalesReceiptDialog({
  sale,
  open,
  onClose,
}: {
  sale: Sale;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("CommerceSales");
  const { copy, share, print } = useShareableSalesReceipt(sale);

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
        aria-labelledby={`sales-receipt-dialog-${sale.id}`}
        aria-modal="true"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-h-[calc(100dvh-2rem)]"
        role="dialog"
      >
        <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold" id={`sales-receipt-dialog-${sale.id}`}>
              {t("saleReceipt.savedTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{t("saleReceipt.savedHint")}</p>
          </div>
          <Button
            aria-label={t("saleReceipt.close")}
            className="size-8 shrink-0 rounded-md p-0"
            onClick={onClose}
            size="small"
            title={t("saleReceipt.close")}
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <SalesReceiptPreview sale={sale} />
        </div>

        <footer className="grid grid-cols-3 gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <Button
            className="min-w-0 gap-1.5 px-2 text-xs"
            onClick={() => void share()}
            size="small"
            type="button"
          >
            <Share2 className="size-3.5 shrink-0" />
            <span className="truncate">{t("saleReceipt.share")}</span>
          </Button>
          <Button
            className="min-w-0 gap-1.5 px-2 text-xs"
            onClick={() => void copy()}
            size="small"
            type="button"
            variant="outline"
          >
            <Copy className="size-3.5 shrink-0" />
            <span className="truncate">{t("saleReceipt.copy")}</span>
          </Button>
          <Button
            className="min-w-0 gap-1.5 px-2 text-xs"
            onClick={print}
            size="small"
            type="button"
            variant="outline"
          >
            <Printer className="size-3.5 shrink-0" />
            <span className="truncate">{t("saleReceipt.print")}</span>
          </Button>
        </footer>
      </section>
    </div>
  );
}

export { SalesReceiptDialog, SalesReceiptIconActions };
