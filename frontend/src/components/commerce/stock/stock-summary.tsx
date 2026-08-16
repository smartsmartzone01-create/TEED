"use client";

import { Copy, Printer, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/global/primitives/button";
import { useNotification } from "@/providers/global/notification-provider";
import type { StockReceipt, StockReceiptLine } from "@/types/commerce/inventory";

const numberText = (value: string | number | null | undefined) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(number)
    : String(value ?? "");
};

const moneyText = (value: string | number | null | undefined) => {
  if (value == null) return "—";
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(number)
    : String(value);
};

function StockProductSummary({ line }: { line: StockReceiptLine }) {
  const t = useTranslations("CommerceStock");
  const quantity =
    Number(line.quantity_received) / Number(line.conversion_to_base || "1");
  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <strong>{line.product_name}</strong>
          <p className="text-xs text-slate-500">{line.product_sku}</p>
        </div>
        <span className="text-sm font-medium">
          {numberText(quantity)} {line.received_unit}
        </span>
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <p>
          <span className="text-slate-500">{t("fields.costPerUnit")}:</span>{" "}
          <strong>{moneyText(line.received_unit_cost)}</strong>
        </p>
        <p>
          <span className="text-slate-500">{t("fields.totalBuyingCost")}:</span>{" "}
          <strong>{moneyText(line.total_buying_cost)}</strong>
        </p>
      </div>
      {line.tracked_units.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {line.tracked_units.map((unit) => (
            <div
              className="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-900"
              key={unit.id}
            >
              <strong>{unit.model_name || line.product_name}</strong>
              <p className="mt-1 text-slate-500">
                {[
                  unit.brand,
                  unit.color,
                  unit.capacity,
                  unit.internal_serial,
                  ...unit.identifiers.map(
                    (identifier) => `${identifier.kind}: ${identifier.value}`,
                  ),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatStockSummary(receipt: StockReceipt, labels: Record<string, string>) {
  const rows = [
    labels.title,
    receipt.reference,
    `${labels.status}: ${receipt.status}`,
    `${labels.date}: ${receipt.received_at ? new Date(receipt.received_at).toLocaleString() : "—"}`,
    `${labels.supplier}: ${receipt.supplier_name || "—"}`,
    "",
  ];

  for (const batch of receipt.batches) {
    rows.push(`${labels.batch}: ${batch.name}`);
    for (const group of batch.groups) {
      const isDirectItem =
        group.types.length === 1 && group.name === group.types[0].product_name;
      if (!isDirectItem) {
        rows.push(
          `  ${labels.group}: ${group.name} · ${numberText(group.quantity)} ${group.unit}`,
        );
      }
      for (const line of group.types) {
        const quantity =
          Number(line.quantity_received) / Number(line.conversion_to_base || "1");
        rows.push(`${isDirectItem ? "  " : "    "}${line.product_name} (${line.product_sku})`);
        rows.push(
          `${isDirectItem ? "    " : "      "}${labels.quantity}: ${numberText(quantity)} ${line.received_unit}`,
        );
        rows.push(
          `${isDirectItem ? "    " : "      "}${labels.costPerUnit}: ${moneyText(line.received_unit_cost)}`,
        );
        rows.push(
          `${isDirectItem ? "    " : "      "}${labels.totalBuyingCost}: ${moneyText(line.total_buying_cost)}`,
        );
        for (const unit of line.tracked_units) {
          const details = [
            unit.model_name,
            unit.brand,
            unit.color,
            unit.capacity,
            unit.internal_serial,
            ...unit.identifiers.map(
              (identifier) => `${identifier.kind}: ${identifier.value}`,
            ),
          ].filter(Boolean);
          rows.push(`${isDirectItem ? "    " : "      "}- ${details.join(" · ")}`);
        }
      }
    }
    rows.push("");
  }

  const buying = Number(receipt.total_buying_value || 0);
  const expenses = Number(receipt.additional_cost || 0);
  rows.push(`${labels.buyingValue}: ${moneyText(buying)}`);
  rows.push(`${labels.stockExpense}: ${moneyText(expenses)}`);
  rows.push(`${labels.totalStockCost}: ${moneyText(buying + expenses)}`);

  if (receipt.late_deliveries.length) {
    rows.push("", labels.lateDeliveries);
    for (const delivery of receipt.late_deliveries) {
      rows.push("", ...formatStockSummary(delivery, labels).split("\n").slice(1));
    }
  }
  return rows.join("\n");
}

function StockSummaryActions({ receipt }: { receipt: StockReceipt }) {
  const stockT = useTranslations("CommerceStock");
  const commerceT = useTranslations("Commerce");
  const { notify } = useNotification();
  const labels = {
    title: stockT("summary.title"),
    status: stockT("fields.status"),
    date: stockT("fields.dateReceived"),
    supplier: stockT("fields.supplier"),
    batch: stockT("summary.batch"),
    group: stockT("summary.group"),
    quantity: stockT("fields.quantity"),
    costPerUnit: stockT("fields.costPerUnit"),
    totalBuyingCost: stockT("fields.totalBuyingCost"),
    buyingValue: stockT("fields.totalBuyingValue"),
    stockExpense: stockT("fields.stockExpenses"),
    totalStockCost: stockT("summary.totalStockCost"),
    lateDeliveries: commerceT("lateDeliveries"),
  };
  const text = formatStockSummary(receipt, labels);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    notify({ message: stockT("success.copied"), tone: "success" });
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${stockT("summary.title")} ${receipt.reference}`,
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
      `<!doctype html><html><head><meta charset="utf-8"><title>${receipt.reference}</title><style>@page{margin:16mm}body{font-family:Arial,sans-serif;color:#111;margin:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.55 Arial,sans-serif;margin:0}</style></head><body><pre>${escaped}</pre></body></html>`,
    );
    printDocument.close();

    const cleanup = () => window.setTimeout(() => frame.remove(), 500);
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      cleanup();
    }, 150);
  };

  const iconButtonClass = "size-9 rounded-full p-0";

  return (
    <div className="order-2 flex flex-wrap items-center gap-1.5">
      <Button
        aria-label={stockT("actions.copy")}
        className={iconButtonClass}
        onClick={() => void copy()}
        size="small"
        title={stockT("actions.copy")}
        type="button"
        variant="ghost"
      >
        <Copy className="size-4" />
      </Button>
      <Button
        aria-label={stockT("actions.share")}
        className={iconButtonClass}
        onClick={() => void share()}
        size="small"
        title={stockT("actions.share")}
        type="button"
        variant="ghost"
      >
        <Share2 className="size-4" />
      </Button>
      <Button
        aria-label={stockT("actions.print")}
        className={iconButtonClass}
        onClick={print}
        size="small"
        title={stockT("actions.print")}
        type="button"
        variant="ghost"
      >
        <Printer className="size-4" />
      </Button>
    </div>
  );
}

export { StockProductSummary, StockSummaryActions };
