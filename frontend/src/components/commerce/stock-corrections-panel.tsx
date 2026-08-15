"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useNotification } from "@/providers/global/notification-provider";
import { commercePatch, commerceRead, getProducts } from "@/services/commerce/commerce";
import type { Product } from "@/types/commerce/commerce";

const countableUnits = new Set([
  "piece", "pair", "packet", "box", "carton", "crate", "bottle", "can",
  "bag", "sack", "bundle", "set", "dozen", "roll",
]);
const unitOptions = [
  "piece", "pair", "packet", "box", "carton", "crate", "bottle", "can",
  "bag", "sack", "bundle", "set", "dozen", "roll", "meter", "kilogram",
  "gram", "liter", "milliliter", "tonne",
] as const;
const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950";
const field = "space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300";

type StockLine = {
  id: string;
  product: string;
  product_name: string;
  product_sku: string;
  tracking_mode: "quantity" | "individual";
  quantity_received: string;
  quantity_remaining: string;
  received_unit: string;
  conversion_to_base: string;
};
type StockReceipt = {
  id: string;
  reference: string;
  status: string;
  supplier_name: string;
  received_at: string | null;
  created_at: string;
  correction_open?: boolean;
  correction_deadline?: string | null;
  lines: StockLine[];
};
type LineDraft = {
  receiptId: string;
  lineId: string;
  productId: string;
  name: string;
  brand: string;
  variant: string;
  barcode: string;
  quantity: string;
  unit: string;
};

function cleanNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value);
}

function StockCorrectionsPanel({ businessId }: { businessId: string }) {
  const t = useTranslations("Commerce");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<LineDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedReceipt = useMemo(
    () => receipts.find((receipt) => receipt.id === draft?.receiptId) ?? null,
    [draft?.receiptId, receipts],
  );

  const load = async () => {
    if (!accessToken) return;
    try {
      const [stockResponse, productsResponse] = await Promise.all([
        commerceRead(businessId, accessToken, "stock-receipts"),
        getProducts(businessId, accessToken),
      ]);
      const stock = stockResponse.data as { receipts?: StockReceipt[] } | null;
      setReceipts(stock?.receipts ?? []);
      setProducts(productsResponse.data?.products ?? []);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("errors.load"));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, businessId]);

  const beginCorrection = (receipt: StockReceipt, line: StockLine) => {
    const product = products.find((item) => item.id === line.product);
    const conversion = Number(line.conversion_to_base || "1") || 1;
    setDraft({
      receiptId: receipt.id,
      lineId: line.id,
      productId: line.product,
      name: product?.name ?? line.product_name,
      brand: product?.brand ?? "",
      variant: product?.variant ?? "",
      barcode: product?.barcode ?? "",
      quantity: String(Number(line.quantity_received) / conversion),
      unit: line.received_unit || product?.unit || "piece",
    });
    setError("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !draft || !selectedReceipt) return;
    const quantity = Number(draft.quantity);
    if (!draft.name.trim()) {
      setError(t("validation.itemNameRequired"));
      return;
    }
    if (!draft.unit.trim()) {
      setError(t("validation.unitRequired"));
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError(t("validation.quantityPositive"));
      return;
    }
    if (countableUnits.has(draft.unit) && !Number.isInteger(quantity)) {
      setError(t("validation.wholeQuantity", { unit: draft.unit }));
      return;
    }

    setBusy(true);
    setError("");
    try {
      await commercePatch(
        businessId,
        accessToken,
        `stock-receipts/${draft.receiptId}`,
        {
          lines: [
            {
              id: draft.lineId,
              quantity: draft.quantity,
              unit: draft.unit,
              name: draft.name.trim(),
              brand: draft.brand.trim(),
              variant: draft.variant.trim(),
              barcode: draft.barcode.trim(),
            },
          ],
        },
      );
      notify({ message: t("success.stockCorrected"), tone: "success" });
      setDraft(null);
      await load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : t("errors.save");
      setError(message);
      notify({ message, tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className={panel}>
        <div>
          <h2 className="font-bold">{t("stockCorrectionsTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("stockCorrectionsHelp")}</p>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">{error}</div> : null}

        <div className="mt-4 space-y-4">
          {receipts.map((receipt) => (
            <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-800" key={receipt.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong>{receipt.reference}</strong>
                  <p className="mt-1 text-xs text-slate-500">{receipt.supplier_name || t("fields.supplierNotEntered")} · {new Date(receipt.created_at).toLocaleString()}</p>
                </div>
                {receipt.correction_open ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{t("correctionOpen")}</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{t("correctionClosed")}</span>
                )}
              </div>
              {receipt.correction_open && receipt.correction_deadline ? <p className="mt-2 text-xs text-slate-500">{t("correctionDeadline", { date: new Date(receipt.correction_deadline).toLocaleString() })}</p> : null}
              {!receipt.correction_open ? <p className="mt-2 text-xs text-slate-500">{t("correctionClosedHelp")}</p> : null}

              <div className="mt-3 grid gap-2">
                {receipt.lines.map((line) => {
                  const conversion = Number(line.conversion_to_base || "1") || 1;
                  const received = Number(line.quantity_received) / conversion;
                  const remaining = Number(line.quantity_remaining) / conversion;
                  return (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900" key={line.id}>
                      <div>
                        <strong>{line.product_name}</strong>
                        <p className="text-xs text-slate-500">{line.product_sku} · {cleanNumber(remaining)} {line.received_unit} {t("availableNowFromReceipt")} · {cleanNumber(received)} {t("receivedOriginally")}</p>
                      </div>
                      <Button disabled={!receipt.correction_open} type="button" size="small" variant="outline" onClick={() => beginCorrection(receipt, line)}>{t("actions.correctItem")}</Button>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>

      {draft ? (
        <form className={`${panel} mt-5 grid gap-4`} onSubmit={save}>
          <div>
            <h3 className="font-bold">{t("correctStockItem")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("correctStockItemHelp")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={field}>{t("fields.name")}<Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label className={field}>{t("fields.brandOptional")}<Input value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} /></label>
            <label className={field}>{t("fields.variant")}<Input value={draft.variant} onChange={(event) => setDraft({ ...draft, variant: event.target.value })} /></label>
            <label className={field}>{t("fields.barcode")}<Input value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} /></label>
            <label className={field}>{t("fields.quantity")}<Input min="0.001" step="0.001" type="number" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label>
            <label className={field}>{t("fields.unit")}<Select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}>{unitOptions.map((unit) => <option key={unit} value={unit}>{t(`units.${unit}`)}</option>)}</Select></label>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">{t("stockCorrectionWarning")}</div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} type="submit">{t("actions.saveCorrection")}</Button>
            <Button type="button" variant="ghost" onClick={() => { setDraft(null); setError(""); }}>{t("actions.cancel")}</Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

export { StockCorrectionsPanel };
