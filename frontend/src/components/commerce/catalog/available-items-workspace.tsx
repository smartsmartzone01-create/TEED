"use client";

import { Archive, CircleHelp, Pencil, TrendingUp, X } from "lucide-react";
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
import { commercePatch, getProducts, getSales } from "@/services/commerce/commerce";
import type { Product } from "@/types/commerce/commerce";
import {
  formatQuantityNumber,
  formatQuantityWithUnit,
  formatUnitName,
} from "@/utils/commerce/quantity";

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
  "space-y-1.5 text-[13px] font-semibold text-slate-600 dark:text-slate-300";
const controlClassName =
  "h-10 rounded-md border-slate-300 bg-white shadow-none dark:border-slate-700 dark:bg-slate-950";
const primaryAccentClassName =
  "text-[var(--workspace-primary,var(--brand-navy))] dark:[color:color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_35%,white)]";

type EditDraft = {
  name: string;
  brand: string;
  variant: string;
  barcode: string;
  unit: string;
};

type PerformanceSale = {
  status: string;
  sold_at: string;
  items: Array<{
    source: string;
    product: string;
    product_name: string;
    item_name: string;
    quantity: string;
    returned_quantity: string;
  }>;
};

type ProductPerformance = {
  today: string;
  week: string;
  month: string;
};

type AvailableFamily = {
  key: string;
  familyId: string | null;
  name: string;
  brand: string;
  products: Product[];
  totalQuantity: number;
};

function topProductSince(sales: PerformanceSale[], since: Date) {
  const totals = new Map<string, { name: string; quantity: number }>();

  for (const sale of sales) {
    if (sale.status !== "active") continue;
    const soldAt = new Date(sale.sold_at);
    if (Number.isNaN(soldAt.getTime()) || soldAt < since) continue;

    for (const item of sale.items) {
      if (item.source !== "catalog" || !item.product) continue;
      const soldQuantity = Math.max(
        0,
        Number(item.quantity) - Number(item.returned_quantity || 0),
      );
      if (!Number.isFinite(soldQuantity) || soldQuantity <= 0) continue;

      const current = totals.get(item.product);
      totals.set(item.product, {
        name: item.product_name || item.item_name,
        quantity: (current?.quantity ?? 0) + soldQuantity,
      });
    }
  }

  let top: { name: string; quantity: number } | null = null;
  for (const candidate of totals.values()) {
    if (!top || candidate.quantity > top.quantity) top = candidate;
  }
  return top?.name ?? "";
}

function groupAvailableFamilies(products: Product[]): AvailableFamily[] {
  const grouped = new Map<string, AvailableFamily>();

  for (const product of products) {
    const key = product.family ? `family:${product.family}` : `product:${product.id}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.products.push(product);
      existing.totalQuantity += Number(product.current_quantity) || 0;
      if (!existing.brand && product.brand) existing.brand = product.brand;
      continue;
    }

    grouped.set(key, {
      key,
      familyId: product.family,
      name: product.family_name || product.name,
      brand: product.brand,
      products: [product],
      totalQuantity: Number(product.current_quantity) || 0,
    });
  }

  return [...grouped.values()]
    .filter((family) => family.totalQuantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name) || a.brand.localeCompare(b.brand));
}

function familyUnit(family: AvailableFamily) {
  const units = [...new Set(family.products.map((product) => product.unit).filter(Boolean))];
  return units.length === 1 ? units[0] : null;
}

function familyTrackingMode(family: AvailableFamily) {
  const modes = [...new Set(family.products.map((product) => product.tracking_mode))];
  return modes.length === 1 ? modes[0] : null;
}

function AvailableItemsWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("Commerce");
  const locale = useLocale();
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [performance, setPerformance] = useState<ProductPerformance>({
    today: "",
    week: "",
    month: "",
  });
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const availableFamilies = useMemo(() => groupAvailableFamilies(products), [products]);
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
      const [productResponse, salesResponse] = await Promise.all([
        getProducts(businessId, accessToken),
        getSales(businessId, accessToken),
      ]);
      setProducts(productResponse.data?.products ?? []);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const sales = (salesResponse.data?.sales ?? []) as PerformanceSale[];

      setPerformance({
        today: topProductSince(sales, todayStart),
        week: topProductSince(sales, weekStart),
        month: topProductSince(sales, monthStart),
      });
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

  const save = async (event: FormEvent<HTMLFormElement>, product: Product) => {
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
    if (!window.confirm(t("messages.archiveItemConfirm", { name: product.name }))) return;

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
    skus: "SKUs",
    unit: locale === "sw" ? "Kipimo" : "Unit",
    quantity: locale === "sw" ? "Kiasi" : "Quantity",
    tracking: locale === "sw" ? "Ufuatiliaji" : "Tracking",
  };
  const intro =
    locale === "sw"
      ? "Familia za bidhaa zinazopatikana kwa sasa katika biashara hii."
      : "Currently available product families for this business.";
  const editLabel = locale === "sw" ? "Hariri SKU" : "Edit SKU";
  const mixedLabel = locale === "sw" ? "Mchanganyiko" : "Mixed";
  const noPerformance = locale === "sw" ? "Hakuna mauzo bado" : "No sales yet";
  const performancePeriods = [
    { key: "today" as const, label: locale === "sw" ? "Leo" : "Today" },
    { key: "week" as const, label: locale === "sw" ? "Wiki hii" : "This week" },
    { key: "month" as const, label: locale === "sw" ? "Mwezi huu" : "This month" },
  ];
  const emptyAvailable =
    locale === "sw" ? "Hakuna familia za bidhaa zinazopatikana sasa." : "No product families are currently available.";

  return (
    <section className="w-full space-y-3 !px-0 py-4 sm:space-y-4">
      <section
        aria-label={locale === "sw" ? "Utendaji wa bidhaa" : "Product performance"}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950 sm:px-4 sm:py-3"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_10%,white)] text-[var(--workspace-primary,var(--brand-navy))] dark:bg-[color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_20%,transparent)] dark:[color:color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_35%,white)]">
              <TrendingUp className="size-3.5" />
            </span>
            <h2 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
              {locale === "sw" ? "Bidhaa zinazoongoza" : "Top-performing products"}
            </h2>
          </div>
          <span className="hidden text-[10px] text-slate-400 sm:inline">
            {locale === "sw" ? "Kulingana na mauzo" : "Based on sales"}
          </span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-md bg-slate-50 dark:divide-slate-800 dark:bg-slate-900/55">
          {performancePeriods.map((period) => (
            <div className="min-w-0 px-2 py-2 sm:px-3" key={period.key}>
              <div className="flex items-center gap-1">
                <TrendingUp className={`size-3 shrink-0 ${primaryAccentClassName}`} />
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                  {period.label}
                </p>
              </div>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-950 dark:text-white sm:text-xs">
                {performance[period.key] || noPerformance}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
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

        <div className="p-3 sm:p-4">
          <div className="hidden overflow-x-auto rounded-md md:block">
            <table className="mx-auto w-full min-w-[860px] border-collapse text-left text-xs">
              <thead className="bg-[#DDE3E9] text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <tr>
                  <th className="px-4 py-3">{headers.product}</th>
                  <th className="px-3 py-3">{headers.brand}</th>
                  <th className="px-3 py-3">{headers.skus}</th>
                  <th className="px-3 py-3">{headers.unit}</th>
                  <th className="px-3 py-3 text-center">{headers.quantity}</th>
                  <th className="px-3 py-3">{headers.tracking}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {availableFamilies.map((family, index) => {
                  const unit = familyUnit(family);
                  const trackingMode = familyTrackingMode(family);
                  return (
                    <tr
                      className={
                        index % 2 === 0
                          ? "bg-white transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900/60"
                          : "bg-[#F4F7FA] transition-colors hover:bg-slate-100 dark:bg-slate-900/35 dark:hover:bg-slate-900/70"
                      }
                      key={family.key}
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-40">
                          <strong className="block text-sm font-bold text-slate-950 dark:text-white">
                            {family.name}
                          </strong>
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            {locale === "sw"
                              ? `${family.products.length} SKU`
                              : `${family.products.length} ${family.products.length === 1 ? "SKU" : "SKUs"}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{family.brand || "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="space-y-1">
                          {family.products.map((product) => (
                            <div className="flex min-w-56 items-center justify-between gap-2" key={product.id}>
                              <div className="min-w-0">
                                <p className="truncate font-mono text-[11px] font-semibold text-[var(--workspace-secondary,var(--brand-orange))] dark:text-slate-200">
                                  {product.sku || "—"}
                                </p>
                                <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                                  {product.variant || product.group || product.name}
                                  {` · ${formatQuantityNumber(product.current_quantity, locale)}`}
                                </p>
                              </div>
                              <Tooltip content={editLabel}>
                                <button
                                  aria-label={`${editLabel}: ${product.sku || product.name}`}
                                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white"
                                  onClick={() => openEdit(product)}
                                  type="button"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                              </Tooltip>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {unit ? formatUnitName(unit, 2, locale) : mixedLabel}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <strong className={`text-sm font-bold ${primaryAccentClassName}`}>
                          {unit
                            ? formatQuantityWithUnit(String(family.totalQuantity), unit, locale)
                            : formatQuantityNumber(String(family.totalQuantity), locale)}
                        </strong>
                      </td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                        {trackingMode
                          ? trackingMode === "individual"
                            ? t("values.individual")
                            : t("values.quantity")
                          : mixedLabel}
                      </td>
                    </tr>
                  );
                })}
                {!availableFamilies.length ? (
                  <tr>
                    <td className="px-4 py-7 text-sm text-slate-500" colSpan={6}>{emptyAvailable}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-md md:hidden">
            {availableFamilies.length ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {availableFamilies.map((family, index) => {
                  const unit = familyUnit(family);
                  const trackingMode = familyTrackingMode(family);
                  return (
                    <div
                      className={index % 2 === 0 ? "bg-white p-3.5 dark:bg-slate-950" : "bg-[#F4F7FA] p-3.5 dark:bg-slate-900/35"}
                      key={family.key}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{family.name}</p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{family.brand || "—"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <strong className={`text-sm font-bold ${primaryAccentClassName}`}>
                            {unit
                              ? formatQuantityWithUnit(String(family.totalQuantity), unit, locale)
                              : formatQuantityNumber(String(family.totalQuantity), locale)}
                          </strong>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {trackingMode
                              ? trackingMode === "individual"
                                ? t("values.individual")
                                : t("values.quantity")
                              : mixedLabel}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 rounded-md bg-slate-50 px-2.5 py-1.5 dark:bg-slate-900/60">
                        {family.products.map((product) => (
                          <div className="flex items-center justify-between gap-2 py-1" key={product.id}>
                            <div className="min-w-0 text-[11px] leading-4">
                              <p className="truncate font-mono font-semibold text-[var(--workspace-secondary,var(--brand-orange))] dark:text-slate-200">
                                {product.sku || "—"}
                              </p>
                              <p className="truncate text-slate-500 dark:text-slate-400">
                                {product.variant || product.group || product.name}
                                {` · ${formatQuantityNumber(product.current_quantity, locale)}`}
                              </p>
                            </div>
                            <button
                              aria-label={`${editLabel}: ${product.sku || product.name}`}
                              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white"
                              onClick={() => openEdit(product)}
                              type="button"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="p-4 text-sm text-slate-500">{emptyAvailable}</p>
            )}
          </div>
        </div>

        {showEmpty && emptyProducts.length ? (
          <div className="border-t border-slate-200 px-3 pb-3 pt-3 dark:border-slate-800 sm:px-4 sm:pb-4">
            <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{t("emptyItemsTitle")}</div>
            <div className="divide-y divide-slate-200 overflow-hidden rounded-md dark:divide-slate-800">
              {emptyProducts.map((product) => (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-3 py-3 text-sm dark:bg-slate-950" key={product.id}>
                  <div>
                    <strong>{product.family_name || product.name}</strong>
                    <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">{product.sku}</p>
                  </div>
                  <Tooltip content={t("tooltips.archiveEmptyItem")}>
                    <Button disabled={busy} onClick={() => void archiveEmptyProduct(product)} size="small" type="button" variant="ghost">
                      <Archive className="size-4" />
                      {t("actions.archiveItem")}
                    </Button>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {editingProduct && draft ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[1px] sm:p-6"
          role="dialog"
        >
          <div className="flex max-h-[82svh] w-full max-w-md min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-h-[90svh] sm:max-w-2xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white sm:text-base">{editLabel}</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{editingProduct.name}</p>
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

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void save(event, editingProduct)}>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={field}>
                    {t("fields.name")}
                    <Input className={controlClassName} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                  </label>
                  <label className={field}>
                    {t("fields.brandOptional")}
                    <Input className={controlClassName} value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} />
                  </label>
                  <label className={field}>
                    {t("fields.variant")}
                    <Input className={controlClassName} value={draft.variant} onChange={(event) => setDraft({ ...draft, variant: event.target.value })} />
                  </label>
                  <label className={field}>
                    {t("fields.barcode")}
                    <Input className={controlClassName} value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} />
                  </label>
                  <label className={field}>
                    <span className="flex items-center gap-1">
                      {t("fields.unit")}
                      <Tooltip content={t("tooltips.unitCorrection")}>
                        <span className="inline-flex cursor-help text-slate-400" tabIndex={0}><CircleHelp className="size-3.5" /></span>
                      </Tooltip>
                    </span>
                    <Select className={controlClassName} value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}>
                      {unitOptions.map((unit) => <option key={unit} value={unit}>{t(`units.${unit}`)}</option>)}
                    </Select>
                  </label>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-4">
                <Button onClick={closeEdit} size="small" type="button" variant="ghost">{t("actions.cancel")}</Button>
                <Button disabled={busy} size="small" type="submit">{t("actions.saveCorrection")}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export { AvailableItemsWorkspace };
