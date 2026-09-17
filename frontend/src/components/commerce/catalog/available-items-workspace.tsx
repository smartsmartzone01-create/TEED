"use client";

import { Archive, CircleHelp, Plus, TrendingUp, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";

import {
  StockSkuOptionEditor,
  emptyStockSkuOptionDraft,
  stockSkuOptionsFromDrafts,
  type StockSkuOptionDraft,
} from "@/components/commerce/stock/stock-sku-option-editor";
import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useNotification } from "@/providers/global/notification-provider";
import {
  commercePatch,
  createProduct,
  getProducts,
  getSales,
} from "@/services/commerce/commerce";
import type { Product, ProductFamily } from "@/types/commerce/catalog";
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
const skuAccentClassName = "text-[var(--brand-orange)]";
const manageActionClassName =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

type EditDraft = {
  name: string;
  brand: string;
  variant: string;
  barcode: string;
  unit: string;
  trackingMode: "quantity" | "individual";
  sellingPrice: string;
  lowStockThreshold: string;
};

type NewSkuDraft = {
  options: StockSkuOptionDraft[];
  barcode: string;
  unit: string;
  trackingMode: "quantity" | "individual";
  sellingPrice: string;
  lowStockThreshold: string;
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

type FamilyEntry = {
  kind: "family";
  key: string;
  family: ProductFamily;
  products: Product[];
  totalQuantity: number;
};

type StandaloneEntry = {
  kind: "standalone";
  key: string;
  product: Product;
  totalQuantity: number;
};

type CatalogEntry = FamilyEntry | StandaloneEntry;

const emptyNewSku = (): NewSkuDraft => ({
  options: [emptyStockSkuOptionDraft()],
  barcode: "",
  unit: "piece",
  trackingMode: "quantity",
  sellingPrice: "",
  lowStockThreshold: "0",
});

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

function catalogEntries(
  products: Product[],
  families: ProductFamily[],
): CatalogEntry[] {
  const byFamily = new Map<string, Product[]>();
  const standalone: StandaloneEntry[] = [];

  for (const product of products) {
    if (product.family) {
      const current = byFamily.get(product.family) ?? [];
      current.push(product);
      byFamily.set(product.family, current);
      continue;
    }
    if (Number(product.current_quantity) > 0) {
      standalone.push({
        kind: "standalone",
        key: `standalone:${product.id}`,
        product,
        totalQuantity: Number(product.current_quantity) || 0,
      });
    }
  }

  const familyEntries: FamilyEntry[] = families.flatMap((family) => {
    const familyProducts = byFamily.get(family.id) ?? [];
    const totalQuantity = familyProducts.reduce(
      (total, product) => total + (Number(product.current_quantity) || 0),
      0,
    );
    if (totalQuantity <= 0) return [];
    return [
      {
        kind: "family" as const,
        key: `family:${family.id}`,
        family,
        products: familyProducts,
        totalQuantity,
      },
    ];
  });

  return [...familyEntries, ...standalone].sort((a, b) => {
    const aName = a.kind === "family" ? a.family.name : a.product.name;
    const bName = b.kind === "family" ? b.family.name : b.product.name;
    return aName.localeCompare(bName);
  });
}

function familyUnit(entry: FamilyEntry) {
  const units = [...new Set(entry.products.map((product) => product.unit).filter(Boolean))];
  return units.length === 1 ? units[0] : null;
}

function familyTrackingMode(entry: FamilyEntry) {
  const modes = [...new Set(entry.products.map((product) => product.tracking_mode))];
  return modes.length === 1 ? modes[0] : null;
}

function AvailableItemsWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("Commerce");
  const stockT = useTranslations("CommerceStockV2");
  const locale = useLocale();
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [performance, setPerformance] = useState<ProductPerformance>({
    today: "",
    week: "",
    month: "",
  });
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [managingFamilyId, setManagingFamilyId] = useState("");
  const [newSku, setNewSku] = useState<NewSkuDraft>(emptyNewSku);
  const [addingSku, setAddingSku] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const entries = useMemo(
    () => catalogEntries(products, families),
    [families, products],
  );
  const emptyProducts = useMemo(
    () => products.filter((product) => Number(product.current_quantity) === 0),
    [products],
  );
  const editingProduct = useMemo(
    () => products.find((product) => product.id === editingId) ?? null,
    [editingId, products],
  );
  const managingFamily = useMemo(
    () => families.find((family) => family.id === managingFamilyId) ?? null,
    [families, managingFamilyId],
  );
  const managingProducts = useMemo(
    () => products.filter((product) => product.family === managingFamilyId),
    [managingFamilyId, products],
  );
  const portalTarget = typeof document === "undefined" ? null : document.body;

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [productResponse, salesResponse] = await Promise.all([
        getProducts(businessId, accessToken),
        getSales(businessId, accessToken),
      ]);
      setProducts(productResponse.data?.products ?? []);
      setFamilies(productResponse.data?.families ?? []);

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
      trackingMode: product.tracking_mode,
      sellingPrice: product.selling_price ?? "",
      lowStockThreshold: product.low_stock_threshold,
    });
  };

  const save = async (event: FormEvent<HTMLFormElement>, product: Product) => {
    event.preventDefault();
    if (!accessToken || !draft) return;
    if (!draft.name.trim()) {
      notify({ message: t("validation.itemNameRequired"), tone: "error" });
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
        tracking_mode: draft.trackingMode,
        selling_price: draft.sellingPrice || null,
        low_stock_threshold: draft.lowStockThreshold || "0",
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

  const createFamilySku = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !managingFamily) return;
    const options = stockSkuOptionsFromDrafts(newSku.options);
    if (!options) {
      notify({ message: stockT("validation.varietyDetails"), tone: "error" });
      return;
    }

    setBusy(true);
    try {
      await createProduct(businessId, accessToken, {
        family_id: managingFamily.id,
        name: managingFamily.name,
        brand: managingFamily.brand,
        variant_options: options,
        barcode: newSku.barcode.trim(),
        unit: newSku.unit,
        tracking_mode: newSku.trackingMode,
        selling_price: newSku.sellingPrice || null,
        low_stock_threshold: newSku.lowStockThreshold || "0",
      });
      notify({
        message:
          locale === "sw"
            ? "SKU mpya imeundwa. Namba ya SKU imetolewa kiotomatiki."
            : "New SKU created. Its SKU number was assigned automatically.",
        tone: "success",
      });
      setNewSku(emptyNewSku());
      setAddingSku(false);
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
  const familyLabel = locale === "sw" ? "Familia" : "Family";
  const standaloneLabel = locale === "sw" ? "Bidhaa binafsi" : "Standalone product";
  const manageLabel = locale === "sw" ? "Dhibiti" : "Manage";
  const editLabel = locale === "sw" ? "Hariri SKU" : "Edit SKU";
  const mixedLabel = locale === "sw" ? "Mchanganyiko" : "Mixed";
  const noPerformance = locale === "sw" ? "Hakuna mauzo bado" : "No sales yet";
  const performancePeriods = [
    { key: "today" as const, label: locale === "sw" ? "Leo" : "Today" },
    { key: "week" as const, label: locale === "sw" ? "Wiki hii" : "This week" },
    { key: "month" as const, label: locale === "sw" ? "Mwezi huu" : "This month" },
  ];
  const emptyAvailable =
    locale === "sw" ? "Hakuna bidhaa zinazopatikana sasa." : "No products are currently available.";

  const renderEntry = (entry: CatalogEntry, index: number) => {
    if (entry.kind === "standalone") {
      const product = entry.product;
      return (
        <tr
          className={index % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-[#F4F7FA] dark:bg-slate-900/35"}
          key={entry.key}
        >
          <td className="px-4 py-3">
            <strong className="block text-sm font-bold text-slate-950 dark:text-white">{product.name}</strong>
            <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">{standaloneLabel}</span>
          </td>
          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{product.brand || "—"}</td>
          <td className="px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`truncate font-mono text-[11px] font-semibold ${skuAccentClassName}`}>{product.sku}</p>
                <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{product.variant || standaloneLabel}</p>
              </div>
              <button
                aria-label={`${manageLabel}: ${product.sku}`}
                className={manageActionClassName}
                onClick={() => openEdit(product)}
                type="button"
              >
                {manageLabel}
              </button>
            </div>
          </td>
          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{formatUnitName(product.unit, 2, locale)}</td>
          <td className="px-3 py-3 text-center"><strong className={`text-sm ${primaryAccentClassName}`}>{formatQuantityWithUnit(product.current_quantity, product.unit, locale)}</strong></td>
          <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{product.tracking_mode === "individual" ? t("values.individual") : t("values.quantity")}</td>
        </tr>
      );
    }

    const unit = familyUnit(entry);
    const trackingMode = familyTrackingMode(entry);
    return (
      <tr
        className={index % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-[#F4F7FA] dark:bg-slate-900/35"}
        key={entry.key}
      >
        <td className="px-4 py-3">
          <strong className="block text-sm font-bold text-slate-950 dark:text-white">{entry.family.name}</strong>
          <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">{familyLabel} · {entry.products.length} SKU</span>
        </td>
        <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{entry.family.brand || "—"}</td>
        <td className="px-3 py-2.5">
          <div className="flex min-w-64 items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              {entry.products.map((product) => (
                <div className="min-w-0" key={product.id}>
                  <p className={`truncate font-mono text-[11px] font-semibold ${skuAccentClassName}`}>{product.sku}</p>
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{product.variant || product.name} · {formatQuantityNumber(product.current_quantity, locale)}</p>
                </div>
              ))}
            </div>
            <button
              aria-label={`${manageLabel}: ${entry.family.name}`}
              className={manageActionClassName}
              onClick={() => setManagingFamilyId(entry.family.id)}
              type="button"
            >
              {manageLabel}
            </button>
          </div>
        </td>
        <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{unit ? formatUnitName(unit, 2, locale) : mixedLabel}</td>
        <td className="px-3 py-3 text-center"><strong className={`text-sm ${primaryAccentClassName}`}>{unit ? formatQuantityWithUnit(String(entry.totalQuantity), unit, locale) : formatQuantityNumber(String(entry.totalQuantity), locale)}</strong></td>
        <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{trackingMode ? trackingMode === "individual" ? t("values.individual") : t("values.quantity") : mixedLabel}</td>
      </tr>
    );
  };

  return (
    <section className="w-full space-y-3 !px-0 py-4 sm:space-y-4">
      <section aria-label={locale === "sw" ? "Utendaji wa bidhaa" : "Product performance"} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950 sm:px-4 sm:py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_10%,white)] text-[var(--workspace-primary,var(--brand-navy))]"><TrendingUp className="size-3.5" /></span>
            <h2 className="truncate text-sm font-semibold text-slate-950 dark:text-white">{locale === "sw" ? "Bidhaa zinazoongoza" : "Top-performing products"}</h2>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-md bg-slate-50 dark:divide-slate-800 dark:bg-slate-900/55">
          {performancePeriods.map((period) => (
            <div className="min-w-0 px-2 py-2 sm:px-3" key={period.key}>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">{period.label}</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-950 dark:text-white sm:text-xs">{performance[period.key] || noPerformance}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
          <p className="max-w-3xl text-base font-semibold leading-6 text-slate-950 dark:text-white sm:text-lg">{locale === "sw" ? "Familia za bidhaa na bidhaa binafsi zinazopatikana kwa sasa." : "Currently available product families and standalone products."}</p>
          {emptyProducts.length ? (
            <Tooltip content={t("tooltips.reviewEmptyItems")}>
              <Button onClick={() => setShowEmpty((current) => !current)} size="small" type="button" variant="ghost">{t("actions.reviewEmptyItems", { count: emptyProducts.length })}</Button>
            </Tooltip>
          ) : null}
        </div>

        <div className="p-3 sm:p-4">
          <div className="hidden overflow-x-auto rounded-md md:block">
            <table className="mx-auto w-full min-w-[860px] border-collapse text-left text-xs">
              <thead className="bg-[#DDE3E9] text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <tr>
                  <th className="px-4 py-3">{headers.product}</th><th className="px-3 py-3">{headers.brand}</th><th className="px-3 py-3">{headers.skus}</th><th className="px-3 py-3">{headers.unit}</th><th className="px-3 py-3 text-center">{headers.quantity}</th><th className="px-3 py-3">{headers.tracking}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {entries.map(renderEntry)}
                {!entries.length ? <tr><td className="px-4 py-7 text-sm text-slate-500" colSpan={6}>{emptyAvailable}</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-200 overflow-hidden rounded-md md:hidden dark:divide-slate-800">
            {entries.map((entry, index) => {
              const family = entry.kind === "family";
              const name = family ? entry.family.name : entry.product.name;
              const brand = family ? entry.family.brand : entry.product.brand;
              const rowProducts = family ? entry.products : [entry.product];
              return (
                <div className={index % 2 === 0 ? "bg-white p-3.5 dark:bg-slate-950" : "bg-[#F4F7FA] p-3.5 dark:bg-slate-900/35"} key={entry.key}>
                  <div><p className="text-sm font-bold text-slate-950 dark:text-white">{name}</p><p className="mt-1 text-xs text-slate-500">{family ? `${familyLabel} · ${rowProducts.length} SKU` : standaloneLabel}{brand ? ` · ${brand}` : ""}</p></div>
                  <div className="mt-2.5 rounded-md bg-slate-50 px-2.5 py-1.5 dark:bg-slate-900/60">
                    {rowProducts.map((product) => (
                      <div className="min-w-0 py-1" key={product.id}>
                        <p className={`truncate font-mono text-[11px] font-semibold ${skuAccentClassName}`}>{product.sku}</p>
                        <p className="truncate text-[11px] text-slate-500">{product.variant || product.name} · {formatQuantityWithUnit(product.current_quantity, product.unit, locale)}</p>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2">
                      <button
                        className={manageActionClassName}
                        onClick={() => family ? setManagingFamilyId(entry.family.id) : openEdit(entry.product)}
                        type="button"
                      >
                        {manageLabel}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!entries.length ? <p className="p-4 text-sm text-slate-500">{emptyAvailable}</p> : null}
          </div>
        </div>

        {showEmpty && emptyProducts.length ? (
          <div className="border-t border-slate-200 px-3 pb-3 pt-3 dark:border-slate-800 sm:px-4 sm:pb-4">
            <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{t("emptyItemsTitle")}</div>
            <div className="divide-y divide-slate-200 overflow-hidden rounded-md dark:divide-slate-800">
              {emptyProducts.map((product) => (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-3 py-3 text-sm dark:bg-slate-950" key={product.id}>
                  <div><strong>{product.family_name || product.name}</strong><p className="mt-1 text-[11px] text-slate-500">{product.family ? `${familyLabel} · ` : `${standaloneLabel} · `}<span className={`font-mono ${skuAccentClassName}`}>{product.sku}</span></p></div>
                  <div className="flex gap-2"><button className={manageActionClassName} onClick={() => product.family ? setManagingFamilyId(product.family) : openEdit(product)} type="button">{manageLabel}</button><Tooltip content={t("tooltips.archiveEmptyItem")}><Button disabled={busy} onClick={() => void archiveEmptyProduct(product)} size="small" type="button" variant="ghost"><Archive className="size-4" />{t("actions.archiveItem")}</Button></Tooltip></div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {managingFamily && portalTarget
        ? createPortal(
            <div aria-modal="true" className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[1px] sm:p-6" role="dialog">
              <div className="flex max-h-[82svh] w-full max-w-md min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-h-[90svh] sm:max-w-2xl">
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800 sm:px-5">
                  <div><h2 className="font-semibold text-slate-950 dark:text-white">{managingFamily.name}</h2><p className="mt-0.5 text-xs text-slate-500">{familyLabel} · {managingProducts.length} SKU</p></div>
                  <button aria-label={t("actions.cancel")} className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900" onClick={() => { setManagingFamilyId(""); setAddingSku(false); setNewSku(emptyNewSku()); }} type="button"><X className="size-4" /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                  <div className="space-y-2">
                    {managingProducts.map((product) => (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800" key={product.id}>
                        <div className="min-w-0"><p className={`font-mono text-xs font-semibold ${skuAccentClassName}`}>{product.sku}</p><p className="truncate text-xs text-slate-500">{product.variant || product.name} · {formatQuantityWithUnit(product.current_quantity, product.unit, locale)}</p></div>
                        <button className={manageActionClassName} onClick={() => openEdit(product)} type="button">{manageLabel}</button>
                      </div>
                    ))}
                  </div>

                  {!addingSku ? (
                    <Button className="mt-4" onClick={() => setAddingSku(true)} size="small" type="button" variant="outline"><Plus className="size-4" />{locale === "sw" ? "Ongeza SKU" : "Add SKU"}</Button>
                  ) : (
                    <form className="mt-5 space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800" onSubmit={(event) => void createFamilySku(event)}>
                      <div><h3 className="text-sm font-semibold">{locale === "sw" ? "SKU mpya" : "New SKU"}</h3><p className="mt-1 text-xs text-slate-500">{locale === "sw" ? "Namba ya SKU itatolewa kiotomatiki. SKU hii haitakuwa na stock mpaka stock itakaporekodiwa." : "The SKU number will be assigned automatically. This SKU will have zero stock until stock is recorded."}</p></div>
                      <StockSkuOptionEditor value={newSku.options} onChange={(options) => setNewSku((current) => ({ ...current, options }))} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className={field}>{t("fields.barcode")}<Input className={controlClassName} value={newSku.barcode} onChange={(event) => setNewSku((current) => ({ ...current, barcode: event.target.value }))} /></label>
                        <label className={field}>{t("fields.unit")}<Select className={controlClassName} value={newSku.unit} onChange={(event) => setNewSku((current) => ({ ...current, unit: event.target.value }))}>{unitOptions.map((unit) => <option key={unit} value={unit}>{t(`units.${unit}`)}</option>)}</Select></label>
                        <label className={field}>{locale === "sw" ? "Ufuatiliaji" : "Tracking"}<Select className={controlClassName} value={newSku.trackingMode} onChange={(event) => setNewSku((current) => ({ ...current, trackingMode: event.target.value as "quantity" | "individual" }))}><option value="quantity">{t("values.quantity")}</option><option value="individual">{t("values.individual")}</option></Select></label>
                        <label className={field}>{t("fields.price")}<Input className={controlClassName} min="0" step="0.01" type="number" value={newSku.sellingPrice} onChange={(event) => setNewSku((current) => ({ ...current, sellingPrice: event.target.value }))} /></label>
                      </div>
                      <div className="flex justify-end gap-2"><Button onClick={() => { setAddingSku(false); setNewSku(emptyNewSku()); }} size="small" type="button" variant="ghost">{t("actions.cancel")}</Button><Button disabled={busy} size="small" type="submit">{locale === "sw" ? "Unda SKU" : "Create SKU"}</Button></div>
                    </form>
                  )}
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}

      {editingProduct && draft && portalTarget
        ? createPortal(
            <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[1px] sm:p-6" role="dialog">
              <div className="flex max-h-[82svh] w-full max-w-md min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-h-[90svh] sm:max-w-2xl">
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800 sm:px-5">
                  <div><h2 className="text-sm font-semibold text-slate-950 dark:text-white sm:text-base">{editLabel}</h2><p className={`mt-0.5 font-mono text-xs ${skuAccentClassName}`}>{editingProduct.sku}</p></div>
                  <button aria-label={t("actions.cancel")} className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900" onClick={closeEdit} type="button"><X className="size-4" /></button>
                </div>
                <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void save(event, editingProduct)}>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={field}>{t("fields.name")}<Input className={controlClassName} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                      <label className={field}>{t("fields.brandOptional")}<Input className={controlClassName} value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} /></label>
                      <label className={field}>{t("fields.variant")}<Input className={controlClassName} value={draft.variant} onChange={(event) => setDraft({ ...draft, variant: event.target.value })} /></label>
                      <label className={field}>{t("fields.barcode")}<Input className={controlClassName} value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} /></label>
                      <label className={field}><span className="flex items-center gap-1">{t("fields.unit")}<Tooltip content={t("tooltips.unitCorrection")}><span className="inline-flex cursor-help text-slate-400" tabIndex={0}><CircleHelp className="size-3.5" /></span></Tooltip></span><Select className={controlClassName} value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}>{unitOptions.map((unit) => <option key={unit} value={unit}>{t(`units.${unit}`)}</option>)}</Select></label>
                      <label className={field}>{locale === "sw" ? "Ufuatiliaji" : "Tracking"}<Select className={controlClassName} value={draft.trackingMode} onChange={(event) => setDraft({ ...draft, trackingMode: event.target.value as "quantity" | "individual" })}><option value="quantity">{t("values.quantity")}</option><option value="individual">{t("values.individual")}</option></Select></label>
                      <label className={field}>{t("fields.price")}<Input className={controlClassName} min="0" step="0.01" type="number" value={draft.sellingPrice} onChange={(event) => setDraft({ ...draft, sellingPrice: event.target.value })} /></label>
                      <label className={field}>{locale === "sw" ? "Kiwango cha stock ndogo" : "Low-stock threshold"}<Input className={controlClassName} min="0" step="0.001" type="number" value={draft.lowStockThreshold} onChange={(event) => setDraft({ ...draft, lowStockThreshold: event.target.value })} /></label>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-4"><Button onClick={closeEdit} size="small" type="button" variant="ghost">{t("actions.cancel")}</Button><Button disabled={busy} size="small" type="submit">{t("actions.saveCorrection")}</Button></div>
                </form>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </section>
  );
}

export { AvailableItemsWorkspace };
