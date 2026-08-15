"use client";

import { ChevronDown, ChevronUp, CircleHelp } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { useNotification } from "@/providers/global/notification-provider";
import { commercePatch } from "@/services/commerce/commerce";
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

type ReceiptLine = {
  id: string;
  product?: string;
  product_name: string;
  product_sku: string;
  tracking_mode: string;
  quantity_received: string;
  quantity_remaining: string;
  received_unit: string;
  conversion_to_base: string;
};

type Receipt = {
  id: string;
  reference: string;
  status: string;
  correction_open?: boolean;
  correction_deadline?: string | null;
  lines: ReceiptLine[];
};

type Draft = {
  lineId: string;
  productId?: string;
  name: string;
  brand: string;
  variant: string;
  barcode: string;
  quantity: string;
  unit: string;
};

type Props = {
  accessToken: string | null;
  businessId: string;
  products: Product[];
  receipt: Receipt;
  submit: (
    operation: () => Promise<unknown>,
    message: string,
  ) => Promise<unknown | null>;
};

function cleanNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(
    value,
  );
}

function StockReceiptCorrectionDropdown({
  accessToken,
  businessId,
  products,
  receipt,
  submit,
}: Props) {
  const t = useTranslations("Commerce");
  const { notify } = useNotification();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const line = useMemo(
    () => receipt.lines.find((item) => item.id === draft?.lineId) ?? null,
    [draft?.lineId, receipt.lines],
  );

  const toggle = () => {
    if (!receipt.correction_open) {
      notify({ message: t("messages.correctionClosed"), tone: "warning" });
      return;
    }
    setOpen((current) => !current);
    setDraft(null);
  };

  const chooseLine = (lineId: string) => {
    const selected = receipt.lines.find((item) => item.id === lineId);
    if (!selected) {
      setDraft(null);
      return;
    }

    const product = products.find(
      (item) =>
        item.id === selected.product || item.sku === selected.product_sku,
    );
    const conversion = Number(selected.conversion_to_base || "1") || 1;
    setDraft({
      lineId: selected.id,
      productId: selected.product,
      name: product?.name ?? selected.product_name,
      brand: product?.brand ?? "",
      variant: product?.variant ?? "",
      barcode: product?.barcode ?? "",
      quantity: String(Number(selected.quantity_received) / conversion),
      unit: selected.received_unit || product?.unit || "piece",
    });
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !draft || !line) return;

    const quantity = Number(draft.quantity);
    if (!draft.name.trim()) {
      notify({ message: t("validation.itemNameRequired"), tone: "error" });
      return;
    }
    if (!draft.unit.trim()) {
      notify({ message: t("validation.unitRequired"), tone: "error" });
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      notify({ message: t("validation.quantityPositive"), tone: "error" });
      return;
    }
    if (countableUnits.has(draft.unit) && !Number.isInteger(quantity)) {
      notify({
        message: t("validation.wholeQuantity", { unit: draft.unit }),
        tone: "error",
      });
      return;
    }

    const saved = await submit(
      () =>
        commercePatch(
          businessId,
          accessToken,
          `stock-receipts/${receipt.id}`,
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
        ),
      t("success.stockCorrected"),
    );

    if (saved) {
      setDraft(null);
      setOpen(false);
    }
  };

  return (
    <div className="sm:col-span-2">
      <Tooltip
        content={
          receipt.correction_open
            ? t("tooltips.correctStock")
            : t("messages.correctionClosed")
        }
      >
        <Button
          onClick={toggle}
          size="small"
          type="button"
          variant="outline"
        >
          {t("actions.correctStock")}
          {open ? (
            <ChevronUp className="ml-1 size-4" />
          ) : (
            <ChevronDown className="ml-1 size-4" />
          )}
        </Button>
      </Tooltip>

      {open ? (
        <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          <Select
            aria-label={t("fields.product")}
            onChange={(event) => chooseLine(event.target.value)}
            value={draft?.lineId ?? ""}
          >
            <option value="">{t("fields.product")}</option>
            {receipt.lines.map((item) => {
              const conversion = Number(item.conversion_to_base || "1") || 1;
              const remaining = Number(item.quantity_remaining) / conversion;
              return (
                <option key={item.id} value={item.id}>
                  {item.product_name} · {cleanNumber(remaining)} {item.received_unit}
                </option>
              );
            })}
          </Select>

          {draft ? (
            <form className="grid gap-3" onSubmit={(event) => void save(event)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={field}>
                  {t("fields.name")}
                  <Input
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                    value={draft.name}
                  />
                </label>
                <label className={field}>
                  {t("fields.brandOptional")}
                  <Input
                    onChange={(event) =>
                      setDraft({ ...draft, brand: event.target.value })
                    }
                    value={draft.brand}
                  />
                </label>
                <label className={field}>
                  {t("fields.variant")}
                  <Input
                    onChange={(event) =>
                      setDraft({ ...draft, variant: event.target.value })
                    }
                    value={draft.variant}
                  />
                </label>
                <label className={field}>
                  {t("fields.barcode")}
                  <Input
                    onChange={(event) =>
                      setDraft({ ...draft, barcode: event.target.value })
                    }
                    value={draft.barcode}
                  />
                </label>
                <label className={field}>
                  {t("fields.quantity")}
                  <Input
                    min="0.001"
                    onChange={(event) =>
                      setDraft({ ...draft, quantity: event.target.value })
                    }
                    step="0.001"
                    type="number"
                    value={draft.quantity}
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
                    onChange={(event) =>
                      setDraft({ ...draft, unit: event.target.value })
                    }
                    value={draft.unit}
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
                <Button size="small" type="submit">
                  {t("actions.saveCorrection")}
                </Button>
                <Button
                  onClick={() => setDraft(null)}
                  size="small"
                  type="button"
                  variant="ghost"
                >
                  {t("actions.cancel")}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { StockReceiptCorrectionDropdown };
