"use client";

import { Copy, Printer, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type FormEvent } from "react";

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
} from "@/types/commerce/sales";

const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950";
const field = "grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300";

type SaleMode = "stock" | "independent";
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

function saleSummary(sale: Sale) {
  const lines = sale.items.flatMap((item) => {
    const details = Object.entries(item.item_details ?? {})
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}: ${value}`);
    return [
      item.product_name || item.item_name,
      item.product_sku ? `SKU: ${item.product_sku}` : "",
      item.tracked_unit_reference || "",
      ...details,
      `Quantity: ${item.quantity}`,
      `Selling price: ${money(item.unit_price)}`,
      `Line total: ${money(item.line_total)}`,
    ].filter(Boolean);
  });
  return [
    "SALE SUMMARY",
    sale.receipt_number,
    `Mode: ${sale.sale_mode}`,
    `Market: ${sale.sale_type}`,
    `Date: ${new Date(sale.sold_at).toLocaleString()}`,
    `Customer: ${sale.customer_name || "—"}`,
    `Phone: ${sale.customer_phone || "—"}`,
    `Region: ${sale.customer_region || "—"}`,
    "",
    ...lines,
    "",
    `Payment: ${sale.payment_status}`,
    `Discount: ${money(sale.discount)}`,
    `Total: ${money(sale.total)}`,
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
  doc.write(`<!doctype html><html><head><title>Sale summary</title><style>body{font-family:Arial,sans-serif;padding:32px;white-space:pre-wrap;line-height:1.5;font-size:13px}</style></head><body>${text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</body></html>`);
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

  const [sales, setSales] = useState<Sale[]>([]);
  const [availability, setAvailability] = useState<SaleAvailabilityProduct[]>([]);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [saleMode, setSaleMode] = useState<SaleMode>("stock");
  const [saleType, setSaleType] = useState<"retail" | "wholesale">("retail");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerRegion, setCustomerRegion] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("paid");
  const [soldAt, setSoldAt] = useState(nowLocal());
  const [lines, setLines] = useState<SaleLineDraft[]>([emptyLine()]);
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

  const resetForm = () => {
    setEditing(null);
    setSaleMode("stock");
    setSaleType("retail");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerRegion("");
    setDiscount("0");
    setPaymentStatus("paid");
    setSoldAt(nowLocal());
    setLines([emptyLine()]);
  };

  const beginEdit = (sale: Sale) => {
    if (sale.sale_mode === "trade_in") return;
    setEditing(sale);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const validate = () =>
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
    const body = {
      sale_mode: saleMode,
      sale_type: saleType,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_region: customerRegion.trim(),
      discount,
      payment_status: paymentStatus,
      sold_at: new Date(soldAt).toISOString(),
      items,
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
      await load();
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
    if (!accessToken) return;
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
      <form className={`${panel} grid gap-4`} onSubmit={(event) => void onSubmit(event)}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{editing ? t("editSale") : t("recordSale")}</h2>
          {editing ? (
            <Button type="button" variant="ghost" onClick={resetForm}>
              {t("cancel")}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className={field}>
            {t("saleMode")}
            <Select
              value={saleMode}
              onChange={(event) => {
                setSaleMode(event.target.value as SaleMode);
                setLines([emptyLine()]);
              }}
            >
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
          <label className={field}>
            {t("customerName")}
            <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          </label>
          <label className={field}>
            {t("customerPhone")}
            <Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
          </label>
          <label className={field}>
            {t("customerRegion")}
            <Input value={customerRegion} onChange={(event) => setCustomerRegion(event.target.value)} />
          </label>
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
            return (
              <div className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800" key={index}>
                {saleMode === "stock" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]">
                      <Select required value={line.product_id} onChange={(event) => chooseProduct(index, event.target.value)}>
                        <option value="">{t("chooseProduct")}</option>
                        {availability.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.sku} · {money(item.current_quantity)} {item.unit} {t("available")}
                          </option>
                        ))}
                      </Select>
                      <Input
                        aria-label={t("quantity")}
                        disabled={hasTrackedUnits}
                        min="0.001"
                        required
                        step="0.001"
                        type="number"
                        value={hasTrackedUnits ? "1" : line.quantity}
                        onChange={(event) => updateLine(index, { quantity: event.target.value })}
                      />
                      <Input
                        aria-label={t("sellingPrice")}
                        min="0"
                        placeholder={t("sellingPrice")}
                        required={product?.selling_price == null}
                        step="0.01"
                        type="number"
                        value={line.unit_price}
                        onChange={(event) => updateLine(index, { unit_price: event.target.value })}
                      />
                      <Button disabled={lines.length === 1} type="button" variant="outline" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</Button>
                    </div>
                    {hasTrackedUnits && product ? (
                      <div className="grid gap-3">
                        <label className={field}>
                          {t("chooseAvailableItem")}
                          <Select required value={line.tracked_unit_id} onChange={(event) => updateLine(index, { tracked_unit_id: event.target.value, quantity: "1" })}>
                            <option value="">{t("chooseAvailableItem")}</option>
                            {currentTrackedReference && !product.available_units.some((unit) => unit.id === line.tracked_unit_id) ? (
                              <option value={line.tracked_unit_id}>{currentTrackedReference}</option>
                            ) : null}
                            {product.available_units.map((unit) => (
                              <option key={unit.id} value={unit.id}>{unitLabel(unit)}</option>
                            ))}
                          </Select>
                        </label>
                        {trackedUnit ? (
                          <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
                            {[t("stockReference"), trackedUnit.stock_reference], [t("batch"), trackedUnit.batch_name], [t("group"), trackedUnit.group_name], [t("nameModel"), trackedUnit.model_name], [t("brand"), trackedUnit.brand], [t("color"), trackedUnit.color], [t("capacitySize"), trackedUnit.capacity], [t("internalSerial"), trackedUnit.internal_serial]].map(([label, value]) => value ? <div key={label}><span className="text-slate-500">{label}</span><strong className="block">{value}</strong></div> : null)}
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
                      <Select value={line.identifier_kind} onChange={(event) => updateLine(index, { identifier_kind: event.target.value })}>
                        <option value="">{t("identifierType")}</option>
                        {['serial', 'imei', 'chassis', 'registration', 'engine', 'barcode'].map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                      </Select>
                      <Input placeholder={t("identifierValue")} value={line.identifier_value} onChange={(event) => updateLine(index, { identifier_value: event.target.value })} />
                      <Input min="0.001" step="0.001" type="number" placeholder={t("quantity")} required value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                      <Input min="0" step="0.01" type="number" placeholder={t("buyingCostOptional")} value={line.acquisition_unit_cost} onChange={(event) => updateLine(index, { acquisition_unit_cost: event.target.value })} />
                      <Input min="0" step="0.01" type="number" placeholder={t("sellingPrice")} required value={line.unit_price} onChange={(event) => updateLine(index, { unit_price: event.target.value })} />
                    </div>
                    <div className="flex justify-end"><Button disabled={lines.length === 1} type="button" variant="outline" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{t("remove")}</Button></div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])}>{t("addLine")}</Button>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className={field}>{t("discount")}<Input min="0" step="0.01" type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
          <label className={field}>{t("payment")}<Select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as "paid" | "partial" | "unpaid")}><option value="paid">{t("paid")}</option><option value="partial">{t("partial")}</option><option value="unpaid">{t("unpaid")}</option></Select></label>
          <label className={field}>{t("date")}<Input type="datetime-local" value={soldAt} onChange={(event) => setSoldAt(event.target.value)} /></label>
        </div>

        <Button disabled={busy || !accessToken || !validate()} type="submit">{editing ? t("saveEdit") : t("save")}</Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t("recentSales")}</h2>
        {sales.map((sale) => (
          <article className={panel} key={sale.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-3">
                {sale.items.map((item) => (
                  <div key={item.id}>
                    <strong className="text-base">{item.product_name || item.item_name}</strong>
                    <p className="text-sm text-slate-500">{[item.product_sku, item.tracked_unit_reference, item.quantity !== "1.000" ? `${money(item.quantity)} × ${money(item.unit_price)}` : ""].filter(Boolean).join(" · ")}</p>
                    {Object.keys(item.item_details ?? {}).length ? <p className="mt-1 text-xs text-slate-500">{Object.entries(item.item_details).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p> : null}
                  </div>
                ))}
                <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                  <div><span className="text-xs text-slate-500">{t("receipt")}</span><strong className="block">{sale.receipt_number}</strong></div>
                  <div><span className="text-xs text-slate-500">{t("customer")}</span><strong className="block">{sale.customer_name || "—"}</strong></div>
                  <div><span className="text-xs text-slate-500">{t("customerRegion")}</span><strong className="block">{sale.customer_region || "—"}</strong></div>
                  <div><span className="text-xs text-slate-500">{t("payment")}</span><strong className="block">{sale.payment_status}</strong></div>
                  <div><span className="text-xs text-slate-500">{t("amount")}</span><strong className="block">{money(sale.total)}</strong></div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button aria-label={t("copySummary")} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800" title={t("copySummary")} type="button" onClick={() => void copySale(sale)}><Copy className="size-4" /></button>
                <button aria-label={t("shareSummary")} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800" title={t("shareSummary")} type="button" onClick={() => void shareSale(sale)}><Share2 className="size-4" /></button>
                <button aria-label={t("printSummary")} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800" title={t("printSummary")} type="button" onClick={() => printText(saleSummary(sale))}><Printer className="size-4" /></button>
                <Button size="small" type="button" variant="outline" onClick={() => beginEdit(sale)}>{t("edit")}</Button>
                {permissions.includes("commerce.sales.void") ? <Button size="small" type="button" variant="ghost" onClick={() => void onVoid(sale)}>{t("void")}</Button> : null}
              </div>
            </div>
          </article>
        ))}
        {!sales.length ? <div className={panel}><p className="text-sm text-slate-500">{t("noSales")}</p></div> : null}
      </section>
    </section>
  );
}

export { SalesWorkspace };
