"use client";

import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { Tooltip } from "@/components/global/primitives/tooltip";
import type { SaleStockTarget } from "@/types/commerce/sales";

const field = "grid gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 sm:text-xs";
const controlClassName =
  "h-9 rounded-md border-slate-300 bg-white text-sm shadow-none dark:border-slate-700 dark:bg-slate-950";

const identifierKinds = [
  "serial",
  "imei",
  "chassis",
  "registration",
  "engine",
  "barcode",
] as const;

type TradeInDraft = {
  incoming_item_name: string;
  brand: string;
  model: string;
  color: string;
  capacity: string;
  condition: string;
  unit: string;
  identifier_kind: string;
  identifier_value: string;
  incoming_value: string;
  cash_top_up: string;
  add_to_stock: boolean;
  stock_product_id: string;
  stock_group_name: string;
};

const emptyTradeInDraft = (): TradeInDraft => ({
  incoming_item_name: "",
  brand: "",
  model: "",
  color: "",
  capacity: "",
  condition: "",
  unit: "piece",
  identifier_kind: "",
  identifier_value: "",
  incoming_value: "",
  cash_top_up: "",
  add_to_stock: false,
  stock_product_id: "",
  stock_group_name: "",
});

function TradeInFields({
  draft,
  outgoingValue,
  stockTargets,
  onChange,
}: {
  draft: TradeInDraft;
  outgoingValue: number;
  stockTargets: SaleStockTarget[];
  onChange: (draft: TradeInDraft) => void;
}) {
  const t = useTranslations("CommerceSales");
  const incoming = Number(draft.incoming_value || 0);
  const topUp = Number(draft.cash_top_up || 0);
  const minimumTopUp = Math.max(0, outgoingValue - incoming);
  const totalConsideration = incoming + topUp;
  const uplift = totalConsideration - outgoingValue;

  return (
    <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/35 p-3 dark:border-slate-800 dark:bg-slate-900/20">
      <div className="flex items-center gap-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t("incomingTradeItem")}
        </h3>
        <Tooltip content={t("incomingTradeItemHelp")} side="top">
          <button
            aria-label={t("incomingTradeItemHelp")}
            className="inline-flex size-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            type="button"
          >
            <CircleHelp className="size-3.5" />
          </button>
        </Tooltip>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className={field}>
          {t("itemName")}
          <Input className={controlClassName} required value={draft.incoming_item_name} onChange={(event) => onChange({ ...draft, incoming_item_name: event.target.value })} />
        </label>
        <label className={field}>
          {t("brand")}
          <Input className={controlClassName} value={draft.brand} onChange={(event) => onChange({ ...draft, brand: event.target.value })} />
        </label>
        <label className={field}>
          {t("model")}
          <Input className={controlClassName} value={draft.model} onChange={(event) => onChange({ ...draft, model: event.target.value })} />
        </label>
        <label className={field}>
          {t("color")}
          <Input className={controlClassName} value={draft.color} onChange={(event) => onChange({ ...draft, color: event.target.value })} />
        </label>
        <label className={field}>
          {t("capacitySize")}
          <Input className={controlClassName} value={draft.capacity} onChange={(event) => onChange({ ...draft, capacity: event.target.value })} />
        </label>
        <label className={field}>
          {t("condition")}
          <Input className={controlClassName} value={draft.condition} onChange={(event) => onChange({ ...draft, condition: event.target.value })} />
        </label>
        <label className={field}>
          {t("unit")}
          <Input className={controlClassName} value={draft.unit} onChange={(event) => onChange({ ...draft, unit: event.target.value })} />
        </label>
        <label className={field}>
          {t("identifierType")}
          <Select className={controlClassName} value={draft.identifier_kind} onChange={(event) => onChange({ ...draft, identifier_kind: event.target.value })}>
            <option value="">{t("identifierType")}</option>
            {identifierKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
          </Select>
        </label>
        <label className={field}>
          {t("identifierValue")}
          <Input className={controlClassName} value={draft.identifier_value} onChange={(event) => onChange({ ...draft, identifier_value: event.target.value })} />
        </label>
        <label className={field}>
          {t("agreedTradeValue")}
          <Input className={controlClassName} min="0" required step="0.01" type="number" value={draft.incoming_value} onChange={(event) => onChange({ ...draft, incoming_value: event.target.value })} />
        </label>
        <label className={field}>
          {t("cashTopUp")}
          <Input className={controlClassName} min="0" required step="0.01" type="number" value={draft.cash_top_up} onChange={(event) => onChange({ ...draft, cash_top_up: event.target.value })} />
        </label>
      </div>

      <div className="grid gap-x-4 gap-y-1 rounded-md bg-slate-100/80 p-2.5 text-xs dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex justify-between gap-3"><span>{t("agreedOutgoingValue")}</span><strong>{outgoingValue.toLocaleString()}</strong></div>
        <div className="flex justify-between gap-3"><span>{t("agreedTradeValue")}</span><strong>{incoming.toLocaleString()}</strong></div>
        <div className="flex justify-between gap-3"><span>{t("minimumTopUp")}</span><strong>{minimumTopUp.toLocaleString()}</strong></div>
        <div className="flex justify-between gap-3"><span>{t("cashTopUp")}</span><strong>{topUp.toLocaleString()}</strong></div>
        <div className="flex justify-between gap-3"><span>{t("totalConsideration")}</span><strong>{totalConsideration.toLocaleString()}</strong></div>
        <div className="flex items-center justify-between gap-3">
          <span>{t("tradeInUplift")}</span>
          <span className="flex items-center gap-1">
            <strong>{uplift.toLocaleString()}</strong>
            <Tooltip content={t("tradeNegotiationHelp")} side="top">
              <button
                aria-label={t("tradeNegotiationHelp")}
                className="inline-flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                type="button"
              >
                <CircleHelp className="size-3" />
              </button>
            </Tooltip>
          </span>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
        <input checked={draft.add_to_stock} type="checkbox" onChange={(event) => onChange({ ...draft, add_to_stock: event.target.checked })} />
        {t("addIncomingToStock")}
      </label>

      {draft.add_to_stock ? (
        <div className="grid gap-2">
          <label className={field}>
            <span className="flex items-center gap-1">
              {t("stockTarget")}
              <Tooltip content={t("tradeStockAutoHelp")} side="top">
                <button
                  aria-label={t("tradeStockAutoHelp")}
                  className="inline-flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                  type="button"
                >
                  <CircleHelp className="size-3" />
                </button>
              </Tooltip>
            </span>
            <Select className={controlClassName} value={draft.stock_product_id} onChange={(event) => onChange({ ...draft, stock_product_id: event.target.value })}>
              <option value="">{t("createNewStockItem")}</option>
              {stockTargets.map((product) => (
                <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>
              ))}
            </Select>
          </label>
        </div>
      ) : null}
    </section>
  );
}

export { TradeInFields, emptyTradeInDraft };
export type { TradeInDraft };
