"use client";

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
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import {
  createReturn,
  getReturnsWorkspace,
  type ReturnLookupPeriod,
} from "@/services/commerce/returns";
import { isRequestCancelled } from "@/services/global/api-client";
import type {
  ReturnCondition,
  ReturnResolution,
  SaleReturnSummary,
} from "@/types/commerce/returns";
import type { Sale, SaleItem } from "@/types/commerce/sales";

const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950";
const field =
  "grid gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300";

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

function periodForDate(value: string): ReturnLookupPeriod {
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

type ReturnLineDraft = {
  condition: ReturnCondition;
  quantity: string;
};

function ReturnsWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceReturns");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [lookupDate, setLookupDate] = useState(todayLocal());
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<SaleReturnSummary[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [lines, setLines] = useState<Record<string, ReturnLineDraft>>({});
  const [resolution, setResolution] = useState<ReturnResolution>("refund");
  const [reason, setReason] = useState("");
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
    void loadHistory(controller.signal);
    return () => controller.abort();
  }, [loadHistory]);

  const searchSales = useCallback(
    async (date: string, signal?: AbortSignal) => {
      if (!accessToken || !date) return;
      setSearching(true);
      setSelectedSale(null);
      setLines({});
      try {
        const response = await getReturnsWorkspace(
          businessId,
          accessToken,
          periodForDate(date),
          signal,
        );
        setSales(response.data?.sales ?? []);
        setReturns(response.data?.returns ?? []);
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
    return selectedSale.items.filter((item) => Number(lines[item.id]?.quantity || 0) > 0);
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
    if (!reason.trim()) {
      notify({ message: t("reasonError"), tone: "error" });
      return;
    }

    setBusy(true);
    try {
      await createReturn(businessId, accessToken, {
        sale_id: selectedSale.id,
        resolution,
        reason: reason.trim(),
        returned_at: new Date(returnedAt).toISOString(),
        items,
      });
      notify({ message: t("success"), tone: "success" });
      setSelectedSale(null);
      setLines({});
      setReason("");
      setResolution("refund");
      setReturnedAt(nowLocal());
      await searchSales(lookupDate);
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
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
          {t("eyebrow")}
        </p>
        <h1 className="text-2xl font-black text-slate-950 dark:text-white">
          {t("title")}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t("description")}
        </p>
      </header>

      <section className={`${panel} space-y-4`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {t("step1")}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
            {t("findReceiptTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t("findReceiptHelp")}
          </p>
        </div>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void searchSales(lookupDate);
          }}
        >
          <label className={`${field} w-full sm:max-w-xs`}>
            <span>{t("saleDate")}</span>
            <Input
              onChange={(event) => setLookupDate(event.target.value)}
              required
              type="date"
              value={lookupDate}
            />
          </label>
          <Button disabled={!accessToken || searching} type="submit">
            {searching ? t("searching") : t("findReceipts")}
          </Button>
        </form>

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
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span>{sale.customer_name || t("walkInCustomer")}</span>
                      <span className="text-right">{money(sale.total)}</span>
                      <span>{t("itemsCount", { count: sale.items.length })}</span>
                      <span className="text-right">
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
              {t("noSalesForDate")}
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
                      {item.product_sku || item.tracked_unit_reference || t("independentItem")}
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
                    <span>{t("returnQuantity")}</span>
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
                    <span>{t("condition")}</span>
                    <Select
                      disabled={remaining <= 0 || independent}
                      onChange={(event) =>
                        updateLine(item.id, {
                          condition: event.target.value as ReturnCondition,
                        })
                      }
                      value={draft?.condition ?? (independent ? "damaged" : "sellable")}
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

          <div className="grid gap-4 md:grid-cols-2">
            <label className={field}>
              <span>{t("resolution")}</span>
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
              <span>{t("returnedAt")}</span>
              <Input
                onChange={(event) => setReturnedAt(event.target.value)}
                required
                type="datetime-local"
                value={returnedAt}
              />
            </label>
          </div>
          <label className={field}>
            <span>{t("reason")}</span>
            <Input
              maxLength={240}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("reasonPlaceholder")}
              required
              value={reason}
            />
          </label>
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
                  <p className="text-xs text-slate-500">{record.reason}</p>
                </div>
                <div>
                  <p className="font-medium">{t(`resolutionValues.${record.resolution}`)}</p>
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
  );
}

export { ReturnsWorkspace };
