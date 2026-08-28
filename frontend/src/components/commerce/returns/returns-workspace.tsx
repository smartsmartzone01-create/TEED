"use client";

import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import {
  Tooltip,
  TooltipProvider,
} from "@/components/global/primitives/tooltip";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import {
  createReturn,
  getReturnsWorkspace,
  type ReturnLookupFilters,
} from "@/services/commerce/returns";
import { getSalesAvailability } from "@/services/commerce/sales";
import { isRequestCancelled } from "@/services/global/api-client";
import type {
  ReturnCondition,
  ReturnReason,
  ReturnReplacementSource,
  ReturnResolution,
  SaleReturnSummary,
} from "@/types/commerce/returns";
import type {
  Sale,
  SaleAvailabilityProduct,
  SaleAvailabilityUnit,
  SaleItem,
} from "@/types/commerce/sales";
import {
  acceptsQuantityInput,
  isWholeQuantityUnit,
  quantityInputMode,
  quantityInputStep,
} from "@/utils/commerce/quantity";

const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950";
const field =
  "grid gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300";
const returnReasons: ReturnReason[] = [
  "damaged",
  "defective",
  "wrong_item",
  "wrong_size",
  "changed_mind",
  "not_as_expected",
  "other",
];
const identifierKinds = [
  "imei",
  "serial",
  "chassis",
  "barcode",
  "engine",
  "registration",
] as const;

type ReplacementIdentifierKind = "" | (typeof identifierKinds)[number];
type ReturnLineDraft = {
  condition: ReturnCondition;
  quantity: string;
};

const todayLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const nowLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

function periodForDate(value: string): ReturnLookupFilters {
  const start = new Date(`${value}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    soldFrom: start.toISOString(),
    soldBefore: end.toISOString(),
  };
}

function money(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(parsed)
    : String(value);
}

function remainingQuantity(item: SaleItem) {
  return Math.max(0, Number(item.quantity) - Number(item.returned_quantity));
}

function saleObjectNames(sale: Sale) {
  const names = Array.from(
    new Set(
      sale.items
        .map((item) => item.product_name || item.item_name)
        .filter(Boolean),
    ),
  );
  if (names.length <= 3) return names.join(" · ");
  return `${names.slice(0, 3).join(" · ")} +${names.length - 3}`;
}

function unitLabel(unit: SaleAvailabilityUnit) {
  const identification = unit.identifiers
    .map((item) => `${item.kind}: ${item.value}`)
    .join(" · ");
  return [
    unit.model_name,
    unit.brand,
    unit.color,
    unit.capacity,
    identification || unit.internal_serial,
  ]
    .filter(Boolean)
    .join(" · ");
}

function isReturnReason(value: string): value is ReturnReason {
  return returnReasons.includes(value as ReturnReason);
}

function badgeStyle(kind: "primary" | "secondary"): CSSProperties {
  const color =
    kind === "primary"
      ? "var(--workspace-primary, var(--brand-navy))"
      : "var(--workspace-secondary, var(--brand-orange))";
  return {
    borderColor: `color-mix(in srgb, ${color} 38%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
    color,
  };
}

function HelpTip({ content, label }: { content: string; label: string }) {
  return (
    <Tooltip content={content} side="top">
      <button
        aria-label={label}
        className="inline-flex size-5 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange dark:hover:text-slate-200"
        type="button"
      >
        <CircleHelp className="size-3.5" />
      </button>
    </Tooltip>
  );
}

function ReturnsWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceReturns");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();

  const [lookupDate, setLookupDate] = useState(todayLocal());
  const [lookupReceipt, setLookupReceipt] = useState("");
  const [lastLookup, setLastLookup] = useState<ReturnLookupFilters | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<SaleReturnSummary[]>([]);
  const [availability, setAvailability] = useState<SaleAvailabilityProduct[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [savedReturn, setSavedReturn] = useState<SaleReturnSummary | null>(null);
  const [lines, setLines] = useState<Record<string, ReturnLineDraft>>({});
  const [resolution, setResolution] = useState<ReturnResolution>("refund");
  const [reason, setReason] = useState<ReturnReason>("damaged");
  const [returnedAt, setReturnedAt] = useState(nowLocal());
  const [refundAmount, setRefundAmount] = useState("");

  const [replacementSource, setReplacementSource] =
    useState<ReturnReplacementSource>("stock");
  const [replacementProductId, setReplacementProductId] = useState("");
  const [replacementUnitId, setReplacementUnitId] = useState("");
  const [replacementQuantity, setReplacementQuantity] = useState("1");
  const [replacementAcquisitionSource, setReplacementAcquisitionSource] =
    useState("");
  const [replacementItemName, setReplacementItemName] = useState("");
  const [replacementBrand, setReplacementBrand] = useState("");
  const [replacementModel, setReplacementModel] = useState("");
  const [replacementColor, setReplacementColor] = useState("");
  const [replacementCapacity, setReplacementCapacity] = useState("");
  const [replacementIdentifierKind, setReplacementIdentifierKind] =
    useState<ReplacementIdentifierKind>("");
  const [replacementIdentifierValue, setReplacementIdentifierValue] =
    useState("");
  const [replacementUnitCost, setReplacementUnitCost] = useState("");

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  const loadContext = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      try {
        const [returnResponse, availabilityResponse] = await Promise.all([
          getReturnsWorkspace(businessId, accessToken, {}, signal),
          getSalesAvailability(businessId, accessToken, signal),
        ]);
        setReturns(returnResponse.data?.returns ?? []);
        setAvailability(availabilityResponse.data?.products ?? []);
      } catch (error) {
        if (!isRequestCancelled(error)) {
          notify({
            message: error instanceof Error ? error.message : t("loadError"),
            tone: "error",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [accessToken, businessId, notify, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => {
      void loadContext(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(task);
      controller.abort();
    };
  }, [loadContext]);

  const searchSales = useCallback(
    async (filters: ReturnLookupFilters, signal?: AbortSignal) => {
      if (!accessToken) return;
      const normalized: ReturnLookupFilters = {
        ...filters,
        ...(filters.receiptNumber?.trim()
          ? { receiptNumber: filters.receiptNumber.trim() }
          : {}),
      };
      if (
        !normalized.soldFrom &&
        !normalized.soldBefore &&
        !normalized.receiptNumber
      ) {
        return;
      }

      setSearching(true);
      setSelectedSale(null);
      setLines({});
      try {
        const response = await getReturnsWorkspace(
          businessId,
          accessToken,
          normalized,
          signal,
        );
        setSales(response.data?.sales ?? []);
        setReturns(response.data?.returns ?? []);
        setLastLookup(normalized);
        setSearched(true);
      } catch (error) {
        if (!isRequestCancelled(error)) {
          notify({
            message: error instanceof Error ? error.message : t("searchError"),
            tone: "error",
          });
        }
      } finally {
        setSearching(false);
      }
    },
    [accessToken, businessId, notify, t],
  );

  const selectedReplacementProduct = useMemo(
    () => availability.find((product) => product.id === replacementProductId),
    [availability, replacementProductId],
  );

  const selectedItems = useMemo(() => {
    if (!selectedSale) return [];
    return selectedSale.items.filter(
      (item) => Number(lines[item.id]?.quantity || 0) > 0,
    );
  }, [lines, selectedSale]);

  const refundableValue = useMemo(
    () =>
      selectedItems.reduce(
        (total, item) =>
          total + Number(lines[item.id]?.quantity || 0) * Number(item.unit_price),
        0,
      ),
    [lines, selectedItems],
  );

  const refundRetained = Math.max(
    0,
    refundableValue - Number(refundAmount || 0),
  );

  const chooseSale = (sale: Sale) => {
    setSavedReturn(null);
    setSelectedSale(sale);
    setRefundAmount("");
    setLines(
      Object.fromEntries(
        sale.items.map((item) => [
          item.id,
          {
            quantity: "",
            condition: item.product ? "sellable" : "damaged",
          } satisfies ReturnLineDraft,
        ]),
      ),
    );
  };

  const updateLine = (itemId: string, change: Partial<ReturnLineDraft>) => {
    setLines((current) => ({
      ...current,
      [itemId]: {
        condition: current[itemId]?.condition ?? "sellable",
        quantity: current[itemId]?.quantity ?? "",
        ...change,
      },
    }));
  };

  const resetReplacement = () => {
    setReplacementSource("stock");
    setReplacementProductId("");
    setReplacementUnitId("");
    setReplacementQuantity("1");
    setReplacementAcquisitionSource("");
    setReplacementItemName("");
    setReplacementBrand("");
    setReplacementModel("");
    setReplacementColor("");
    setReplacementCapacity("");
    setReplacementIdentifierKind("");
    setReplacementIdentifierValue("");
    setReplacementUnitCost("");
  };

  const refundValid = () => {
    if (resolution !== "refund") return true;
    if (refundAmount === "") return false;
    const amount = Number(refundAmount);
    return Number.isFinite(amount) && amount >= 0 && amount <= refundableValue;
  };

  const replacementValid = () => {
    if (resolution !== "replacement") return true;
    if (replacementSource === "independent") {
      const identifierComplete =
        (!replacementIdentifierKind && !replacementIdentifierValue.trim()) ||
        Boolean(replacementIdentifierKind && replacementIdentifierValue.trim());
      const identifierQuantityValid =
        !replacementIdentifierValue.trim() || replacementQuantity === "1";
      return Boolean(
        replacementAcquisitionSource.trim() &&
          replacementItemName.trim() &&
          replacementUnitCost !== "" &&
          Number(replacementQuantity) > 0 &&
          identifierComplete &&
          identifierQuantityValid,
      );
    }
    if (!selectedReplacementProduct || Number(replacementQuantity) <= 0) return false;
    if (
      isWholeQuantityUnit(selectedReplacementProduct.unit) &&
      !Number.isInteger(Number(replacementQuantity))
    ) {
      return false;
    }
    if (selectedReplacementProduct.tracking_mode === "individual") {
      return Boolean(replacementUnitId);
    }
    return Number(replacementQuantity) <= Number(selectedReplacementProduct.current_quantity);
  };

  const independentReplacementDetails = () =>
    Object.fromEntries(
      [
        ["brand", replacementBrand.trim()],
        ["model", replacementModel.trim()],
        ["color", replacementColor.trim()],
        ["capacity", replacementCapacity.trim()],
        ["identifier_kind", replacementIdentifierKind],
        ["identifier_value", replacementIdentifierValue.trim()],
      ].filter(([, value]) => Boolean(value)),
    );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !selectedSale) return;

    const items = selectedItems.map((item) => ({
      sale_item_id: item.id,
      quantity: lines[item.id].quantity,
      condition: lines[item.id].condition,
    }));
    if (!items.length) {
      notify({ message: t("chooseItemError"), tone: "error" });
      return;
    }
    if (!refundValid()) {
      notify({ message: t("refundValidation"), tone: "error" });
      return;
    }
    if (!replacementValid()) {
      notify({ message: t("replacementValidation"), tone: "error" });
      return;
    }

    const replacement =
      resolution !== "replacement"
        ? undefined
        : replacementSource === "stock"
          ? {
              source: "stock" as const,
              product_id: replacementProductId,
              ...(replacementUnitId
                ? { tracked_unit_id: replacementUnitId }
                : {}),
              quantity:
                selectedReplacementProduct?.tracking_mode === "individual"
                  ? "1"
                  : replacementQuantity,
            }
          : {
              source: "independent" as const,
              acquisition_source: replacementAcquisitionSource.trim(),
              item_name: replacementItemName.trim(),
              item_details: independentReplacementDetails(),
              quantity: replacementQuantity,
              acquisition_unit_cost: replacementUnitCost,
            };

    setBusy(true);
    try {
      const response = await createReturn(businessId, accessToken, {
        sale_id: selectedSale.id,
        resolution,
        reason,
        ...(resolution === "refund" ? { refund_amount: refundAmount } : {}),
        returned_at: new Date(returnedAt).toISOString(),
        items,
        ...(replacement ? { replacement } : {}),
      });
      const recorded = response.data ?? null;
      setSavedReturn(recorded);
      notify({ message: t("success"), tone: "success" });
      setSelectedSale(null);
      setLines({});
      setReason("damaged");
      setResolution("refund");
      setRefundAmount("");
      setReturnedAt(nowLocal());
      resetReplacement();
      await Promise.all([
        searchSales(lastLookup ?? periodForDate(lookupDate)),
        loadContext(),
      ]);
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : t("saveError"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
            {t("eyebrow")}
          </p>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white">
            {t("title")}
          </h1>
        </header>

        {savedReturn ? <ReturnReceipt record={savedReturn} /> : null}

        <section className={`${panel} space-y-4`}>
          <div className="flex items-center gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                {t("step1")}
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                {t("findReceiptTitle")}
              </h2>
            </div>
            <HelpTip
              content={t("tooltips.receiptResult")}
              label={t("tooltips.receiptResult")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void searchSales(periodForDate(lookupDate));
              }}
            >
              <label className={field}>
                <span className="flex items-center gap-1">
                  {t("saleDate")}
                  <HelpTip
                    content={t("tooltips.dateSearch")}
                    label={t("tooltips.dateSearch")}
                  />
                </span>
                <Input
                  onChange={(event) => setLookupDate(event.target.value)}
                  required
                  type="date"
                  value={lookupDate}
                />
              </label>
              <Button disabled={!accessToken || searching} type="submit">
                {searching ? t("searching") : t("findByDate")}
              </Button>
            </form>

            <div className="hidden pb-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-400 md:block">
              {t("or")}
            </div>

            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void searchSales({ receiptNumber: lookupReceipt });
              }}
            >
              <label className={field}>
                <span className="flex items-center gap-1">
                  {t("receiptNumber")}
                  <HelpTip
                    content={t("tooltips.receiptSearch")}
                    label={t("tooltips.receiptSearch")}
                  />
                </span>
                <Input
                  onChange={(event) => setLookupReceipt(event.target.value)}
                  placeholder={t("receiptPlaceholder")}
                  value={lookupReceipt}
                />
              </label>
              <Button
                disabled={!accessToken || searching || !lookupReceipt.trim()}
                type="submit"
                variant="outline"
              >
                {searching ? t("searching") : t("findByReceipt")}
              </Button>
            </form>
          </div>

          {searched ? (
            sales.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {sales.map((sale) => {
                  const returnable = sale.items.filter(
                    (item) => remainingQuantity(item) > 0,
                  );
                  const disabled = returnable.length === 0;
                  const selected = selectedSale?.id === sale.id;
                  return (
                    <button
                      className={[
                        "rounded-xl border p-4 text-left transition",
                        selected
                          ? "border-brand-orange bg-brand-orange/5"
                          : "border-slate-200 hover:border-brand-orange/50 dark:border-slate-800",
                        disabled ? "cursor-not-allowed opacity-55" : "",
                      ].join(" ")}
                      disabled={disabled}
                      key={sale.id}
                      onClick={() => chooseSale(sale)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-950 dark:text-white">
                            {sale.receipt_number}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(sale.sold_at).toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          {sale.transaction_type === "trade_in"
                            ? t("tradeIn")
                            : t("normalSale")}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <p>
                          <span className="font-semibold">{t("itemsOnReceipt")}:</span>{" "}
                          {saleObjectNames(sale)}
                        </p>
                        <p>
                          <span className="font-semibold">{t("buyer")}:</span>{" "}
                          {sale.customer_name || t("walkInCustomer")}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold"
                          style={badgeStyle("primary")}
                        >
                          {t("itemsCount", { count: sale.items.length })}
                        </span>
                        <span
                          className="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold"
                          style={badgeStyle("secondary")}
                        >
                          {disabled
                            ? t("fullyReturned")
                            : t("returnableCount", { count: returnable.length })}
                        </span>
                        <span className="ml-auto text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {money(sale.total)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {t("noSalesFound")}
              </div>
            )
          ) : null}
        </section>

        {selectedSale ? (
          <form className={`${panel} space-y-5`} onSubmit={onSubmit}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                {t("step2")}
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                {t("selectItemsTitle", { receipt: selectedSale.receipt_number })}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t("selectItemsHelp")}
              </p>
            </div>

            <div className="space-y-3">
              {selectedSale.items.map((item) => {
                const remaining = remainingQuantity(item);
                const draft = lines[item.id];
                const independent = !item.product;
                const wholeQuantity = isWholeQuantityUnit(item.product_unit);
                return (
                  <div
                    className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1.4fr_.55fr_.65fr] md:items-end dark:border-slate-800"
                    key={item.id}
                  >
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {item.product_name || item.item_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.product_sku ||
                          item.tracked_unit_reference ||
                          t("independentItem")}
                      </p>
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        {t("soldAndRemaining", {
                          sold: item.quantity,
                          returned: item.returned_quantity,
                          remaining: String(remaining),
                        })}
                      </p>
                      {independent ? (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                          {t("independentStockHelp")}
                        </p>
                      ) : null}
                    </div>
                    <label className={field}>
                      <span className="flex items-center gap-1">
                        {t("returnQuantity")}
                        <HelpTip
                          content={t("tooltips.quantity")}
                          label={t("tooltips.quantity")}
                        />
                      </span>
                      <Input
                        disabled={remaining <= 0}
                        inputMode={quantityInputMode(item.product_unit)}
                        max={remaining}
                        min={wholeQuantity ? "1" : "0.001"}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (acceptsQuantityInput(value, item.product_unit)) {
                            updateLine(item.id, { quantity: value });
                          }
                        }}
                        step={quantityInputStep(item.product_unit)}
                        type="number"
                        value={draft?.quantity ?? ""}
                      />
                    </label>
                    <label className={field}>
                      <span className="flex items-center gap-1">
                        {t("condition")}
                        <HelpTip
                          content={t("tooltips.condition")}
                          label={t("tooltips.condition")}
                        />
                      </span>
                      <Select
                        disabled={remaining <= 0 || independent}
                        onChange={(event) =>
                          updateLine(item.id, {
                            condition: event.target.value as ReturnCondition,
                          })
                        }
                        value={
                          draft?.condition ??
                          (independent ? "damaged" : "sellable")
                        }
                      >
                        {!independent ? (
                          <option value="sellable">{t("sellable")}</option>
                        ) : null}
                        <option value="damaged">{t("notSellable")}</option>
                      </Select>
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className={field}>
                <span className="flex items-center gap-1">
                  {t("resolution")}
                  <HelpTip
                    content={t("tooltips.resolution")}
                    label={t("tooltips.resolution")}
                  />
                </span>
                <Select
                  onChange={(event) => {
                    const next = event.target.value as ReturnResolution;
                    setResolution(next);
                    if (next !== "replacement") resetReplacement();
                    if (next !== "refund") setRefundAmount("");
                  }}
                  value={resolution}
                >
                  <option value="refund">{t("refund")}</option>
                  <option value="replacement">{t("replacement")}</option>
                  <option value="credit">{t("credit")}</option>
                </Select>
              </label>
              <label className={field}>
                <span className="flex items-center gap-1">
                  {t("reason")}
                  <HelpTip
                    content={t("tooltips.reason")}
                    label={t("tooltips.reason")}
                  />
                </span>
                <Select
                  onChange={(event) =>
                    setReason(event.target.value as ReturnReason)
                  }
                  value={reason}
                >
                  {returnReasons.map((value) => (
                    <option key={value} value={value}>
                      {t(`reasonValues.${value}`)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className={field}>
                <span>{t("returnedAt")}</span>
                <Input
                  onChange={(event) => setReturnedAt(event.target.value)}
                  required
                  type="datetime-local"
                  value={returnedAt}
                />
              </label>
            </div>

            {resolution === "refund" ? (
              <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-950 dark:text-white">
                    {t("refundDetails")}
                  </h3>
                  <HelpTip
                    content={t("tooltips.refundAmount")}
                    label={t("tooltips.refundAmount")}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <ReceiptMetric
                    label={t("refundableValue")}
                    value={String(refundableValue)}
                  />
                  <label className={field}>
                    <span>{t("actualRefund")}</span>
                    <Input
                      max={refundableValue}
                      min="0"
                      onChange={(event) => setRefundAmount(event.target.value)}
                      step="0.01"
                      type="number"
                      value={refundAmount}
                    />
                  </label>
                  <ReceiptMetric
                    label={t("refundRetained")}
                    value={String(refundRetained)}
                  />
                </div>
                <Button
                  disabled={refundableValue <= 0}
                  onClick={() => setRefundAmount(refundableValue.toFixed(2))}
                  size="small"
                  type="button"
                  variant="outline"
                >
                  {t("useFullRefund")}
                </Button>
              </section>
            ) : null}

            {resolution === "replacement" ? (
              <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      {t("replacementDetails")}
                    </p>
                    <h3 className="mt-1 font-bold text-slate-950 dark:text-white">
                      {t("replacementSource")}
                    </h3>
                  </div>
                  <HelpTip
                    content={t("tooltips.replacementSource")}
                    label={t("tooltips.replacementSource")}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(["stock", "independent"] as const).map((source) => (
                    <label
                      className={[
                        "cursor-pointer rounded-xl border p-3 text-sm",
                        replacementSource === source
                          ? "border-brand-orange bg-brand-orange/5"
                          : "border-slate-200 dark:border-slate-800",
                      ].join(" ")}
                      key={source}
                    >
                      <input
                        checked={replacementSource === source}
                        className="mr-2"
                        name="replacement-source"
                        onChange={() => {
                          resetReplacement();
                          setReplacementSource(source);
                        }}
                        type="radio"
                      />
                      <strong>{t(`replacementSources.${source}`)}</strong>
                      <p className="mt-1 text-xs text-slate-500">
                        {t(`replacementSourceHelp.${source}`)}
                      </p>
                    </label>
                  ))}
                </div>

                {replacementSource === "stock" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className={field}>
                      <span>{t("replacementSku")}</span>
                      <Select
                        onChange={(event) => {
                          setReplacementProductId(event.target.value);
                          setReplacementUnitId("");
                          setReplacementQuantity("1");
                        }}
                        value={replacementProductId}
                      >
                        <option value="">{t("chooseReplacementSku")}</option>
                        {availability
                          .filter(
                            (product) =>
                              product.is_active !== false &&
                              Number(product.current_quantity) > 0,
                          )
                          .map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} · {product.sku} · {product.current_quantity}{" "}
                              {product.unit}
                            </option>
                          ))}
                      </Select>
                    </label>
                    {selectedReplacementProduct?.tracking_mode === "individual" ? (
                      <label className={field}>
                        <span>{t("replacementUnit")}</span>
                        <Select
                          onChange={(event) =>
                            setReplacementUnitId(event.target.value)
                          }
                          value={replacementUnitId}
                        >
                          <option value="">{t("chooseReplacementUnit")}</option>
                          {selectedReplacementProduct.available_units.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unitLabel(unit)}
                            </option>
                          ))}
                        </Select>
                      </label>
                    ) : (
                      <label className={field}>
                        <span>{t("replacementQuantity")}</span>
                        <Input
                          inputMode={quantityInputMode(selectedReplacementProduct?.unit)}
                          max={selectedReplacementProduct?.current_quantity}
                          min={
                            isWholeQuantityUnit(selectedReplacementProduct?.unit)
                              ? "1"
                              : "0.001"
                          }
                          onChange={(event) => {
                            const value = event.target.value;
                            if (
                              acceptsQuantityInput(
                                value,
                                selectedReplacementProduct?.unit,
                              )
                            ) {
                              setReplacementQuantity(value);
                            }
                          }}
                          step={quantityInputStep(selectedReplacementProduct?.unit)}
                          type="number"
                          value={replacementQuantity}
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <label className={field}>
                      <span className="flex items-center gap-1">
                        {t("replacementAcquisitionSource")}
                        <HelpTip
                          content={t("tooltips.acquisitionSource")}
                          label={t("tooltips.acquisitionSource")}
                        />
                      </span>
                      <Input
                        onChange={(event) =>
                          setReplacementAcquisitionSource(event.target.value)
                        }
                        placeholder={t("replacementAcquisitionPlaceholder")}
                        value={replacementAcquisitionSource}
                      />
                    </label>
                    <label className={field}>
                      <span>{t("replacementItem")}</span>
                      <Input
                        onChange={(event) =>
                          setReplacementItemName(event.target.value)
                        }
                        placeholder={t("replacementItemPlaceholder")}
                        value={replacementItemName}
                      />
                    </label>
                    <label className={field}>
                      <span>{t("replacementBrand")}</span>
                      <Input
                        onChange={(event) => setReplacementBrand(event.target.value)}
                        value={replacementBrand}
                      />
                    </label>
                    <label className={field}>
                      <span>{t("replacementModel")}</span>
                      <Input
                        onChange={(event) => setReplacementModel(event.target.value)}
                        value={replacementModel}
                      />
                    </label>
                    <label className={field}>
                      <span>{t("replacementColor")}</span>
                      <Input
                        onChange={(event) => setReplacementColor(event.target.value)}
                        value={replacementColor}
                      />
                    </label>
                    <label className={field}>
                      <span>{t("replacementCapacity")}</span>
                      <Input
                        onChange={(event) =>
                          setReplacementCapacity(event.target.value)
                        }
                        value={replacementCapacity}
                      />
                    </label>
                    <label className={field}>
                      <span>{t("replacementIdentifierType")}</span>
                      <Select
                        onChange={(event) => {
                          const next = event.target.value as ReplacementIdentifierKind;
                          setReplacementIdentifierKind(next);
                          if (next && Number(replacementQuantity) !== 1) {
                            setReplacementQuantity("1");
                          }
                        }}
                        value={replacementIdentifierKind}
                      >
                        <option value="">{t("chooseIdentifierType")}</option>
                        {identifierKinds.map((kind) => (
                          <option key={kind} value={kind}>
                            {t(`identifierTypes.${kind}`)}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className={field}>
                      <span>{t("replacementIdentifierValue")}</span>
                      <Input
                        onChange={(event) => {
                          setReplacementIdentifierValue(event.target.value);
                          if (event.target.value && Number(replacementQuantity) !== 1) {
                            setReplacementQuantity("1");
                          }
                        }}
                        value={replacementIdentifierValue}
                      />
                    </label>
                    <label className={field}>
                      <span>{t("replacementQuantity")}</span>
                      <Input
                        inputMode={replacementIdentifierValue ? "numeric" : "decimal"}
                        min={replacementIdentifierValue ? "1" : "0.001"}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (!replacementIdentifierValue || /^\d*$/.test(value)) {
                            setReplacementQuantity(value);
                          }
                        }}
                        step={replacementIdentifierValue ? "1" : "0.001"}
                        type="number"
                        value={replacementQuantity}
                      />
                    </label>
                    <label className={field}>
                      <span className="flex items-center gap-1">
                        {t("replacementCost")}
                        <HelpTip
                          content={t("tooltips.replacementCost")}
                          label={t("tooltips.replacementCost")}
                        />
                      </span>
                      <Input
                        min="0"
                        onChange={(event) =>
                          setReplacementUnitCost(event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={replacementUnitCost}
                      />
                    </label>
                  </div>
                )}
              </section>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button disabled={busy || selectedItems.length === 0} type="submit">
                {busy ? t("saving") : t("recordReturn")}
              </Button>
              <Button
                onClick={() => {
                  setSelectedSale(null);
                  setLines({});
                  setRefundAmount("");
                }}
                type="button"
                variant="outline"
              >
                {t("chooseAnotherReceipt")}
              </Button>
            </div>
          </form>
        ) : null}

        <section className={`${panel} space-y-4`}>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              {t("historyTitle")}
            </h2>
            <HelpTip
              content={t("tooltips.historyRelationship")}
              label={t("tooltips.historyRelationship")}
            />
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">{t("loading")}</p>
          ) : returns.length ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {returns.map((record) => {
                const retained = Math.max(
                  0,
                  Number(record.total) - Number(record.refund_amount),
                );
                return (
                  <div
                    className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_.8fr_.8fr] sm:items-center"
                    key={record.id}
                  >
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {record.return_number || record.receipt_number}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t("originalReceipt")}: {record.receipt_number} ·{" "}
                        {isReturnReason(record.reason)
                          ? t(`reasonValues.${record.reason}`)
                          : record.reason}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">
                        {t(`resolutionValues.${record.resolution}`)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(record.returned_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-xs sm:text-right">
                      <p>{t("returnedValue")}: {money(record.total)}</p>
                      {record.resolution === "refund" ? (
                        <>
                          <p>{t("actualRefund")}: {money(record.refund_amount)}</p>
                          <p>{t("refundRetained")}: {money(retained)}</p>
                        </>
                      ) : null}
                      {Number(record.damaged_loss) > 0 ? (
                        <p>{t("damagedLoss")}: {money(record.damaged_loss)}</p>
                      ) : null}
                      {Number(record.replacement_cost) > 0 ? (
                        <p>{t("replacementCost")}: {money(record.replacement_cost)}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("emptyHistory")}</p>
          )}
        </section>
      </div>
    </TooltipProvider>
  );
}

function ReturnReceipt({ record }: { record: SaleReturnSummary }) {
  const t = useTranslations("CommerceReturns");
  const adjustment =
    Number(record.recovered_inventory_cost) -
    Number(record.refund_amount) -
    Number(record.credit_amount) -
    Number(record.replacement_cost);
  const retained = Math.max(
    0,
    Number(record.total) - Number(record.refund_amount),
  );
  const replacementName = record.replacement
    ? record.replacement.product_name || record.replacement.item_name
    : "";
  const replacementDetails = record.replacement
    ? [
        record.replacement.item_details.brand,
        record.replacement.item_details.model,
        record.replacement.item_details.color,
        record.replacement.item_details.capacity,
        record.replacement.item_details.identifier_kind &&
        record.replacement.item_details.identifier_value
          ? `${record.replacement.item_details.identifier_kind}: ${record.replacement.item_details.identifier_value}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <section className={`${panel} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {t("returnReceipt")}
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
            {record.return_number}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("originalReceipt")}: {record.receipt_number}
          </p>
        </div>
        <span
          className="inline-flex rounded-full border px-3 py-1 text-xs font-bold"
          style={badgeStyle("secondary")}
        >
          {t(`resolutionValues.${record.resolution}`)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReceiptMetric label={t("returnedValue")} value={record.total} />
        {record.resolution === "refund" ? (
          <ReceiptMetric label={t("actualRefund")} value={record.refund_amount} />
        ) : null}
        {record.resolution === "refund" ? (
          <ReceiptMetric label={t("refundRetained")} value={String(retained)} />
        ) : null}
        <ReceiptMetric
          label={t("recoveredInventory")}
          value={record.recovered_inventory_cost}
        />
        <ReceiptMetric label={t("damagedLoss")} value={record.damaged_loss} />
        <ReceiptMetric label={t("replacementCost")} value={record.replacement_cost} />
      </div>

      {record.replacement ? (
        <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <p className="font-semibold text-slate-950 dark:text-white">
            {t("replacementGiven")}: {replacementName}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t(`replacementSources.${record.replacement.source}`)} ·{" "}
            {record.replacement.quantity}
            {record.replacement.product_sku
              ? ` · ${record.replacement.product_sku}`
              : ""}
          </p>
          {record.replacement.acquisition_source ? (
            <p className="mt-1 text-xs text-slate-500">
              {t("replacementAcquisitionSource")}: {record.replacement.acquisition_source}
            </p>
          ) : null}
          {replacementDetails ? (
            <p className="mt-1 text-xs text-slate-500">{replacementDetails}</p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        <strong>{t("profitAdjustment")}: {money(adjustment)}</strong>
        <p className="mt-1">{t("profitAdjustmentHelp")}</p>
      </div>
    </section>
  );
}

function ReceiptMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950 dark:text-white">{money(value)}</p>
    </div>
  );
}

export { ReturnsWorkspace };
