"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/global/primitives/button";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useNotification } from "@/providers/global/notification-provider";
import { commerceRead } from "@/services/commerce/commerce";

type StockLine = {
  id: string;
  product_name: string;
  product_sku: string;
  tracking_mode: string;
  quantity_received: string;
  received_unit: string;
  conversion_to_base: string;
  unit_cost: string | null;
  received_unit_cost: string | null;
  tracked_units: Array<{
    internal_serial: string;
    model_name: string;
    brand: string;
    color: string;
    capacity: string;
    imei?: string;
    serial_number?: string;
    condition?: string;
    identifiers: Array<{ kind: string; value: string }>;
  }>;
};

type StockReceipt = {
  id: string;
  reference: string;
  status: string;
  supplier_name: string;
  supplier_reference: string;
  notes: string;
  received_at: string | null;
  created_at?: string;
  additional_cost: string;
  total_buying_value: string;
  batches: Array<{
    id: string;
    name: string;
    notes?: string;
    groups: Array<{
      id: string;
      name: string;
      quantity: string;
      unit: string;
      buying_price: string | null;
      types: StockLine[];
    }>;
  }>;
  lines: StockLine[];
  late_deliveries: StockReceipt[];
};

type Target = { receipt: StockReceipt; mount: HTMLElement };
type Labels = {
  title: string;
  supplier: string;
  supplierReference: string;
  notes: string;
  receivedAt: string;
  status: string;
  buyingValue: string;
  stockExpense: string;
  totalStockCost: string;
  batch: string;
  group: string;
  directItems: string;
  lateDeliveries: string;
  costPerUnit: string;
  totalCost: string;
  tracking: string;
};

const numberText = (value: string | number | null | undefined) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(number)
    : String(value ?? "");
};

const moneyText = (value: string | number | null | undefined) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(number)
    : String(value ?? "");
};

function lineSummary(line: StockLine, labels: Labels, indent = "") {
  const conversion = Number(line.conversion_to_base || "1") || 1;
  const quantity = Number(line.quantity_received) / conversion;
  const unitCost = line.received_unit_cost == null ? null : Number(line.received_unit_cost);
  const total = unitCost == null ? null : quantity * unitCost;
  const rows = [
    `${indent}${line.product_name}${line.product_sku ? ` (${line.product_sku})` : ""}`,
    `${indent}  ${numberText(quantity)} ${line.received_unit}`,
    `${indent}  ${labels.costPerUnit}: ${unitCost == null ? "—" : moneyText(unitCost)}`,
    `${indent}  ${labels.totalCost}: ${total == null ? "—" : moneyText(total)}`,
    `${indent}  ${labels.tracking}: ${line.tracking_mode}`,
  ];
  for (const unit of line.tracked_units) {
    const details = [
      unit.model_name,
      unit.brand,
      unit.color,
      unit.capacity,
      unit.internal_serial,
      unit.imei,
      unit.serial_number,
      unit.condition,
      ...unit.identifiers.map((identifier) => `${identifier.kind}: ${identifier.value}`),
    ].filter(Boolean);
    rows.push(`${indent}  - ${details.join(" · ") || line.product_name}`);
  }
  return rows;
}

function formatReceipt(receipt: StockReceipt, labels: Labels) {
  const rows = [
    labels.title,
    receipt.reference,
    `${labels.status}: ${receipt.status}`,
    `${labels.receivedAt}: ${receipt.received_at ? new Date(receipt.received_at).toLocaleString() : "—"}`,
    `${labels.supplier}: ${receipt.supplier_name || "—"}`,
    `${labels.supplierReference}: ${receipt.supplier_reference || "—"}`,
    `${labels.notes}: ${receipt.notes || "—"}`,
    "",
  ];

  const groupedLineIds = new Set<string>();
  for (const batch of receipt.batches) {
    rows.push(`${labels.batch}: ${batch.name}`);
    if (batch.notes) rows.push(`  ${labels.notes}: ${batch.notes}`);
    for (const group of batch.groups) {
      rows.push(`  ${labels.group}: ${group.name} · ${numberText(group.quantity)} ${group.unit}`);
      if (group.buying_price != null) {
        rows.push(`    ${labels.costPerUnit}: ${moneyText(group.buying_price)}`);
        rows.push(`    ${labels.totalCost}: ${moneyText(Number(group.buying_price) * Number(group.quantity))}`);
      }
      for (const line of group.types) {
        groupedLineIds.add(line.id);
        rows.push(...lineSummary(line, labels, "    "));
      }
    }
    rows.push("");
  }

  const directLines = receipt.lines.filter((line) => !groupedLineIds.has(line.id));
  if (directLines.length) {
    rows.push(labels.directItems);
    for (const line of directLines) rows.push(...lineSummary(line, labels, "  "));
    rows.push("");
  }

  const buyingValue = Number(receipt.total_buying_value || 0);
  const additionalCost = Number(receipt.additional_cost || 0);
  rows.push(`${labels.buyingValue}: ${moneyText(buyingValue)}`);
  rows.push(`${labels.stockExpense}: ${moneyText(additionalCost)}`);
  rows.push(`${labels.totalStockCost}: ${moneyText(buyingValue + additionalCost)}`);

  if (receipt.late_deliveries.length) {
    rows.push("", labels.lateDeliveries);
    for (const delivery of receipt.late_deliveries) {
      rows.push("", ...formatReceipt(delivery, labels).split("\n").slice(1));
    }
  }
  return rows.join("\n");
}

function SummaryActions({ receipt }: { receipt: StockReceipt }) {
  const t = useTranslations("Commerce");
  const stockT = useTranslations("CommerceStock");
  const { notify } = useNotification();
  const labels: Labels = {
    title: stockT("summary.title"),
    supplier: t("fields.supplier"),
    supplierReference: t("fields.reference"),
    notes: t("fields.notes"),
    receivedAt: t("fields.date"),
    status: t("savedReceipt.status"),
    buyingValue: t("savedReceipt.buyingValue"),
    stockExpense: t("fields.stockExpense"),
    totalStockCost: stockT("summary.totalStockCost"),
    batch: stockT("summary.batch"),
    group: stockT("summary.group"),
    directItems: stockT("summary.directItems"),
    lateDeliveries: t("lateDeliveries"),
    costPerUnit: stockT("costMode.perUnit"),
    totalCost: stockT("costMode.total"),
    tracking: t("fields.tracking"),
  };
  const text = formatReceipt(receipt, labels);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    notify({ message: stockT("success.copied"), tone: "success" });
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: `${stockT("summary.title")} ${receipt.reference}`, text });
      return;
    }
    await copy();
  };

  const print = () => {
    const popup = window.open("", "_blank", "width=760,height=900");
    if (!popup) return;
    const escaped = text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    popup.document.write(
      `<!doctype html><html><head><title>${receipt.reference}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}pre{white-space:pre-wrap;font:14px/1.55 Arial,sans-serif}</style></head><body><pre>${escaped}</pre></body></html>`,
    );
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <Button onClick={() => void copy()} size="small" type="button" variant="outline">
        {stockT("actions.copy")}
      </Button>
      <Button onClick={() => void share()} size="small" type="button" variant="outline">
        {stockT("actions.share")}
      </Button>
      <Button onClick={print} size="small" type="button" variant="outline">
        {stockT("actions.print")}
      </Button>
    </div>
  );
}

function StockSummaryActionsPanel({ businessId }: { businessId: string }) {
  const t = useTranslations("Commerce");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const refreshingRef = useRef(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await commerceRead(businessId, accessToken, "stock-receipts");
      const data = response.data as { receipts?: StockReceipt[] } | null;
      setReceipts(data?.receipts ?? []);
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("errors.load"),
        tone: "error",
      });
    }
  }, [accessToken, businessId, notify, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    let frame = 0;
    const scan = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const savedReference = Array.from(document.querySelectorAll<HTMLElement>("p"))
          .map((node) => node.textContent?.trim() ?? "")
          .find((text) => text.startsWith("MZIGO-") && text.includes(" · "))
          ?.split(" · ")[0];
        if (
          savedReference &&
          !receipts.some((receipt) => receipt.reference === savedReference) &&
          !refreshingRef.current
        ) {
          refreshingRef.current = true;
          void load().finally(() => {
            refreshingRef.current = false;
          });
        }

        const next: Target[] = [];
        for (const receipt of receipts) {
          let host = Array.from(document.querySelectorAll<HTMLElement>("article")).find(
            (article) => article.querySelector("strong")?.textContent?.trim() === receipt.reference,
          );
          if (!host) {
            const referenceLine = Array.from(document.querySelectorAll<HTMLElement>("p")).find(
              (node) => node.textContent?.trim().startsWith(`${receipt.reference} ·`),
            );
            host = referenceLine?.closest<HTMLElement>("section") ?? undefined;
          }
          if (!host) continue;
          let mount = host.querySelector<HTMLElement>(
            `[data-commerce-stock-summary-root="${receipt.id}"]`,
          );
          if (!mount) {
            mount = document.createElement("div");
            mount.dataset.commerceStockSummaryRoot = receipt.id;
            host.appendChild(mount);
          }
          next.push({ receipt, mount });
        }
        setTargets((current) => {
          const unchanged =
            current.length === next.length &&
            current.every(
              (target, index) =>
                target.receipt.id === next[index]?.receipt.id &&
                target.mount === next[index]?.mount,
            );
          return unchanged ? current : next;
        });
      });
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      for (const mount of document.querySelectorAll("[data-commerce-stock-summary-root]")) {
        mount.remove();
      }
    };
  }, [load, receipts]);

  return (
    <>
      {targets.map(({ receipt, mount }) =>
        createPortal(<SummaryActions receipt={receipt} />, mount, receipt.id),
      )}
    </>
  );
}

export { StockSummaryActionsPanel };
