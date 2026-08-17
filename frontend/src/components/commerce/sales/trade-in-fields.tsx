"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import type { SaleStockTarget } from "@/types/commerce/sales";

const field = "grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300";

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
  const balanced = Math.abs(outgoingValue - incoming - topUp) < 0.005;

  return (
    <section className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div>
        <h3 className="font-bold">{t("incomingTradeItem")}</h3>
        <p className="mt-1 text-xs text-slate-500">{t("incomingTradeItemHelp")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={field}>
          {t("itemName")}
          <Input required value={draft.incoming_item_name} onChange={(event) => onChange({ ...draft, incoming_item_name: event.target.value })} />
        </label>
        <label className={field}>
          {t("brand")}
          <Input value={draft.brand} onChange={(event) => onChange({ ...draft, brand: event.target.value })} />
        </label>
        <label className={field}>
          {t("model")}
          <Input value={draft.model} onChange={(event) => onChange({ ...draft, model: event.target.value })} />
        </label>
        <label className={field}>
          {t("color")}
          <Input value={draft.color} onChange={(event) => onChange({ ...draft, color: event.target.value })} />
        </label>
        <label className={field}>
          {t("capacitySize")}
          <Input value={draft.capacity} onChange={(event) => onChange({ ...draft, capacity: event.target.value })} />
        </label>
        <label className={field}>
          {t("condition")}
          <Input value={draft.condition} onChange={(event) => onChange({ ...draft, condition: event.target.value })} />
        </label>
        <label className={field}>
          {t("unit")}
          <Input value={draft.unit} onChange={(event) => onChange({ ...draft, unit: event.target.value })} />
        </label>
        <label className={field}>
          {t("identifierType")}
          <Select value={draft.identifier_kind} onChange={(event) => onChange({ ...draft, identifier_kind: event.target.value })}>
            <option value="">{t("identifierType")}</option>
            {identifierKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
          </Select>
        </label>
        <label className={field}>
          {t("identifierValue")}
          <Input value={draft.identifier_value} onChange={(event) => onChange({ ...draft, identifier_value: event.target.value })} />
        </label>
        <label className={field}>
          {t("agreedTradeValue")}
          <Input min="0" required step="0.01" type="number" value={draft.incoming_value} onChange={(event) => onChange({ ...draft, incoming_value: event.target.value })} />
        </label>
        <label className={field}>
          {t("cashTopUp")}
          <Input min="0" required step="0.01" type="number" value={draft.cash_top_up} onChange={(event) => onChange({ ...draft, cash_top_up: event.target.value })} />
        </label>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
        <div className="flex justify-between gap-3"><span>{t("agreedOutgoingValue")}</span><strong>{outgoingValue.toLocaleString()}</strong></div>
        <div className="mt-1 flex justify-between gap-3"><span>{t("agreedTradeValue")}</span><strong>- {incoming.toLocaleString()}</strong></div>
        <div className="mt-1 flex justify-between gap-3"><span>{t("cashTopUp")}</span><strong>{topUp.toLocaleString()}</strong></div>
        <p className={`mt-2 text-xs ${balanced ? "text-slate-500" : "font-semibold text-red-600"}`}>
          {balanced ? t("tradeBalanced") : t("tradeMustBalance")}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input checked={draft.add_to_stock} type="checkbox" onChange={(event) => onChange({ ...draft, add_to_stock: event.target.checked })} />
        {t("addIncomingToStock")}
      </label>

      {draft.add_to_stock ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={field}>
            {t("stockTarget")}
            <Select value={draft.stock_product_id} onChange={(event) => onChange({ ...draft, stock_product_id: event.target.value })}>
              <option value="">{t("createNewStockItem")}</option>
              {stockTargets.map((product) => (
                <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>
              ))}
            </Select>
          </label>
          <label className={field}>
            {t("stockGroupOptional")}
            <Input value={draft.stock_group_name} onChange={(event) => onChange({ ...draft, stock_group_name: event.target.value })} />
          </label>
        </div>
      ) : null}
    </section>
  );
}

export { TradeInFields, emptyTradeInDraft };
export type { TradeInDraft };
