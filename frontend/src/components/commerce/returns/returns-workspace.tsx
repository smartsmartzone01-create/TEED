"use client";

import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
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
import { isRequestCancelled } from "@/services/global/api-client";
import type {
  ReturnCondition,
  ReturnReason,
  ReturnResolution,
  SaleReturnSummary,
} from "@/types/commerce/returns";
import type { Sale, SaleItem } from "@/types/commerce/sales";

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

function isReturnReason(value: string): value is ReturnReason {
  return returnReasons.includes(value as ReturnReason);
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

type ReturnLineDraft = {
  condition: ReturnCondition;
  quantity: string;
};

function ReturnsWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceReturns");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [lookupDate, setLookupDate] = useState(todayLocal());
  const [lookupReceipt, setLookupReceipt] = useState("");
  const [lastLookup, setLastLookup] = useState<ReturnLookupFilters | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<SaleReturnSummary[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [lines, setLines] = useState<Record<string, ReturnLineDraft>>({});
  const [resolution, setResolution] = useState<ReturnResolution>("refund");
  const [reason, setReason] = useState<ReturnReason>("damaged");
  const [returnedAt, setReturnedAt] = useState(nowLocal());
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  const loadHistory = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      try {
        const response = await getReturnsWorkspace(
          businessId,
          accessToken,
          {},
          signal,
        );
        setReturns(response.data?.returns ?? []);
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
      void loadHistory(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(task);
      controller.abort();
    };
  }, [loadHistory]);

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

  const chooseSale = (sale: Sale) => {
    setSelectedSale(sale);
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

  const selectedItems = useMemo(() => {
    if (!selectedSale) return [];
    return selectedSale.items.filter(
      (item) => Number(lines[item.id]?.quantity || 0) > 0,
    );
  }, [lines, selectedSale]);

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

    setBusy(true);
    try {
      await createReturn(businessId, accessToken, {
        sale_id: selectedSale.id,
        resolution,
        reason,
        returned_at: new Date(returnedAt).toISOString(),
        items,
      });
      notify({ message: t("success"), tone: "success" });
      setSelectedSale(null);
      setLines({});
      setReason("damaged");
      setResolution("refund");
      setReturnedAt(nowLocal());
      await searchSales(lastLookup ?? periodForDate(lookupDate));
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
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span>{t("itemsCount", { count: sale.items.length })}</span>
                        <span className="text-right">{money(sale.total)}</span>
                        <span>
                          {disabled
                            ? t("fullyReturned")
                            : t("returnableCount", { count: returnable.length })}
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
                        max={remaining}
                        min="0"
                        onChange={(event) =>
                          updateLine(item.id, { quantity: event.target.value })
                        }
                        step="0.001"
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
                  onChange={(event) =>
                    setResolution(event.target.value as ReturnResolution)
                  }
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
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy || selectedItems.length === 0} type="submit">
                {busy ? t("saving") : t("recordReturn")}
              </Button>
              <Button
                onClick={() => {
                  setSelectedSale(null);
                  setLines({});
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
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              {t("historyTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {t("historyHelp")}
            </p>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">{t("loading")}</p>
          ) : returns.length ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {returns.map((record) => (
                <div
                  className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_.7fr_.7fr] sm:items-center"
                  key={record.id}
                >
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">
                      {record.receipt_number}
                    </p>
                    <p className="text-xs text-slate-500">
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
                  <p className="sm:text-right">{money(record.total)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("emptyHistory")}</p>
          )}
        </section>
      </div>
    </TooltipProvider>
  );
}

export { ReturnsWorkspace };
