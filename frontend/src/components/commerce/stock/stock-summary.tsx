"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  StockReceiptDialog,
  StockReceiptIconActions,
} from "@/components/commerce/stock/stock-shareable-receipt";
import { Button } from "@/components/global/primitives/button";
import type { StockReceipt, StockReceiptLine } from "@/types/commerce/inventory";

import styles from "./stock-summary.module.css";

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

type LedgerLine = {
  batchName: string;
  groupName: string;
  groupQuantity: string;
  groupUnit: string;
  direct: boolean;
  line: StockReceiptLine;
};

const ledgerLinesForReceipt = (receipt: StockReceipt): LedgerLine[] =>
  receipt.batches.flatMap((batch) =>
    batch.groups.flatMap((group) => {
      const direct =
        group.types.length === 1 && group.name === group.types[0].product_name;
      return group.types.map((line) => ({
        batchName: batch.name,
        groupName: group.name,
        groupQuantity: group.quantity,
        groupUnit: group.unit,
        direct,
        line,
      }));
    }),
  );

function StockLedgerScroller({
  children,
  previousLabel,
  nextLabel,
}: {
  children: ReactNode;
  previousLabel: string;
  nextLabel: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const syncControls = useCallback(() => {
    const viewport = viewportRef.current;
    const previous = previousRef.current;
    const next = nextRef.current;
    if (!viewport || !previous || !next) return;

    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const hasOverflow = maxScroll > 2;
    previous.hidden = !hasOverflow || viewport.scrollLeft <= 2;
    next.hidden = !hasOverflow || viewport.scrollLeft >= maxScroll - 2;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const frame = window.requestAnimationFrame(syncControls);
    const observer = new ResizeObserver(syncControls);
    observer.observe(viewport);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [syncControls]);

  const scroll = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollBy({
      left: direction * Math.max(280, viewport.clientWidth * 0.72),
      behavior: "smooth",
    });
  };

  return (
    <div className={styles.scrollShell}>
      <div
        className={`stock-ledger-desktop ${styles.scrollViewport}`}
        onScroll={syncControls}
        ref={viewportRef}
      >
        {children}
      </div>
      <button
        aria-label={previousLabel}
        className={`${styles.scrollControl} ${styles.scrollControlLeft}`}
        hidden
        onClick={() => scroll(-1)}
        ref={previousRef}
        title={previousLabel}
        type="button"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        aria-label={nextLabel}
        className={`${styles.scrollControl} ${styles.scrollControlRight}`}
        hidden
        onClick={() => scroll(1)}
        ref={nextRef}
        title={nextLabel}
        type="button"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

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

function StockSummaryActions({ receipt }: { receipt: StockReceipt }) {
  const stockT = useTranslations("CommerceStock");
  const commerceT = useTranslations("Commerce");
  const locale = useLocale();
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const standaloneActionsRef = useRef<HTMLDivElement>(null);
  const ledgerLines = ledgerLinesForReceipt(receipt);
  const total =
    Number(receipt.total_buying_value || 0) + Number(receipt.additional_cost || 0);
  const receiptDate = receipt.received_at || receipt.created_at;
  const mobileDetailsId = `stock-mobile-details-${receipt.id}`;
  const statusTone =
    receipt.status === "received"
      ? "stock-ledger-status-received"
      : receipt.status === "draft"
        ? "stock-ledger-status-draft"
        : "stock-ledger-status-archived";

  const statusLabel = stockT(`ledger.status.${receipt.status}`);
  const recordingLabel = (entry: LedgerLine) => {
    if (entry.direct) return stockT("ledger.recording.individual");
    return entry.line.tracking_mode === "individual"
      ? stockT("ledger.recording.groupIndividual")
      : stockT("ledger.recording.groupQuantity");
  };

  useEffect(() => {
    const root = standaloneActionsRef.current;
    if (receipt.status !== "received" || !root || root.closest("article")) return;
    setReceiptDialogOpen(true);
  }, [receipt.id, receipt.status]);

  const renderProductInfo = (line: StockReceiptLine) => (
    <div className="stock-ledger-product-info" key={`info-${line.id}`}>
      <strong>{line.product_name}</strong>
      {[line.product_brand, line.product_variant].filter(Boolean).length ? (
        <span>{[line.product_brand, line.product_variant].filter(Boolean).join(" · ")}</span>
      ) : null}
      {line.tracked_units.map((unit) => {
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
        return details.length ? <span key={unit.id}>{details.join(" · ")}</span> : null;
      })}
    </div>
  );

  const desktopHeaders = [
    stockT("ledger.headers.stockId"),
    stockT("ledger.headers.supplier"),
    stockT("ledger.headers.batchName"),
    stockT("ledger.headers.productGroup"),
    stockT("ledger.headers.recordingMethod"),
    stockT("ledger.headers.productInfo"),
    stockT("ledger.headers.productSku"),
    stockT("ledger.headers.pricePerUnit"),
    stockT("ledger.headers.expenses"),
    stockT("ledger.headers.total"),
    stockT("ledger.headers.actions"),
  ];

  return (
    <>
      <div className="stock-received-ledger-entry">
        <StockLedgerScroller
          nextLabel={stockT("ledger.navigation.next")}
          previousLabel={stockT("ledger.navigation.previous")}
        >
          <div className="stock-ledger-header">
            {desktopHeaders.map((header) => (
              <div className="stock-ledger-header-cell" key={header}>
                {header}
              </div>
            ))}
          </div>

          <div className="stock-ledger-desktop-body">
            <div className="stock-ledger-cell stock-ledger-stock-cell">
              <strong className="stock-ledger-reference">{receipt.reference}</strong>
              <span className={`stock-ledger-status ${statusTone}`}>{statusLabel}</span>
              <span className="stock-ledger-date">
                {receiptDate
                  ? new Date(receiptDate).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </span>
            </div>

            <div className="stock-ledger-cell stock-ledger-supplier-cell">
              {receipt.supplier_name || stockT("values.noSupplier")}
            </div>

            <div className="stock-ledger-lines">
              {ledgerLines.length ? (
                ledgerLines.map((entry) => {
                  const quantity =
                    Number(entry.line.quantity_received) /
                    Number(entry.line.conversion_to_base || "1");
                  return (
                    <div className="stock-ledger-line" key={entry.line.id}>
                      <div className="stock-ledger-line-cell">{entry.batchName || "—"}</div>
                      <div className="stock-ledger-line-cell">
                        {entry.direct ? (
                          "—"
                        ) : (
                          <>
                            <strong>{entry.groupName}</strong>
                            <span>
                              {numberText(entry.groupQuantity)} {entry.groupUnit}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="stock-ledger-line-cell stock-ledger-recording-cell">
                        {recordingLabel(entry)}
                      </div>
                      <div className="stock-ledger-line-cell">{renderProductInfo(entry.line)}</div>
                      <div className="stock-ledger-line-cell stock-ledger-sku-cell">
                        {entry.line.product_sku || "—"}
                      </div>
                      <div className="stock-ledger-line-cell stock-ledger-price-cell">
                        <strong>
                          {moneyText(entry.line.received_unit_cost)} / {entry.line.received_unit}
                        </strong>
                        <span>
                          {numberText(quantity)} {entry.line.received_unit}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="stock-ledger-line stock-ledger-line-empty">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div className="stock-ledger-line-cell" key={index}>—</div>
                  ))}
                </div>
              )}
            </div>

            <div className="stock-ledger-cell stock-ledger-expense-cell">
              {moneyText(receipt.additional_cost)}
            </div>
            <div className="stock-ledger-cell stock-ledger-total-cell">
              <strong>{moneyText(total)}</strong>
            </div>
            <div className="stock-ledger-cell stock-ledger-actions-cell">
              <StockReceiptIconActions
                className={`stock-ledger-icon-actions ${styles.ledgerActions}`}
                receipt={receipt}
              />
            </div>
          </div>
        </StockLedgerScroller>

        <div className="stock-ledger-mobile">
          <div className="stock-ledger-mobile-band stock-ledger-mobile-band-one">
            <div className="stock-ledger-mobile-cell">
              <span className="stock-ledger-mobile-label">{stockT("ledger.headers.stockId")}</span>
              <strong>{receipt.reference}</strong>
              <span className={`stock-ledger-status ${statusTone}`}>{statusLabel}</span>
              <span className="stock-ledger-date">
                {receiptDate
                  ? new Date(receiptDate).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </span>
            </div>
            <div className="stock-ledger-mobile-cell">
              <span className="stock-ledger-mobile-label">{stockT("ledger.headers.supplier")}</span>
              <strong>{receipt.supplier_name || stockT("values.noSupplier")}</strong>
            </div>
            <div className="stock-ledger-mobile-cell">
              <span className="stock-ledger-mobile-label">{stockT("ledger.headers.batchName")}</span>
              <div className="stock-ledger-mobile-stack">
                {Array.from(new Set(ledgerLines.map((entry) => entry.batchName))).map((name) => (
                  <span key={name}>{name || "—"}</span>
                ))}
              </div>
            </div>
          </div>

          <div hidden={!mobileExpanded} id={mobileDetailsId}>
            <div className="stock-ledger-mobile-band stock-ledger-mobile-band-two">
              <div className="stock-ledger-mobile-cell">
                <span className="stock-ledger-mobile-label">{stockT("ledger.headers.recordingMethod")}</span>
                <div className="stock-ledger-mobile-stack">
                  {ledgerLines.map((entry) => (
                    <span key={`method-${entry.line.id}`}>{recordingLabel(entry)}</span>
                  ))}
                </div>
              </div>
              <div className="stock-ledger-mobile-cell">
                <span className="stock-ledger-mobile-label">{stockT("ledger.headers.productInfo")}</span>
                <div className="stock-ledger-mobile-stack">
                  {ledgerLines.map((entry) => renderProductInfo(entry.line))}
                </div>
              </div>
              <div className="stock-ledger-mobile-cell">
                <span className="stock-ledger-mobile-label">{stockT("ledger.headers.productGroup")}</span>
                <div className="stock-ledger-mobile-stack">
                  {ledgerLines.map((entry) => (
                    <span key={`group-${entry.line.id}`}>
                      {entry.direct
                        ? "—"
                        : `${entry.groupName} · ${numberText(entry.groupQuantity)} ${entry.groupUnit}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="stock-ledger-mobile-band stock-ledger-mobile-band-three">
              <div className="stock-ledger-mobile-cell">
                <span className="stock-ledger-mobile-label">{stockT("ledger.headers.productSku")}</span>
                <div className="stock-ledger-mobile-stack stock-ledger-mobile-sku-stack">
                  {ledgerLines.map((entry) => (
                    <span key={`sku-${entry.line.id}`}>{entry.line.product_sku || "—"}</span>
                  ))}
                </div>
              </div>
              <div className="stock-ledger-mobile-cell">
                <span className="stock-ledger-mobile-label">{stockT("ledger.headers.pricePerUnit")}</span>
                <div className="stock-ledger-mobile-stack">
                  {ledgerLines.map((entry) => (
                    <span key={`price-${entry.line.id}`}>
                      {moneyText(entry.line.received_unit_cost)} / {entry.line.received_unit}
                    </span>
                  ))}
                </div>
              </div>
              <div className="stock-ledger-mobile-cell">
                <span className="stock-ledger-mobile-label">{stockT("ledger.headers.expenses")}</span>
                <strong>{moneyText(receipt.additional_cost)}</strong>
              </div>
              <div className="stock-ledger-mobile-cell">
                <span className="stock-ledger-mobile-label">{stockT("ledger.headers.total")}</span>
                <strong>{moneyText(total)}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-1.5 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-1">
              <span className="stock-ledger-mobile-label mb-0 shrink-0">
                {stockT("ledger.headers.actions")}
              </span>
              <StockReceiptIconActions
                className="stock-ledger-icon-actions stock-ledger-icon-actions-mobile"
                receipt={receipt}
              />
            </div>
            <Button
              aria-controls={mobileDetailsId}
              aria-expanded={mobileExpanded}
              className="h-7 min-h-0 shrink-0 gap-1 px-2 text-[0.65rem]"
              onClick={() => setMobileExpanded((current) => !current)}
              size="small"
              type="button"
              variant="ghost"
            >
              {mobileExpanded ? commerceT("actions.showLess") : commerceT("actions.viewMore")}
              {mobileExpanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div
        className="stock-summary-actions-standalone order-2 flex flex-wrap items-center gap-1.5"
        ref={standaloneActionsRef}
      >
        <StockReceiptIconActions className="flex flex-wrap items-center gap-1.5" receipt={receipt} />
      </div>

      <StockReceiptDialog
        onClose={() => setReceiptDialogOpen(false)}
        open={receiptDialogOpen}
        receipt={receipt}
      />
    </>
  );
}

export { StockProductSummary, StockSummaryActions };
