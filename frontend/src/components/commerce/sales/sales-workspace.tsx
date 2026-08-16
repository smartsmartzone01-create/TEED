"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

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

type SaleLineDraft = {
  source: "catalog" | "manual";
  product_id: string;
  tracked_unit_id: string;
  item_name: string;
  quantity: string;
  unit_price: string;
};

const emptyLine = (): SaleLineDraft => ({
  source: "catalog",
  product_id: "",
  tracked_unit_id: "",
  item_name: "",
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
  const identification = unit.identifiers.map((item) => `${item.kind}: ${item.value}`).join(" · ");
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

  const trackedUnitFor = (line: SaleLineDraft) => {
    const product = productFor(line);
    return product?.available_units.find((unit) => unit.id === line.tracked_unit_id);
  };

  const resetForm = () => {
    setEditing(null);
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
    setEditing(sale);
    setSaleType(sale.sale_type);
    setCustomerName(sale.customer_name);
    setCustomerPhone(sale.customer_phone);
    setCustomerRegion(sale.customer_region);
    setDiscount(sale.discount);
    setPaymentStatus(sale.payment_status);
    setSoldAt(sale.sold_at.slice(0, 16));
    setLines(
      sale.items.map((item) => ({
        source: item.source,
        product_id: item.product ?? "",
        tracked_unit_id: item.tracked_unit ?? "",
        item_name: item.item_name || item.product_name,
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
      quantity: product?.tracking_mode === "individual" ? "1" : "1",
      unit_price: product?.selling_price ?? "",
    });
  };

  const validate = () => {
    for (const line of lines) {
      if (line.source === "manual") {
        if (!line.item_name.trim() || !line.unit_price) return false;
        continue;
      }
      const product = productFor(line);
      if (!product) return false;
      if (product.tracking_mode === "individual" && !line.tracked_unit_id) return false;
      if (!line.unit_price && product.selling_price == null) return false;
    }
    return lines.length > 0;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !validate()) return;
    setBusy(true);
    const items = lines.map((line) => ({
      source: line.source,
      ...(line.source === "manual"
        ? { item_name: line.item_name.trim() }
        : {
            product_id: line.product_id,
            ...(line.tracked_unit_id ? { tracked_unit_id: line.tracked_unit_id } : {}),
          }),
      quantity: line.quantity,
      ...(line.unit_price ? { unit_price: line.unit_price } : {}),
    }));
    const body = {
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

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{t("description")}</p>
      </header>

      <form className={`${panel} grid gap-4`} onSubmit={(event) => void onSubmit(event)}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">{editing ? t("editSale") : t("recordSale")}</h2>
          {editing ? (
            <Button type="button" variant="ghost" onClick={resetForm}>
              {t("cancel")}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={field}>
            {t("saleType")}
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
            const identification = trackedUnit
              ? unitLabel(trackedUnit)
              : currentTrackedReference;
            return (
              <div
                className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900"
                key={index}
              >
                <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_8rem_9rem_auto]">
                  <Select
                    aria-label={t("itemSource")}
                    value={line.source}
                    onChange={(event) =>
                      updateLine(index, {
                        ...emptyLine(),
                        source: event.target.value as "catalog" | "manual",
                      })
                    }
                  >
                    <option value="catalog">{t("teedProduct")}</option>
                    <option value="manual">{t("manualItem")}</option>
                  </Select>

                  {line.source === "manual" ? (
                    <Input
                      aria-label={t("itemName")}
                      placeholder={t("itemName")}
                      required
                      value={line.item_name}
                      onChange={(event) => updateLine(index, { item_name: event.target.value })}
                    />
                  ) : (
                    <Select
                      aria-label={t("chooseProduct")}
                      required
                      value={line.product_id}
                      onChange={(event) => chooseProduct(index, event.target.value)}
                    >
                      <option value="">{t("chooseProduct")}</option>
                      {availability.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.sku} · {money(item.current_quantity)} {item.unit} {t("available")}
                        </option>
                      ))}
                    </Select>
                  )}

                  <Input
                    aria-label={t("quantity")}
                    disabled={product?.tracking_mode === "individual"}
                    min="0.001"
                    required
                    step="0.001"
                    type="number"
                    value={line.quantity}
                    onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  />
                  <Input
                    aria-label={t("sellingPrice")}
                    min="0"
                    placeholder={t("sellingPrice")}
                    required={line.source === "manual" || product?.selling_price == null}
                    step="0.01"
                    type="number"
                    value={line.unit_price}
                    onChange={(event) => updateLine(index, { unit_price: event.target.value })}
                  />
                  <Button
                    aria-label={t("remove")}
                    disabled={lines.length === 1}
                    type="button"
                    variant="outline"
                    onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                  >
                    ×
                  </Button>
                </div>

                {line.source === "manual" ? (
                  <p className="text-xs text-slate-500">{t("manualHelp")}</p>
                ) : product?.tracking_mode === "individual" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={field}>
                      {t("chooseAvailableItem")}
                      <Select
                        required
                        value={line.tracked_unit_id}
                        onChange={(event) => updateLine(index, { tracked_unit_id: event.target.value })}
                      >
                        <option value="">{t("chooseAvailableItem")}</option>
                        {currentTrackedReference &&
                        !product.available_units.some((unit) => unit.id === line.tracked_unit_id) ? (
                          <option value={line.tracked_unit_id}>{currentTrackedReference}</option>
                        ) : null}
                        {product.available_units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unitLabel(unit)}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className={field}>
                      {t("itemIdentification")}
                      <Input readOnly value={identification} />
                    </label>
                    <p className="text-xs text-slate-500 sm:col-span-2">{t("trackedHelp")}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">{t("catalogHelp")}</p>
                )}
              </div>
            );
          })}
        </div>

        <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])}>
          {t("addLine")}
        </Button>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className={field}>
            {t("discount")}
            <Input min="0" step="0.01" type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} />
          </label>
          <label className={field}>
            {t("payment")}
            <Select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as "paid" | "partial" | "unpaid")}>
              <option value="paid">{t("paid")}</option>
              <option value="partial">{t("partial")}</option>
              <option value="unpaid">{t("unpaid")}</option>
            </Select>
          </label>
          <label className={field}>
            {t("date")}
            <Input type="datetime-local" value={soldAt} onChange={(event) => setSoldAt(event.target.value)} />
          </label>
        </div>

        <Button disabled={busy || !accessToken || !validate()} type="submit">
          {editing ? t("saveEdit") : t("save")}
        </Button>
      </form>

      <div className={panel}>
        <h2 className="font-bold">{t("recentSales")}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-3">{t("receipt")}</th>
                <th>{t("customer")}</th>
                <th>{t("customerRegion")}</th>
                <th>{t("payment")}</th>
                <th className="text-right">{t("amount")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr className="border-t border-slate-100 dark:border-slate-800" key={sale.id}>
                  <td className="py-3 font-semibold">{sale.receipt_number}</td>
                  <td>{sale.customer_name || "—"}</td>
                  <td>{sale.customer_region || "—"}</td>
                  <td>{sale.payment_status}</td>
                  <td className="text-right font-bold">{money(sale.total)}</td>
                  <td className="space-x-2 text-right">
                    <Button size="small" type="button" variant="outline" onClick={() => beginEdit(sale)}>
                      {t("edit")}
                    </Button>
                    {permissions.includes("commerce.sales.void") ? (
                      <Button size="small" type="button" variant="ghost" onClick={() => void onVoid(sale)}>
                        {t("void")}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sales.length ? <p className="py-4 text-sm text-slate-500">{t("noSales")}</p> : null}
        </div>
      </div>
    </section>
  );
}

export { SalesWorkspace };
