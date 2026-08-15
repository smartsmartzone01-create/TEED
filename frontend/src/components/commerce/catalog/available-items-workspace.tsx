"use client";

import { Archive, ChevronDown, ChevronUp, CircleHelp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

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

  const toggleEdit = (product: Product) => {
    if (editingId === product.id) {
      setEditingId("");
      setDraft(null);
      return;
    }

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
      setEditingId("");
      setDraft(null);
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
      if (editingId === product.id) {
        setEditingId("");
        setDraft(null);
      }
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

  const renderProduct = (product: Product) => {
    const expanded = editingId === product.id && draft;
    return (
      <article
        className="bg-white p-4 transition-colors hover:bg-slate-50/70 dark:bg-slate-950 dark:hover:bg-slate-900/40"
        key={product.id}
        style={
          expanded
            ? {
                borderInlineStartColor:
                  "var(--workspace-primary, var(--brand-navy))",
                borderInlineStartStyle: "solid",
                borderInlineStartWidth: 3,
              }
            : undefined
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <strong className="text-sm">{product.name}</strong>
              <span className="text-xs text-slate-400">{product.sku}</span>
            </div>
            {product.brand || product.variant ? (
              <p className="mt-1 text-xs text-slate-500">
                {[product.brand, product.variant].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">
              {product.tracking_mode === "individual"
                ? t("values.individual")
                : t("values.quantity")}
              {product.barcode ? ` · ${product.barcode}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <strong
                className="text-base"
                style={{ color: "var(--workspace-primary, var(--brand-navy))" }}
              >
                {displayQuantity(product.current_quantity, product.unit)}
              </strong>
              <span className="ml-1 text-xs text-slate-500">{product.unit}</span>
            </div>
            <Tooltip content={t("tooltips.correctItem")}>
              <Button
                onClick={() => toggleEdit(product)}
                size="small"
                type="button"
                variant="ghost"
              >
                {t("actions.correctItem")}
                {expanded ? (
                  <ChevronUp className="ml-1 size-4" />
                ) : (
                  <ChevronDown className="ml-1 size-4" />
                )}
              </Button>
            </Tooltip>
          </div>
        </div>

        {expanded ? (
          <form
            className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800"
            onSubmit={(event) => void save(event, product)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={field}>
                {t("fields.name")}
                <Input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                />
              </label>
              <label className={field}>
                {t("fields.brandOptional")}
                <Input
                  value={draft.brand}
                  onChange={(event) =>
                    setDraft({ ...draft, brand: event.target.value })
                  }
                />
              </label>
              <label className={field}>
                {t("fields.variant")}
                <Input
                  value={draft.variant}
                  onChange={(event) =>
                    setDraft({ ...draft, variant: event.target.value })
                  }
                />
              </label>
              <label className={field}>
                {t("fields.barcode")}
                <Input
                  value={draft.barcode}
                  onChange={(event) =>
                    setDraft({ ...draft, barcode: event.target.value })
                  }
                />
              </label>
              <label className={field}>
                <span className="flex items-center gap-1">
                  {t("fields.unit")}
                  <Tooltip content={t("tooltips.unitCorrection")}>
                    <span
                      className="inline-flex cursor-help text-slate-400"
                      tabIndex={0}
                    >
                      <CircleHelp className="size-3.5" />
                    </span>
                  </Tooltip>
                </span>
                <Select
                  value={draft.unit}
                  onChange={(event) =>
                    setDraft({ ...draft, unit: event.target.value })
                  }
                >
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {t(`units.${unit}`)}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} size="small" type="submit">
                {t("actions.saveCorrection")}
              </Button>
              <Button
                onClick={() => {
                  setEditingId("");
                  setDraft(null);
                }}
                size="small"
                type="button"
                variant="ghost"
              >
                {t("actions.cancel")}
              </Button>
            </div>
          </form>
        ) : null}
      </article>
    );
  };

  return (
    <section className="w-full space-y-4 px-2 py-4 sm:px-3 lg:px-4">
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <p
          className="text-xs font-bold uppercase tracking-[0.18em]"
          style={{ color: "var(--workspace-secondary, var(--brand-orange))" }}
        >
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
          {t("views.products.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          {t("views.products.description")}
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="font-semibold">{t("catalog")}</h2>
          {emptyProducts.length ? (
            <Tooltip content={t("tooltips.reviewEmptyItems")}>
              <Button
                onClick={() => setShowEmpty((current) => !current)}
                size="small"
                type="button"
                variant="ghost"
              >
                {t("actions.reviewEmptyItems", { count: emptyProducts.length })}
                {showEmpty ? (
                  <ChevronUp className="ml-1 size-4" />
                ) : (
                  <ChevronDown className="ml-1 size-4" />
                )}
              </Button>
            </Tooltip>
          ) : null}
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {availableProducts.map(renderProduct)}
          {!availableProducts.length ? (
            <p className="p-4 text-sm text-slate-500">{t("empty.availableItems")}</p>
          ) : null}
        </div>

        {showEmpty && emptyProducts.length ? (
          <div className="border-t border-slate-200 dark:border-slate-800">
            <div className="px-4 py-3 text-xs font-semibold text-slate-500">
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
                    <p className="mt-1 text-xs text-slate-500">{product.sku}</p>
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
      </div>
    </section>
  );
}

export { AvailableItemsWorkspace };
