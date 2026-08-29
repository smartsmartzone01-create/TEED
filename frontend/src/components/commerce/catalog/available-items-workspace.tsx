"use client";

import { Archive, CircleHelp, Pencil, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useNotification } from "@/providers/global/notification-provider";
import { commercePatch, getProducts } from "@/services/commerce/commerce";
import type { Product } from "@/types/commerce/commerce";

const countableUnits = new Set([
  "piece",
  "pair",
  "packet",
  "box",
  "carton",
  "crate",
  "bottle",
  "can",
  "bag",
  "sack",
  "bundle",
  "set",
  "dozen",
  "roll",
]);

const unitOptions = [
  "piece",
  "pair",
  "packet",
  "box",
  "carton",
  "crate",
  "bottle",
  "can",
  "bag",
  "sack",
  "bundle",
  "set",
  "dozen",
  "roll",
  "meter",
  "kilogram",
  "gram",
  "liter",
  "milliliter",
  "tonne",
] as const;

const field =
  "space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300";

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
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(
    number,
  );
}

function AvailableItemsWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("Commerce");
  const locale = useLocale();
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const availableProducts = useMemo(
    () => products.filter((product) => Number(product.current_quantity) > 0),
    [products],
  );
  const emptyProducts = useMemo(
    () => products.filter((product) => Number(product.current_quantity) === 0),
    [products],
  );
  const editingProduct = useMemo(
    () => products.find((product) => product.id === editingId) ?? null,
    [editingId, products],
  );

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await getProducts(businessId, accessToken);
      setProducts(response.data?.products ?? []);
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("errors.load"),
        tone: "error",
      });
    }
  }, [accessToken, businessId, notify, t]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const closeEdit = () => {
    setEditingId("");
    setDraft(null);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      brand: product.brand,
      variant: product.variant,
      barcode: product.barcode,
      unit: product.unit,
    });
  };

  const save = async (
    event: FormEvent<HTMLFormElement>,
    product: Product,
  ) => {
    event.preventDefault();
    if (!accessToken || !draft) return;

    if (!draft.name.trim()) {
      notify({ message: t("validation.itemNameRequired"), tone: "error" });
      return;
    }
    if (!draft.unit.trim()) {
      notify({ message: t("validation.unitRequired"), tone: "error" });
      return;
    }

    setBusy(true);
    try {
      await commercePatch(businessId, accessToken, `products/${product.id}`, {
        name: draft.name.trim(),
        brand: draft.brand.trim(),
        variant: draft.variant.trim(),
        barcode: draft.barcode.trim(),
        unit: draft.unit,
      });
      notify({ message: t("success.itemCorrected"), tone: "success" });
      closeEdit();
      await load();
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("errors.save"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const archiveEmptyProduct = async (product: Product) => {
    if (!accessToken || Number(product.current_quantity) !== 0) return;
    if (!window.confirm(t("messages.archiveItemConfirm", { name: product.name }))) {
      return;
    }

    setBusy(true);
    try {
      await commercePatch(businessId, accessToken, `products/${product.id}`, {
        is_active: false,
      });
      notify({ message: t("success.itemArchived"), tone: "success" });
      if (editingId === product.id) closeEdit();
      await load();
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("errors.save"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const headers = {
    product: locale === "sw" ? "Bidhaa" : "Product",
    brand: locale === "sw" ? "Chapa" : "Brand",
    variant: locale === "sw" ? "Aina" : "Variant / type",
    unit: locale === "sw" ? "Kipimo" : "Unit",
    id: locale === "sw" ? "Namba ya bidhaa" : "Item ID",
    quantity: locale === "sw" ? "Kiasi" : "Quantity",
    tracking: locale === "sw" ? "Ufuatiliaji" : "Tracking",
    action: locale === "sw" ? "Hatua" : "Action",
  };

  const intro =
    locale === "sw"
      ? "Bidhaa zinazopatikana kwa sasa katika biashara hii."
      : "Currently available products for this business.";

  return (
    <section className="w-full space-y-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-base font-semibold leading-6 text-slate-950 dark:text-white sm:text-lg">
          {intro}
        </p>
        {emptyProducts.length ? (
          <Tooltip content={t("tooltips.reviewEmptyItems")}>
            <Button
              onClick={() => setShowEmpty((current) => !current)}
              size="small"
              type="button"
              variant="ghost"
            >
              {t("actions.reviewEmptyItems", { count: emptyProducts.length })}
            </Button>
          </Tooltip>
        ) : null}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:block">
        <div className="overflow-x-auto">
          <table className="mx-auto w-full min-w-[900px] border-collapse text-left text-xs">
            <thead className="bg-[#EEF1F4] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">{headers.product}</th>
                <th className="px-3 py-3">{headers.brand}</th>
                <th className="px-3 py-3">{headers.variant}</th>
                <th className="px-3 py-3">{headers.unit}</th>
                <th className="px-3 py-3">{headers.id}</th>
                <th className="px-3 py-3 text-right">{headers.quantity}</th>
                <th className="px-3 py-3">{headers.tracking}</th>
                <th className="px-4 py-3 text-right">{headers.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {availableProducts.map((product, index) => (
                <tr
                  className={
                    index % 2 === 0
                      ? "bg-white transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900/60"
                      : "bg-[#F4F7FA] transition-colors hover:bg-slate-100 dark:bg-slate-900/35 dark:hover:bg-slate-900/70"
                  }
                  key={product.id}
                >
                  <td className="px-4 py-3">
                    <div className="min-w-40">
                      <strong
                        className="block text-sm font-semibold"
                        style={{ color: "var(--workspace-primary, var(--brand-navy))" }}
                      >
                        {product.name}
                      </strong>
                      {product.barcode ? (
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {product.barcode}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                    {product.brand || "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                    {product.variant || product.group || "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                    {product.unit}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-slate-500">
                    {product.sku}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <strong
                      className="text-sm font-semibold"
                      style={{ color: "var(--workspace-primary, var(--brand-navy))" }}
                    >
                      {displayQuantity(product.current_quantity, product.unit)}
                    </strong>
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {product.tracking_mode === "individual"
                      ? t("values.individual")
                      : t("values.quantity")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Tooltip content={t("tooltips.correctItem")}>
                      <Button
                        onClick={() => openEdit(product)}
                        size="small"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil className="size-3.5" />
                        {t("actions.correctItem")}
                      </Button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
              {!availableProducts.length ? (
                <tr>
                  <td className="px-4 py-7 text-sm text-slate-500" colSpan={8}>
                    {t("empty.availableItems")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:hidden">
        {availableProducts.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {availableProducts.map((product, index) => (
              <div
                className={index % 2 === 0 ? "bg-white p-3.5 dark:bg-slate-950" : "bg-[#F4F7FA] p-3.5 dark:bg-slate-900/35"}
                key={product.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{ color: "var(--workspace-primary, var(--brand-navy))" }}
                    >
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {[product.brand, product.variant || product.group]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <strong
                      className="text-sm font-semibold"
                      style={{ color: "var(--workspace-primary, var(--brand-navy))" }}
                    >
                      {displayQuantity(product.current_quantity, product.unit)}
                    </strong>
                    <span className="ml-1 text-[11px] text-slate-500">{product.unit}</span>
                  </div>
                </div>

                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="min-w-0 text-[11px] leading-4 text-slate-500">
                    <p className="truncate font-mono">{product.sku}</p>
                    <p>
                      {product.tracking_mode === "individual"
                        ? t("values.individual")
                        : t("values.quantity")}
                      {product.barcode ? ` · ${product.barcode}` : ""}
                    </p>
                  </div>
                  <Button
                    onClick={() => openEdit(product)}
                    size="small"
                    type="button"
                    variant="ghost"
                  >
                    <Pencil className="size-3.5" />
                    {t("actions.correctItem")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-slate-500">{t("empty.availableItems")}</p>
        )}
      </div>

      {showEmpty && emptyProducts.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-slate-800">
            {t("emptyItemsTitle")}
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {emptyProducts.map((product) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                key={product.id}
              >
                <div>
                  <strong>{product.name}</strong>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{product.sku}</p>
                </div>
                <Tooltip content={t("tooltips.archiveEmptyItem")}>
                  <Button
                    disabled={busy}
                    onClick={() => void archiveEmptyProduct(product)}
                    size="small"
                    type="button"
                    variant="ghost"
                  >
                    <Archive className="size-4" />
                    {t("actions.archiveItem")}
                  </Button>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {editingProduct && draft ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-2xl sm:rounded-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white sm:text-base">
                  {t("actions.correctItem")}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">{editingProduct.name}</p>
              </div>
              <button
                aria-label={t("actions.cancel")}
                className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-interactive-highlight hover:text-slate-950 dark:hover:text-white"
                onClick={closeEdit}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <form className="grid gap-4 p-4 sm:p-5" onSubmit={(event) => void save(event, editingProduct)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={field}>
                  {t("fields.name")}
                  <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </label>
                <label className={field}>
                  {t("fields.brandOptional")}
                  <Input value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} />
                </label>
                <label className={field}>
                  {t("fields.variant")}
                  <Input value={draft.variant} onChange={(event) => setDraft({ ...draft, variant: event.target.value })} />
                </label>
                <label className={field}>
                  {t("fields.barcode")}
                  <Input value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} />
                </label>
                <label className={field}>
                  <span className="flex items-center gap-1">
                    {t("fields.unit")}
                    <Tooltip content={t("tooltips.unitCorrection")}>
                      <span className="inline-flex cursor-help text-slate-400" tabIndex={0}>
                        <CircleHelp className="size-3.5" />
                      </span>
                    </Tooltip>
                  </span>
                  <Select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}>
                    {unitOptions.map((unit) => (
                      <option key={unit} value={unit}>
                        {t(`units.${unit}`)}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button onClick={closeEdit} size="small" type="button" variant="ghost">
                  {t("actions.cancel")}
                </Button>
                <Button disabled={busy} size="small" type="submit">
                  {t("actions.saveCorrection")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export { AvailableItemsWorkspace };
