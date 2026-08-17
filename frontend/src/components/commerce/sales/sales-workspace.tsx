"use client";

import { Copy, Printer, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import {
  TradeInFields,
  emptyTradeInDraft,
  type TradeInDraft,
} from "@/components/commerce/sales/trade-in-fields";
import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import {
  createSale,
  getSales,
  getSalesAvailability,
  updateSale,
  voidSale,
} from "@/services/commerce/sales";
import { isRequestCancelled } from "@/services/global/api-client";
import type {
  Sale,
  SaleAvailabilityProduct,
  SaleAvailabilityUnit,
  SaleItem,
  SaleStockTarget,
} from "@/types/commerce/sales";

const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950";
const field = "grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300";

type SaleMode = "stock" | "independent";
type TransactionType = "normal" | "trade_in";
type SaleLineDraft = {
  product_id: string;
  tracked_unit_id: string;
  item_name: string;
  brand: string;
  model: string;
  color: string;
  capacity: string;
  identifier_kind: string;
  identifier_value: string;
  acquisition_unit_cost: string;
  quantity: string;
  unit_price: string;
};

const emptyLine = (): SaleLineDraft => ({
  product_id: "",
  tracked_unit_id: "",
  item_name: "",
  brand: "",
  model: "",
  color: "",
  capacity: "",
  identifier_kind: "",
  identifier_value: "",
  acquisition_unit_cost: "",
  quantity: "1",
  unit_price: "",
});

const nowLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const money = (value: string | number | null | undefined) => {
  if (value == null || value === "") return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(parsed)
    : String(value);
};

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

function itemDetailRows(item: SaleItem) {
  if (item.tracked_unit_details) {
    const unit = item.tracked_unit_details;
    return [
      ["Name / model", unit.model_name],
      ["Brand", unit.brand],
      ["Color", unit.color],
      ["Capacity / size", unit.capacity],
      ["Condition", unit.condition],
      ...unit.identifiers.map((identifier) => [identifier.kind, identifier.value]),
      ...(unit.identifiers.length ? [] : [["Internal serial", unit.internal_serial]]),
    ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;
  }
  return Object.entries(item.item_details ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => [key.replaceAll("_", " "), value]);
}

function saleSummary(sale: Sale) {
  const lines = sale.items.flatMap((item, index) => {
    const details = itemDetailRows(item).map(([label, value]) => `${label}: ${value}`);
    return [
      `Item ${index + 1}: ${item.product_name || item.item_name}`,
      item.product_sku ? `SKU: ${item.product_sku}` : "",
      ...details,
      `Quantity: ${item.quantity}`,
      `Selling price: ${money(item.unit_price)}`,
      `Line total: ${money(item.line_total)}`,
      "",
    ].filter((value) => value !== "");
  });
  const trade = sale.trade_in
    ? [
        "TRADE-IN",
        `Received item: ${sale.trade_in.incoming_item_name}`,
        `Trade-in value: ${money(sale.trade_in.incoming_value)}`,
        `Cash top-up: ${money(sale.trade_in.cash_top_up)}`,
        sale.trade_in.stock_receipt_reference
          ? `Added to stock: ${sale.trade_in.stock_receipt_reference}`
          : "",
        "",
      ].filter(Boolean)
    : [];
  return [
    "SALE SUMMARY",
    `Receipt: ${sale.receipt_number}`,
    `Transaction: ${sale.transaction_type}`,
    `Source: ${sale.sale_mode}`,
    `Market: ${sale.sale_type}`,
    `Date: ${new Date(sale.sold_at).toLocaleString()}`,
    `Customer: ${sale.customer_name || "—"}`,
    `Phone: ${sale.customer_phone || "—"}`,
    `Region: ${sale.customer_region || "—"}`,
    "",
    ...lines,
    ...trade,
    `Payment: ${sale.payment_status}`,
    `Discount: ${money(sale.discount)}`,
    `Total sale value: ${money(sale.total)}`,
  ].join("\n");
}

function printText(text: string) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(`<!doctype html><html><head><title>Sale summary</title><style>body{font-family:Arial,sans-serif;padding:32px;white-space:pre-wrap;line-height:1.55;font-size:13px}</style></head><body>${text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</body></html>`);
  doc.close();
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 1000);
  }, 150);
}

function SalesWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceSales");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const { businesses } = useWorkspace();
  const permissions =
    businesses.find((business) => business.id === businessId)?.membership.permissions ?? [];

  const recorderRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLElement>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [availability, setAvailability] = useState<SaleAvailabilityProduct[]>([]);
  const [stockTargets, setStockTargets] = useState<SaleStockTarget[]>([]);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>("normal");
  const [saleMode, setSaleMode] = useState<SaleMode>("stock");
  const [saleType, setSaleType] = useState<"retail" | "wholesale">("retail");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerRegion, setCustomerRegion] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("paid");
  const [soldAt, setSoldAt] = useState(nowLocal());
  const [lines, setLines] = useState<SaleLineDraft[]>([emptyLine()]);
  const [tradeIn, setTradeIn] = useState<TradeInDraft>(emptyTradeInDraft());
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      try {
        const [salesResponse, availabilityResponse] = await Promise.all([
          getSales(businessId, accessToken, signal),
          getSalesAvailability(businessId, accessToken, signal),
        ]);
        setSales(salesResponse.data?.sales ?? []);
        setAvailability(availabilityResponse.data?.products ?? []);
        setStockTargets(availabilityResponse.data?.stock_targets ?? []);
      } catch (reason) {
        if (!isRequestCancelled(reason)) {
          notify({
            message: reason instanceof Error ? reason.message : t("loadError"),
            tone: "error",
          });
        }
      }
    },
    [accessToken, businessId, notify, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const productFor = (line: SaleLineDraft) =>
    availability.find((product) => product.id === line.product_id);
  const trackedUnitFor = (line: SaleLineDraft) =>
    productFor(line)?.available_units.find((unit) => unit.id === line.tracked_unit_id);
  const outgoingValue = Math.max(
    0,
    lines.reduce(
      (total, line) => total + Number(line.quantity || 0) * Number(line.unit_price || 0),
      0,
    ) - Number(discount || 0),
  );

  const resetForm = () => {
    setEditing(null);
    setTransactionType("normal");
    setSaleMode("stock");
    setSaleType("retail");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerRegion("");
    setDiscount("0");
    setPaymentStatus("paid");
    setSoldAt(nowLocal());
    setLines([emptyLine()]);
    setTradeIn(emptyTradeInDraft());
  };

  const openRecorder = () => {
    setShowRecorder(true);
    requestAnimationFrame(() =>
      recorderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const closeRecorder = () => {
    resetForm();
    setShowRecorder(false);
  };

  const viewHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const beginEdit = (sale: Sale) => {
    if (sale.sale_mode === "trade_in" || sale.trade_in?.stock_receipt) return;
    setEditing(sale);
    setTransactionType(sale.transaction_type);
    setSaleMode(sale.sale_mode);
    setSaleType(sale.sale_type);
    setCustomerName(sale.customer_name);
    setCustomerPhone(sale.customer_phone);
    setCustomerRegion(sale.customer_region);
    setDiscount(sale.discount);
    setPaymentStatus(sale.payment_status);
    setSoldAt(sale.sold_at.slice(0, 16));
    setLines(
      sale.items.map((item) => ({
        ...emptyLine(),
        product_id: item.product,
        tracked_unit_id: item.tracked_unit ?? "",
        item_name: item.item_name || item.product_name,
        brand: item.item_details?.brand ?? "",
        model: item.item_details?.model ?? "",
        color: item.item_details?.color ?? "",
        capacity: item.item_details?.capacity ?? "",
        identifier_kind: item.item_details?.identifier_kind ?? "",
        identifier_value: item.item_details?.identifier_value ?? "",
        acquisition_unit_cost: item.acquisition_unit_cost ?? "",
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    );
    if (sale.trade_in) {
      const details = sale.trade_in.incoming_item_details;
      setTradeIn({
        incoming_item_name: sale.trade_in.incoming_item_name,
        brand: details.brand ?? "",
        model: details.model ?? "",
        color: details.color ?? "",
        capacity: details.capacity ?? "",
        condition: details.condition ?? "",
        unit: details.unit ?? "piece",
        identifier_kind: details.identifier_kind ?? "",
        identifier_value: details.identifier_value ?? "",
        incoming_value: sale.trade_in.incoming_value,
        cash_top_up: sale.trade_in.cash_top_up,
        add_to_stock: sale.trade_in.add_to_stock,
        stock_product_id: sale.trade_in.stock_product ?? "",
        stock_group_name: sale.trade_in.stock_group_name,
      });
    } else {
      setTradeIn(emptyTradeInDraft());
    }
    openRecorder();
  };

  const updateLine = (index: number, change: Partial<SaleLineDraft>) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...change } : line,
      ),
    );
  };

  const chooseProduct = (index: number, productId: string) => {
    const product = availability.find((item) => item.id === productId);
    updateLine(index, {
      product_id: productId,
      tracked_unit_id: "",
      quantity: "1",
      unit_price: product?.selling_price ?? "",
    });
  };

  const validate = () => {
    const outgoingValid =
      lines.length > 0 &&
      lines.every((line) => {
        if (saleMode === "independent") {
          return Boolean(line.item_name.trim() && line.unit_price);
        }
        const product = productFor(line);
        if (!product) return false;
        if (product.available_units.length > 0 && !line.tracked_unit_id) return false;
        return Boolean(line.unit_price || product.selling_price != null);
      });
    if (!outgoingValid || transactionType === "normal") return outgoingValid;
    return Boolean(
      tradeIn.incoming_item_name.trim() &&
        tradeIn.incoming_value !== "" &&
        tradeIn.cash_top_up !== "",
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !validate()) return;
    setBusy(true);
    const items = lines.map((line) => {
      if (saleMode === "independent") {
        const itemDetails = {
          brand: line.brand.trim(),
          model: line.model.trim(),
          color: line.color.trim(),
          capacity: line.capacity.trim(),
          identifier_kind: line.identifier_kind.trim(),
          identifier_value: line.identifier_value.trim(),
        };
        return {
          source: "manual",
          item_name: line.item_name.trim(),
          item_details: Object.fromEntries(
            Object.entries(itemDetails).filter(([, value]) => Boolean(value)),
          ),
          ...(line.acquisition_unit_cost
            ? { acquisition_unit_cost: line.acquisition_unit_cost }
            : {}),
          quantity: line.quantity,
          unit_price: line.unit_price,
        };
      }
      return {
        source: "catalog",
        product_id: line.product_id,
        ...(line.tracked_unit_id ? { tracked_unit_id: line.tracked_unit_id } : {}),
        quantity: line.tracked_unit_id ? "1" : line.quantity,
        ...(line.unit_price ? { unit_price: line.unit_price } : {}),
      };
    });
    const incomingDetails = {
      brand: tradeIn.brand.trim(),
      model: tradeIn.model.trim(),
      color: tradeIn.color.trim(),
      capacity: tradeIn.capacity.trim(),
      condition: tradeIn.condition.trim(),
      unit: tradeIn.unit.trim() || "piece",
      identifier_kind: tradeIn.identifier_kind.trim(),
      identifier_value: tradeIn.identifier_value.trim(),
    };
    const body = {
      transaction_type: transactionType,
      sale_mode: saleMode,
      sale_type: saleType,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_region: customerRegion.trim(),
      discount,
      payment_status: paymentStatus,
      sold_at: new Date(soldAt).toISOString(),
      items,
      ...(transactionType === "trade_in"
        ? {
            trade_in: {
              incoming_item_name: tradeIn.incoming_item_name.trim(),
              incoming_item_details: Object.fromEntries(
                Object.entries(incomingDetails).filter(([, value]) => Boolean(value)),
              ),
              incoming_value: tradeIn.incoming_value,
              cash_top_up: tradeIn.cash_top_up,
              add_to_stock: tradeIn.add_to_stock,
              ...(tradeIn.stock_product_id
                ? { stock_product_id: tradeIn.stock_product_id }
                : {}),
              stock_group_name: tradeIn.stock_group_name.trim(),
            },
          }
        : {}),
    };

    try {
      if (editing) {
        await updateSale(businessId, editing.id, accessToken, body);
        notify({ message: t("saleEdited"), tone: "success" });
      } else {
        await createSale(businessId, accessToken, body);
        notify({ message: t("saleSaved"), tone: "success" });
      }
      resetForm();
      setShowRecorder(false);
      await load();
      requestAnimationFrame(() =>
        historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("saveError"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const onVoid = async (sale: Sale) => {
    if (!accessToken || sale.trade_in?.stock_receipt) return;
    const reason = window.prompt(t("voidReason"));
    if (!reason) return;
    try {
      await voidSale(businessId, sale.id, accessToken, reason);
      notify({ message: t("saleVoided"), tone: "success" });
      await load();
    } catch (reasonValue) {
      notify({
        message: reasonValue instanceof Error ? reasonValue.message : t("saveError"),
        tone: "error",
      });
    }
  };

  const copySale = async (sale: Sale) => {
    await navigator.clipboard.writeText(saleSummary(sale));
    notify({ message: t("copied"), tone: "success" });
  };

  const shareSale = async (sale: Sale) => {
    const text = saleSummary(sale);
    if (navigator.share) {
      await navigator.share({ title: sale.receipt_number, text });
    } else {
      await navigator.clipboard.writeText(text);
      notify({ message: t("copied"), tone: "success" });
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{t("description")}</p>
      </header>

      <section className={`${panel} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <h2 className="font-bold text-slate-950 dark:text-white">{t("salesActionsTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("salesActionsHelp")}</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Button type="button" variant="outline" onClick={viewHistory}>{t("viewSaleHistory")}</Button>
          {showRecorder ? (
            <Button type="button" variant="outline" onClick={closeRecorder}>{t("closeRecorder")}</Button>
          ) : (
            <Button type="button" onClick={openRecorder}>{t("recordSale")}</Button>
          )}
        </div>
      </section>

      {showRecorder ? (
        <div ref={recorderRef}>
          <form className={`${panel} grid gap-4 scroll-mt-5`} onSubmit={(event) => void onSubmit(event)}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{editing ? t("editSale") : t("recordSale")}</h2>
              <Button type="button" variant="ghost" onClick={closeRecorder}>{t("cancel")}</Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <label className={field}>
                {t("transactionType")}
                <Select value={transactionType} onChange={(event) => { setTransactionType(event.target.value as TransactionType); setTradeIn(emptyTradeInDraft()); }}>
                  <option value="normal">{t("normalSale")}</option>
                  <option value="trade_in">{t("tradeIn")}</option>
                </Select>
              </label>
              <label className={field}>
                {t("saleSource")}
                <Select value={saleMode} onChange={(event) => { setSaleMode(event.target.value as SaleMode); setLines([emptyLine()]); }}>
                  <option value="stock">{t("fromStock")}</option>
                  <option value="independent">{t("independentSale")}</option>
                </Select>
              </label>
              <label className={field}>
                {t("marketType")}
                <Select value={saleType} onChange={(event) => setSaleType(event.target.value as "retail" | "wholesale")}>
                  <option value="retail">{t("retail")}</option>
                  <option value="wholesale">{t("wholesale")}</option>
                </Select>
              </label>
              <label className={field}>{t("customerName")}<Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
              <label className={field}>{t("customerPhone")}<Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></label>
              <label className={field}>{t("customerRegion")}<Input value={customerRegion} onChange={(event) => setCustomerRegion(event.target.value)} /></label>
            </div>

            <div className="grid gap-2">
              <h3 className="font-bold">{t("outgoingItem")}</h3>
              <p className="text-xs text-slate-500">{transactionType === "trade_in" ? t("outgoingTradeHelp") : t("outgoingSaleHelp")}</p>
            </div>

            <div className="grid gap-3">
              {lines.map((line, index) => {
                const product = productFor(line);
                const trackedUnit = trackedUnitFor(line);
                const currentSaleItem = editing?.items[index];
                const currentTrackedReference =
                  currentSaleItem?.tracked_unit === line.tracked_unit_id
                    ? currentSaleItem.tracked_unit_reference
                    : "";
                const hasTrackedUnits = Boolean(
                  product?.available_units.length ||
                    (currentTrackedReference && line.tracked_unit_id),
                );
                const detailRows: Array<[string, string]> = trackedUnit
                  ? [
                      [t("stockReference"), trackedUnit.stock_reference],
                      [t("batch"), trackedUnit.batch_name],
                      [t("group"), trackedUnit.group_name],
                      [t("nameModel"), trackedUnit.model_name],
                      [t("brand"), trackedUnit.brand],
                      [t("color"), trackedUnit.color],
                      [t("capacitySize"), trackedUnit.capacity],
                      [t("internalSerial"), trackedUnit.internal_serial],
                    ]
                  : [];

                return (
                  <div className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800" key={index}>
                    {saleMode === "stock" ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]">
                          <Select required value={line.product_id} onChange={(event) => chooseProduct(index, event.target.value)}>
                            <option value="">{t("chooseProduct")}</option>
                            {availability.map((item) => (
                              <option key={item.id} value={item.id}>{item.name} · {item.sku} · {money(item.current_quantity)} {item.unit} {t("available")}</option>
                            ))}
                          </Select>
                          <Input aria-label={t("quantity")} disabled={hasTrackedUnits} min="0.001" required step="0.001" type="number" value={hasTrackedUnits ? "1" : line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                          <Input aria-label={transactionType === "trade_in" ? t("agreedOutgoingValue") : t("sellingPrice")} min="0" placeholder={transactionType === "trade_in" ? t("agreedOutgoingValue") : t("sellingPrice")} required={transactionType === "trade_in" || product?.selling_price == null} step="0.01" type="number" value={line.unit_price} onChange={(event) => updateLine(index, { unit_price: event.target.value })} />
                          <Button disabled={lines.length === 1} type="button" variant="outline" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</Button>
                        </div>
                        {hasTrackedUnits && product ? (
                          <div className="grid gap-3">
                            <label className={field}>
                              {t("chooseAvailableItem")}
                              <Select required value={line.tracked_unit_id} onChange={(event) => updateLine(index, { tracked_unit_id: event.target.value, quantity: "1" })}>
                                <option value="">{t("chooseAvailableItem")}</option>
                                {currentTrackedReference && !product.available_units.some((unit) => unit.id === line.tracked_unit_id) ? <option value={line.tracked_unit_id}>{currentTrackedReference}</option> : null}
                                {product.available_units.map((unit) => <option key={unit.id} value={unit.id}>{unitLabel(unit)}</option>)}
                              </Select>
                            </label>
                            {trackedUnit ? (
                              <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
                                {detailRows.map(([label, value]) => value ? <div key={label}><span className="text-slate-500">{label}</span><strong className="block">{value}</strong></div> : null)}
                                {trackedUnit.identifiers.map((identifier) => <div key={`${identifier.kind}-${identifier.value}`}><span className="text-slate-500">{identifier.kind}</span><strong className="block">{identifier.value}</strong></div>)}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Input placeholder={t("itemName")} required value={line.item_name} onChange={(event) => updateLine(index, { item_name: event.target.value })} />
                          <Input placeholder={t("brand")} value={line.brand} onChange={(event) => updateLine(index, { brand: event.target.value })} />
                          <Input placeholder={t("model")} value={line.model} onChange={(event) => updateLine(index, { model: event.target.value })} />
                          <Input placeholder={t("color")} value={line.color} onChange={(event) => updateLine(index, { color: event.target.value })} />
                          <Input placeholder={t("capacitySize")} value={line.capacity} onChange={(event) => updateLine(index, { capacity: event.target.value })} />
                          <Select value={line.identifier_kind} onChange={(event) => updateLine(index, { identifier_kind: event.target.value })}><option value="">{t("identifierType")}</option>{["serial", "imei", "chassis", "registration", "engine", "barcode"].map((kind) => <option key={kind} value={kind}>{kind}</option>)}</Select>
                          <Input placeholder={t("identifierValue")} value={line.identifier_value} onChange={(event) => updateLine(index, { identifier_value: event.target.value })} />
                          <Input min="0.001" step="0.001" type="number" placeholder={t("quantity")} required value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                          <Input min="0" step="0.01" type="number" placeholder={t("buyingCostOptional")} value={line.acquisition_unit_cost} onChange={(event) => updateLine(index, { acquisition_unit_cost: event.target.value })} />
                          <Input min="0" step="0.01" type="number" placeholder={transactionType === "trade_in" ? t("agreedOutgoingValue") : t("sellingPrice")} required value={line.unit_price} onChange={(event) => updateLine(index, { unit_price: event.target.value })} />
                        </div>
                        <div className="flex justify-end"><Button disabled={lines.length === 1} type="button" variant="outline" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{t("remove")}</Button></div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])}>{t("addLine")}</Button>

            {transactionType === "trade_in" ? (
              <TradeInFields draft={tradeIn} outgoingValue={outgoingValue} stockTargets={stockTargets} onChange={setTradeIn} />
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <label className={field}>{t("discount")}<Input min="0" step="0.01" type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
              <label className={field}>{t("payment")}<Select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as "paid" | "partial" | "unpaid")}><option value="paid">{t("paid")}</option><option value="partial">{t("partial")}</option><option value="unpaid">{t("unpaid")}</option></Select></label>
              <label className={field}>{t("date")}<Input type="datetime-local" value={soldAt} onChange={(event) => setSoldAt(event.target.value)} /></label>
            </div>
            <Button disabled={busy || !accessToken || !validate()} type="submit">{editing ? t("saveEdit") : t("save")}</Button>
          </form>
        </div>
      ) : null}

      <section className="scroll-mt-5 space-y-3" ref={historyRef}>
        <h2 className="text-xl font-bold">{t("recentSales")}</h2>
        {sales.map((sale, index) => {
          const tradeLocked = Boolean(sale.trade_in?.stock_receipt);
          return (
            <article
              className={panel}
              key={sale.id}
              style={{
                borderInlineStartColor:
                  index % 2 === 0
                    ? "var(--workspace-primary, var(--brand-navy))"
                    : "var(--workspace-secondary, var(--brand-orange))",
                borderInlineStartWidth: 3,
              }}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0 space-y-4">
                  {sale.transaction_type === "trade_in" ? (
                    <span className="inline-flex rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold dark:border-slate-800">{t("tradeIn")}</span>
                  ) : null}
                  <div className="space-y-4">
                    {sale.items.map((item) => {
                      const details = itemDetailRows(item);
                      const exactName = item.tracked_unit_details?.model_name || item.item_details?.model || "";
                      return (
                        <div className="min-w-0" key={item.id}>
                          <strong className="block break-words text-base">{item.product_name || item.item_name}</strong>
                          {exactName && exactName !== item.product_name ? (
                            <span className="mt-0.5 block break-words text-sm font-semibold text-slate-700 dark:text-slate-200">{exactName}</span>
                          ) : null}
                          <p className="mt-1 break-words text-sm text-slate-500">
                            {[item.product_sku, item.quantity !== "1.000" ? `${money(item.quantity)} × ${money(item.unit_price)}` : ""].filter(Boolean).join(" · ")}
                          </p>
                          {details.length ? (
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                              {details.map(([label, value]) => (
                                <span className="break-all" key={`${label}-${value}`}><span className="capitalize">{label}</span>: <strong className="font-semibold text-slate-700 dark:text-slate-200">{value}</strong></span>
                              ))}
                            </div>
                          ) : item.tracked_unit_reference ? (
                            <p className="mt-2 break-all text-xs text-slate-500">{item.tracked_unit_reference}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {sale.trade_in ? (
                    <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900 sm:grid-cols-3">
                      <div><span className="text-xs text-slate-500">{t("incomingTradeItem")}</span><strong className="block break-words">{sale.trade_in.incoming_item_name}</strong></div>
                      <div><span className="text-xs text-slate-500">{t("agreedTradeValue")}</span><strong className="block">{money(sale.trade_in.incoming_value)}</strong></div>
                      <div><span className="text-xs text-slate-500">{t("cashTopUp")}</span><strong className="block">{money(sale.trade_in.cash_top_up)}</strong></div>
                      {sale.trade_in.stock_receipt_reference ? <div className="sm:col-span-3"><span className="text-xs text-slate-500">{t("addedToStock")}</span><strong className="block">{sale.trade_in.stock_receipt_reference}{sale.trade_in.stock_product_sku ? ` · ${sale.trade_in.stock_product_sku}` : ""}</strong></div> : null}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="min-w-0"><span className="text-xs text-slate-500">{t("receipt")}</span><strong className="block break-all">{sale.receipt_number}</strong></div>
                    <div className="min-w-0"><span className="text-xs text-slate-500">{t("customer")}</span><strong className="block break-words">{sale.customer_name || "—"}</strong></div>
                    <div className="min-w-0"><span className="text-xs text-slate-500">{t("customerRegion")}</span><strong className="block break-words">{sale.customer_region || "—"}</strong></div>
                    <div className="min-w-0"><span className="text-xs text-slate-500">{t("payment")}</span><strong className="block break-words">{sale.payment_status}</strong></div>
                    <div className="min-w-0"><span className="text-xs text-slate-500">{t("amount")}</span><strong className="block break-words">{money(sale.total)}</strong></div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 lg:border-t-0 lg:pt-0">
                  <button aria-label={t("copySummary")} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800" title={t("copySummary")} type="button" onClick={() => void copySale(sale)}><Copy className="size-4" /></button>
                  <button aria-label={t("shareSummary")} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800" title={t("shareSummary")} type="button" onClick={() => void shareSale(sale)}><Share2 className="size-4" /></button>
                  <button aria-label={t("printSummary")} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800" title={t("printSummary")} type="button" onClick={() => printText(saleSummary(sale))}><Printer className="size-4" /></button>
                  <Button disabled={tradeLocked} size="small" title={tradeLocked ? t("tradeStockLocked") : undefined} type="button" variant="outline" onClick={() => beginEdit(sale)}>{t("edit")}</Button>
                  {permissions.includes("commerce.sales.void") ? <Button disabled={tradeLocked} size="small" title={tradeLocked ? t("tradeStockLocked") : undefined} type="button" variant="ghost" onClick={() => void onVoid(sale)}>{t("void")}</Button> : null}
                </div>
              </div>
            </article>
          );
        })}
        {!sales.length ? <div className={panel}><p className="text-sm text-slate-500">{t("noSales")}</p></div> : null}
      </section>
    </section>
  );
}

export { SalesWorkspace };
