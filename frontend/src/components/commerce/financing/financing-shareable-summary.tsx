"use client";

import { Copy, Printer, Share2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/global/primitives/button";
import { useNotification } from "@/providers/global/notification-provider";
import type {
  FinancingAgreementType,
  FinancingFrequency,
  FinancingTransactionType,
  FinancingWarrantyMonths,
} from "@/types/commerce/financing";

type FinancingSummaryDetail = {
  label: string;
  value: string;
};

type FinancingSummaryItem = {
  key: string;
  name: string;
  quantity_text: string;
  line_total: number;
  details: FinancingSummaryDetail[];
  warranty_months: FinancingWarrantyMonths | null;
};

type FinancingShareableSummaryData = {
  reference: string;
  created_at: string;
  agreement_type: FinancingAgreementType;
  transaction_type: FinancingTransactionType;
  customer_name: string;
  customer_phone: string;
  customer_region: string;
  contract_total: number;
  upfront_cash: number;
  trade_in_item_name: string;
  trade_in_credit: number;
  contribution_total: number;
  installment_amount: number;
  frequency: FinancingFrequency;
  next_due_date: string;
  release_threshold_percent: number;
  items: FinancingSummaryItem[];
};

function FinancingShareableSummaryDialog({
  data,
  open,
  onClose,
}: {
  data: FinancingShareableSummaryData;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("CommerceFinancing");
  const locale = useLocale();
  const { notify } = useNotification();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const money = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const dateText = new Date(data.created_at).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rows = [
    t("shareableSummary.title"),
    `${t("shareableSummary.reference")}: ${data.reference}`,
    `${t("shareableSummary.date")}: ${dateText}`,
    `${t("shareableSummary.customer")}: ${data.customer_name}`,
    ...(data.customer_phone
      ? [`${t("shareableSummary.phone")}: ${data.customer_phone}`]
      : []),
    ...(data.customer_region
      ? [`${t("shareableSummary.region")}: ${data.customer_region}`]
      : []),
    `${t("shareableSummary.agreementType")}: ${t(data.agreement_type)}`,
    `${t("shareableSummary.transactionType")}: ${t(
      data.transaction_type === "trade_in" ? "tradeIn" : data.transaction_type,
    )}`,
  ];

  for (const item of data.items) {
    rows.push("", `${t("shareableSummary.product")}: ${item.name}`);
    for (const detail of item.details) rows.push(`${detail.label}: ${detail.value}`);
    rows.push(
      `${t("shareableSummary.quantity")}: ${item.quantity_text}`,
      `${t("shareableSummary.productAmount")}: ${money(item.line_total)}`,
    );
    if (item.warranty_months) {
      rows.push(
        `${t("shareableSummary.warranty")}: ${t("warrantyMonths", {
          months: item.warranty_months,
        })}`,
      );
    }
  }

  rows.push(
    "",
    `${t("shareableSummary.contractTotal")}: ${money(data.contract_total)}`,
    `${t("shareableSummary.initialContribution")}: ${money(data.contribution_total)}`,
  );
  if (data.upfront_cash > 0) {
    rows.push(`${t("shareableSummary.upfrontCash")}: ${money(data.upfront_cash)}`);
  }
  if (data.trade_in_credit > 0) {
    rows.push(
      `${t("shareableSummary.tradeInItem")}: ${data.trade_in_item_name}`,
      `${t("shareableSummary.tradeInCredit")}: ${money(data.trade_in_credit)}`,
    );
  }
  rows.push(
    `${t("shareableSummary.scheduledPayment")}: ${money(data.installment_amount)}`,
    `${t("shareableSummary.frequency")}: ${t(data.frequency)}`,
    `${t("shareableSummary.nextDue")}: ${data.next_due_date}`,
  );
  if (data.agreement_type === "installment") {
    rows.push(
      `${t("shareableSummary.releaseThreshold")}: ${data.release_threshold_percent}%`,
    );
  }

  const text = rows.join("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    notify({ message: t("shareableSummary.copied"), tone: "success" });
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${t("shareableSummary.title")} ${data.reference}`,
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
    const escapedReference = data.reference
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-6"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        aria-labelledby="financing-summary-title"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="font-semibold" id="financing-summary-title">
              {t("shareableSummary.title")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("shareableSummary.savedDescription")}
            </p>
          </div>
          <Button
            aria-label={t("shareableSummary.close")}
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="grid gap-4 overflow-y-auto p-4 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/50">
            <div>
              <span className="block text-slate-500">{t("shareableSummary.reference")}</span>
              <strong className="wrap-anywhere">{data.reference}</strong>
            </div>
            <div>
              <span className="block text-slate-500">{t("shareableSummary.date")}</span>
              <strong>{dateText}</strong>
            </div>
            <div>
              <span className="block text-slate-500">{t("shareableSummary.customer")}</span>
              <strong className="wrap-break-word">{data.customer_name}</strong>
            </div>
            <div>
              <span className="block text-slate-500">{t("shareableSummary.phone")}</span>
              <strong>{data.customer_phone || "—"}</strong>
            </div>
            <div>
              <span className="block text-slate-500">{t("shareableSummary.region")}</span>
              <strong>{data.customer_region || "—"}</strong>
            </div>
            <div>
              <span className="block text-slate-500">{t("shareableSummary.agreementType")}</span>
              <strong>{t(data.agreement_type)}</strong>
            </div>
          </div>

          <div className="grid gap-2">
            {data.items.map((item) => (
              <section
                className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                key={item.key}
              >
                <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">
                  {t("shareableSummary.product")}
                </span>
                <strong className="mt-0.5 block wrap-break-word">{item.name}</strong>
                {item.details.length ? (
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {item.details.map((detail) => (
                      <div className="min-w-0" key={`${item.key}-${detail.label}-${detail.value}`}>
                        <span className="block text-slate-500">{detail.label}</span>
                        <strong className="block wrap-anywhere">{detail.value}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                  <div>
                    <span className="block text-slate-500">{t("shareableSummary.quantity")}</span>
                    <strong>{item.quantity_text}</strong>
                  </div>
                  <div>
                    <span className="block text-slate-500">{t("shareableSummary.productAmount")}</span>
                    <strong>{money(item.line_total)}</strong>
                  </div>
                  {item.warranty_months ? (
                    <div className="col-span-2">
                      <span className="block text-slate-500">{t("shareableSummary.warranty")}</span>
                      <strong>{t("warrantyMonths", { months: item.warranty_months })}</strong>
                    </div>
                  ) : null}
                </div>
              </section>
            ))}
          </div>

          <section className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
            <div>
              <span className="block text-slate-500">{t("shareableSummary.contractTotal")}</span>
              <strong>{money(data.contract_total)}</strong>
            </div>
            <div>
              <span className="block text-slate-500">{t("shareableSummary.initialContribution")}</span>
              <strong>{money(data.contribution_total)}</strong>
            </div>
            {data.upfront_cash > 0 ? (
              <div>
                <span className="block text-slate-500">{t("shareableSummary.upfrontCash")}</span>
                <strong>{money(data.upfront_cash)}</strong>
              </div>
            ) : null}
            {data.trade_in_credit > 0 ? (
              <>
                <div>
                  <span className="block text-slate-500">{t("shareableSummary.tradeInItem")}</span>
                  <strong>{data.trade_in_item_name}</strong>
                </div>
                <div>
                  <span className="block text-slate-500">{t("shareableSummary.tradeInCredit")}</span>
                  <strong>{money(data.trade_in_credit)}</strong>
                </div>
              </>
            ) : null}
            <div>
              <span className="block text-slate-500">{t("shareableSummary.scheduledPayment")}</span>
              <strong>{money(data.installment_amount)}</strong>
            </div>
            <div>
              <span className="block text-slate-500">{t("shareableSummary.frequency")}</span>
              <strong>{t(data.frequency)}</strong>
            </div>
            <div>
              <span className="block text-slate-500">{t("shareableSummary.nextDue")}</span>
              <strong>{data.next_due_date}</strong>
            </div>
            {data.agreement_type === "installment" ? (
              <div>
                <span className="block text-slate-500">{t("shareableSummary.releaseThreshold")}</span>
                <strong>{data.release_threshold_percent}%</strong>
              </div>
            ) : null}
          </section>
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <Button onClick={() => void copy()} type="button" variant="outline">
            <Copy className="size-4" />{t("shareableSummary.copy")}
          </Button>
          <Button onClick={() => void share()} type="button" variant="outline">
            <Share2 className="size-4" />{t("shareableSummary.share")}
          </Button>
          <Button onClick={print} type="button" variant="outline">
            <Printer className="size-4" />{t("shareableSummary.print")}
          </Button>
        </footer>
      </section>
    </div>
  );
}

export { FinancingShareableSummaryDialog };
export type {
  FinancingShareableSummaryData,
  FinancingSummaryDetail,
  FinancingSummaryItem,
};
