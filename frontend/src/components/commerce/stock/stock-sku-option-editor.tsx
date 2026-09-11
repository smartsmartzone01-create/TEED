"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import type { ProductVariantOption } from "@/types/commerce/catalog";

const knownOptionTypes = [
  "color",
  "storage",
  "capacity",
  "size",
  "ram",
  "screen_size",
  "pack_size",
  "material",
  "style",
  "model",
  "weight",
  "length",
  "volume",
  "voltage",
  "flavor",
] as const;
const knownOptionKeys = new Set<string>(knownOptionTypes);
const MAX_OPTIONS = 12;

type StockSkuOptionDraft = {
  type: string;
  label: string;
  value: string;
};

const emptyStockSkuOptionDraft = (): StockSkuOptionDraft => ({
  type: "",
  label: "",
  value: "",
});

function customOptionKey(label: string) {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function stockSkuOptionsFromDrafts(
  drafts: StockSkuOptionDraft[],
): ProductVariantOption[] | null {
  if (!drafts.length) return null;
  const options: ProductVariantOption[] = [];
  const keys = new Set<string>();

  for (const draft of drafts) {
    const value = draft.value.trim();
    const label = draft.label.trim();
    const key = draft.type === "custom" ? customOptionKey(label) : draft.type.trim();
    if (!key || !label || !value || keys.has(key)) return null;
    keys.add(key);
    options.push({ key, label, value });
  }
  return options;
}

function stockSkuOptionDraftsFromOptions(
  options: ProductVariantOption[],
): StockSkuOptionDraft[] {
  if (!options.length) return [emptyStockSkuOptionDraft()];
  return options.map((option) => ({
    type: knownOptionKeys.has(option.key) ? option.key : "custom",
    label: option.label,
    value: "",
  }));
}

function StockSkuOptionEditor({
  value,
  onChange,
}: {
  value: StockSkuOptionDraft[];
  onChange: (value: StockSkuOptionDraft[]) => void;
}) {
  const t = useTranslations("CommerceStockV2");

  const update = (index: number, patch: Partial<StockSkuOptionDraft>) => {
    onChange(
      value.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const remove = (index: number) => {
    const next = value.filter((_, itemIndex) => itemIndex !== index);
    onChange(next.length ? next : [emptyStockSkuOptionDraft()]);
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {t("fields.varietyDetails")}
        </span>
        <span className="text-xs font-normal text-slate-500">
          {t("fieldHelp.varietyDetails")}
        </span>
      </div>

      <div className="grid gap-3">
        {value.map((option, index) => {
          const custom = option.type === "custom";
          return (
            <div
              className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]"
              key={`sku-option-${index}`}
            >
              <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("fields.detailType")}
                <Select
                  value={option.type}
                  onChange={(event) => {
                    const type = event.target.value;
                    update(index, {
                      type,
                      label:
                        type && type !== "custom"
                          ? t(`optionTypes.${type}`)
                          : "",
                    });
                  }}
                >
                  <option value="">{t("values.chooseDetail")}</option>
                  {knownOptionTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`optionTypes.${type}`)}
                    </option>
                  ))}
                  <option value="custom">{t("optionTypes.custom")}</option>
                </Select>
              </label>

              <div className="grid min-w-0 gap-2">
                {custom ? (
                  <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("fields.customDetail")}
                    <Input
                      placeholder={t("placeholders.customDetail")}
                      value={option.label}
                      onChange={(event) => update(index, { label: event.target.value })}
                    />
                  </label>
                ) : null}
                <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("fields.detailValue")}
                  <Input
                    placeholder={t("placeholders.detailValue")}
                    value={option.value}
                    onChange={(event) => update(index, { value: event.target.value })}
                  />
                </label>
              </div>

              <button
                aria-label={t("actions.removeDetail")}
                className="inline-flex size-9 shrink-0 items-center justify-center self-end rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                onClick={() => remove(index)}
                type="button"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
      </div>

      {value.length < MAX_OPTIONS ? (
        <Button
          className="w-fit"
          onClick={() => onChange([...value, emptyStockSkuOptionDraft()])}
          size="small"
          type="button"
          variant="ghost"
        >
          <Plus className="size-3.5" />
          {t("actions.addDetail")}
        </Button>
      ) : null}
    </div>
  );
}

export {
  StockSkuOptionEditor,
  emptyStockSkuOptionDraft,
  stockSkuOptionDraftsFromOptions,
  stockSkuOptionsFromDrafts,
};
export type { StockSkuOptionDraft };
