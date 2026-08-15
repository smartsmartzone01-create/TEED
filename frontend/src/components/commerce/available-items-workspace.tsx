"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useNotification } from "@/providers/global/notification-provider";
import { commercePatch, getProducts } from "@/services/commerce/commerce";
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

type EditDraft = {
  name: string;
  brand: string;
  variant: string;
  barcode: string;
  unit: string;
};

function displayQuantity(value: string, unit: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  if (countableUnits.has(unit) && Number.isInteger(number)) return String(number);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(number);
}

function AvailableItemsWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("Commerce");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const editing = useMemo(
    () => products.find((product) => product.id === editingId) ?? null,
    [editingId, products],
  );

  const load = async () => {
    if (!accessToken) return;
    try {
      const response = await getProducts(businessId, accessToken);
      setProducts(response.data?.products ?? []);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("errors.load"));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, businessId]);

  const beginEdit = (product: Product) => {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      brand: product.brand,
      variant: product.variant,
      barcode: product.barcode,
      unit: product.unit,
    });
    setError("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !editing || !draft) return;
    if (!draft.name.trim()) {
      setError(t("validation.itemNameRequired"));
      return;
    }
    if (!draft.unit.trim()) {
      setError(t("validation.unitRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await commercePatch(businessId, accessToken, `products/${editing.id}`, {
        name: draft.name.trim(),
        brand: draft.brand.trim(),
        variant: draft.variant.trim(),
        barcode: draft.barcode.trim(),
        unit: draft.unit,
      });
      notify({ message: t("success.itemCorrected"), tone: "success" });
      setEditingId("");
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
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">{t("eyebrow")}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{t("views.products.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{t("views.products.description")}</p>
      </header>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">{error}</div> : null}

      <div className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-bold">{t("catalog")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("availableItemsLiveHelp")}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article className="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800" key={product.id}>
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-base">{product.name}</strong>
                    {product.brand || product.variant ? (
                      <p className="mt-1 text-xs text-slate-500">{[product.brand, product.variant].filter(Boolean).join(" · ")}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                    {product.tracking_mode === "individual" ? t("values.individual") : t("values.quantity")}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                <p className="text-xs text-slate-500">{t("availableQuantity")}</p>
                <p className="mt-1 text-xl font-bold">{displayQuantity(product.current_quantity, product.unit)} <span className="text-sm font-semibold">{product.unit}</span></p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-slate-500">{t("fields.sku")}</dt><dd className="font-semibold">{product.sku || "—"}</dd></div>
                <div><dt className="text-slate-500">{t("fields.unit")}</dt><dd className="font-semibold">{product.unit}</dd></div>
                <div className="col-span-2"><dt className="text-slate-500">{t("fields.barcode")}</dt><dd className="font-semibold">{product.barcode || "—"}</dd></div>
              </dl>
              <Button type="button" variant="outline" onClick={() => beginEdit(product)}>{t("actions.correctItem")}</Button>
            </article>
          ))}
        </div>
      </div>

      {editing && draft ? (
        <form className={`${panel} grid gap-4`} onSubmit={save}>
          <div>
            <h2 className="font-bold">{t("correctAvailableItem", { name: editing.name })}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("correctAvailableItemHelp")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={field}>{t("fields.name")}<Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label className={field}>{t("fields.brandOptional")}<Input value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} /></label>
            <label className={field}>{t("fields.variant")}<Input value={draft.variant} onChange={(event) => setDraft({ ...draft, variant: event.target.value })} /></label>
            <label className={field}>{t("fields.barcode")}<Input value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} /></label>
            <label className={field}>{t("fields.unit")}<Select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}>{unitOptions.map((unit) => <option key={unit} value={unit}>{t(`units.${unit}`)}</option>)}</Select></label>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">{t("unitCorrectionWarning")}</div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} type="submit">{t("actions.saveCorrection")}</Button>
            <Button type="button" variant="ghost" onClick={() => { setEditingId(""); setDraft(null); setError(""); }}>{t("actions.cancel")}</Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

export { AvailableItemsWorkspace };
