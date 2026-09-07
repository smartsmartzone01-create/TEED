"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { StockEditControl } from "@/components/commerce/stock/stock-edit-control";
import { StockProductSummary, StockSummaryActions } from "@/components/commerce/stock/stock-summary";
import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { getProducts } from "@/services/commerce/catalog";
import {
  archiveDraftStockReceipt,
  correctStockReceipt,
  createStockReceipt,
  getStockReceipts,
} from "@/services/commerce/inventory";
import { isRequestCancelled } from "@/services/global/api-client";
import type { Product } from "@/types/commerce/catalog";
import type {
  StockCostMode,
  StockReceipt,
  StockTrackingMode,
  StockUnitDefinition,
} from "@/types/commerce/inventory";

const panel =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950";
const inset =
  "rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40";
const field = "grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300";
const units = [
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
const countableUnits = new Set(units.slice(0, 14));
const identifierKinds = [
  "imei",
  "serial",
  "chassis",
  "barcode",
  "engine",
  "registration",
] as const;

type Step = "stock" | "catalog" | "record" | "review";
type IdentifierKind = (typeof identifierKinds)[number];

type PreparedProduct = {
  key: string;
  name: string;
  familyName: string;
  brand: string;
  variant: string;
  unit: string;
  trackingMode: StockTrackingMode;
};

type ProductChoice = PreparedProduct & {
  sku: string;
  existingId: string | null;
};

type UnitDraft = {
  modelName: string;
  brand: string;
  color: string;
  capacity: string;
  identifierKind: IdentifierKind;
  identifierValue: string;
};

type LineDraft = {
  productKey: string;
  quantity: string;
  receivedUnit: string;
  conversionToBase: string;
  costMode: StockCostMode;
  costValue: string;
  trackedUnits: UnitDraft[];
};

type CorrectionDraft = {
  receipt: StockReceipt;
  name: string;
  supplier: string;
  expenses: string;
  lines: Array<{
    id: string;
    name: string;
    quantity: string;
    receivedUnit: string;
    conversionToBase: string;
    cost: string;
  }>;
};

const localNow = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const emptyUnit = (): UnitDraft => ({
  modelName: "",
  brand: "",
  color: "",
  capacity: "",
  identifierKind: "serial",
  identifierValue: "",
});

const normalizedCost = (mode: StockCostMode, value: string, quantity: string) => {
  if (!value) return null;
  const cost = Number(value);
  const amount = Number(quantity);
  if (!Number.isFinite(cost) || cost < 0) return null;
  if (mode === "total") {
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return (cost / amount).toFixed(2);
  }
  return cost.toFixed(2);
};

const lineCount = (line: LineDraft) => {
  const quantity = Number(line.quantity);
  const conversion = Number(line.conversionToBase || "1");
  const count = quantity * conversion;
  return Number.isFinite(count) && count > 0 && Number.isInteger(count) ? count : 0;
};

const newLineForChoice = (choice: Pick<ProductChoice, "key" | "unit" | "trackingMode">): LineDraft => ({
  productKey: choice.key,
  quantity: "1",
  receivedUnit: choice.unit || "piece",
  conversionToBase: "1",
  costMode: "per_unit",
  costValue: "",
  trackedUnits: choice.trackingMode === "individual" ? [emptyUnit()] : [],
});

function StockProgressiveWorkspaceV2({
  businessId,
  onStageChange,
}: {
  businessId: string;
  onStageChange?: (stage: 0 | 1 | 2 | 3) => void;
}) {
  const t = useTranslations("CommerceStockV2");
  const stockT = useTranslations("CommerceStock");
  const commerceT = useTranslations("Commerce");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const sequence = useRef(0);

  const [step, setStep] = useState<Step>("stock");
  const [stockName, setStockName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [receivedAt, setReceivedAt] = useState(localNow());
  const [stockExpenses, setStockExpenses] = useState("0");
  const [products, setProducts] = useState<Product[]>([]);
  const [unitDefinitions, setUnitDefinitions] = useState<StockUnitDefinition[]>([]);
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [preparedProducts, setPreparedProducts] = useState<PreparedProduct[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [existingSelection, setExistingSelection] = useState("");
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [preparedDraft, setPreparedDraft] = useState<PreparedProduct>({
    key: "",
    name: "",
    familyName: "",
    brand: "",
    variant: "",
    unit: "piece",
    trackingMode: "quantity",
  });
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [lateDeliveryParent, setLateDeliveryParent] = useState<StockReceipt | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<StockReceipt | null>(null);
  const [correction, setCorrection] = useState<CorrectionDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const moveTo = (next: Step) => {
    setStep(next);
    onStageChange?.({ stock: 0, catalog: 1, record: 2, review: 3 }[next] as 0 | 1 | 2 | 3);
  };

  useEffect(() => {
    onStageChange?.(0);
  }, [onStageChange]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      try {
        const [productResponse, stockResponse] = await Promise.all([
          getProducts(businessId, accessToken, signal),
          getStockReceipts(businessId, accessToken, signal),
        ]);
        setProducts(productResponse.data?.products ?? []);
        const stockData = stockResponse.data as {
          receipts?: StockReceipt[];
          units?: StockUnitDefinition[];
        } | null;
        setReceipts(stockData?.receipts ?? []);
        setUnitDefinitions(stockData?.units ?? []);
      } catch (reason) {
        if (!isRequestCancelled(reason)) {
          notify({
            message: reason instanceof Error ? reason.message : commerceT("errors.load"),
            tone: "error",
          });
        }
      }
    },
    [accessToken, businessId, commerceT, notify],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const choices = useMemo<ProductChoice[]>(
    () => [
      ...products
        .filter((product) => product.is_active)
        .map((product) => ({
          key: `existing:${product.id}`,
          existingId: product.id,
          name: product.name,
          familyName: product.family_name ?? "",
          sku: product.sku,
          brand: product.brand,
          variant: product.variant,
          unit: product.unit,
          trackingMode: product.tracking_mode,
        })),
      ...preparedProducts.map((product) => ({
        ...product,
        existingId: null,
        sku: stockT("values.pendingSku"),
      })),
    ],
    [preparedProducts, products, stockT],
  );

  const choiceFor = (key: string) => choices.find((choice) => choice.key === key);
  const selectedChoices = selectedKeys
    .map((key) => choiceFor(key))
    .filter((choice): choice is ProductChoice => Boolean(choice));

  const availableUnits = useMemo(
    () => [
      ...units.map((unit) => ({ key: unit, label: commerceT(`units.${unit}`) })),
      ...unitDefinitions.map((unit) => ({ key: unit.name, label: unit.name })),
    ],
    [commerceT, unitDefinitions],
  );

  const ensureLines = (keys: string[]) => {
    setLines((current) =>
      keys.map((key) => {
        const existing = current.find((line) => line.productKey === key);
        if (existing) return existing;
        const choice = choiceFor(key);
        return choice
          ? newLineForChoice(choice)
          : {
              productKey: key,
              quantity: "1",
              receivedUnit: "piece",
              conversionToBase: "1",
              costMode: "per_unit",
              costValue: "",
              trackedUnits: [],
            };
      }),
    );
  };

  const commitStock = (event: FormEvent) => {
    event.preventDefault();
    if (!stockName.trim()) {
      notify({ message: t("validation.stockName"), tone: "error" });
      return;
    }
    if (!receivedAt) {
      notify({ message: stockT("validation.dateReceived"), tone: "error" });
      return;
    }
    const expenses = Number(stockExpenses || 0);
    if (!Number.isFinite(expenses) || expenses < 0) {
      notify({ message: stockT("validation.stockExpenses"), tone: "error" });
      return;
    }
    moveTo("catalog");
  };

  const addExistingProduct = () => {
    if (!existingSelection || selectedKeys.includes(existingSelection)) return;
    const keys = [...selectedKeys, existingSelection];
    setSelectedKeys(keys);
    ensureLines(keys);
    setExistingSelection("");
  };

  const savePreparedProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!preparedDraft.name.trim()) {
      notify({ message: stockT("validation.productName"), tone: "error" });
      return;
    }
    const key = preparedDraft.key || `new-product-${++sequence.current}`;
    const product: PreparedProduct = {
      ...preparedDraft,
      key,
      name: preparedDraft.name.trim(),
      familyName: preparedDraft.familyName.trim(),
      brand: preparedDraft.brand.trim(),
      variant: preparedDraft.variant.trim(),
      unit: preparedDraft.unit.trim() || "piece",
    };
    setPreparedProducts((current) => [...current.filter((item) => item.key !== key), product]);
    const keys = selectedKeys.includes(key) ? selectedKeys : [...selectedKeys, key];
    setSelectedKeys(keys);
    setLines((current) => {
      const existing = current.find((line) => line.productKey === key);
      if (existing) return current;
      return [
        ...current,
        newLineForChoice({
          key,
          unit: product.unit,
          trackingMode: product.trackingMode,
        }),
      ];
    });
    setPreparedDraft({
      key: "",
      name: "",
      familyName: "",
      brand: "",
      variant: "",
      unit: "piece",
      trackingMode: "quantity",
    });
    setNewProductOpen(false);
  };

  const removeSelected = (key: string) => {
    setSelectedKeys((current) => current.filter((item) => item !== key));
    setLines((current) => current.filter((line) => line.productKey !== key));
  };

  const continueToRecording = () => {
    if (!selectedKeys.length) {
      notify({ message: t("validation.catalogRequired"), tone: "error" });
      return;
    }
    ensureLines(selectedKeys);
    moveTo("record");
  };

  const updateLine = (key: string, values: Partial<LineDraft>) => {
    setLines((current) =>
      current.map((line) => {
        if (line.productKey !== key) return line;
        const next = { ...line, ...values };
        const choice = choiceFor(key);
        if (choice?.trackingMode !== "individual") return { ...next, trackedUnits: [] };
        const count = lineCount(next);
        const trackedUnits = Array.from({ length: count }, (_, index) =>
          next.trackedUnits[index] ?? emptyUnit(),
        );
        return { ...next, trackedUnits };
      }),
    );
  };

  const updateTrackedUnit = (key: string, index: number, values: Partial<UnitDraft>) => {
    setLines((current) =>
      current.map((line) =>
        line.productKey !== key
          ? line
          : {
              ...line,
              trackedUnits: line.trackedUnits.map((unit, unitIndex) =>
                unitIndex === index ? { ...unit, ...values } : unit,
              ),
            },
      ),
    );
  };

  const validateLines = (status: "draft" | "received") => {
    for (const line of lines) {
      const choice = choiceFor(line.productKey);
      if (!choice) return t("validation.catalogRequired");
      const quantity = Number(line.quantity);
      const conversion = Number(line.conversionToBase || "1");
      if (!Number.isFinite(quantity) || quantity <= 0) return stockT("validation.quantityPositive");
      if (countableUnits.has(line.receivedUnit as (typeof units)[number]) && !Number.isInteger(quantity)) {
        return stockT("validation.wholeQuantity", { unit: line.receivedUnit });
      }
      if (!Number.isFinite(conversion) || conversion <= 0) return t("validation.conversionPositive");
      if (line.costValue && normalizedCost(line.costMode, line.costValue, line.quantity) == null) {
        return stockT("validation.buyingCost");
      }
      if (choice.trackingMode === "individual") {
        const count = quantity * conversion;
        if (!Number.isInteger(count)) return stockT("validation.individualWhole");
        if (status === "received" && line.trackedUnits.length !== count) {
          return stockT("validation.individualCount", { count });
        }
      }
    }
    return "";
  };

  const buildPayload = (status: "draft" | "received") => ({
    name: stockName.trim(),
    status,
    ...(lateDeliveryParent ? { parent_receipt_id: lateDeliveryParent.id } : {}),
    supplier_name: supplier.trim(),
    additional_cost: stockExpenses || "0",
    ...(status === "received" ? { received_at: new Date(receivedAt).toISOString() } : {}),
    catalog_items: selectedChoices.map((choice) =>
      choice.existingId
        ? { key: choice.key, product_id: choice.existingId }
        : {
            key: choice.key,
            ...(choice.familyName ? { family_name: choice.familyName } : {}),
            item: {
              name: choice.name,
              brand: choice.brand,
              variant: choice.variant,
              unit: choice.unit,
              tracking_mode: choice.trackingMode,
            },
          },
    ),
    lines: lines.map((line) => {
      const choice = choiceFor(line.productKey)!;
      return {
        catalog_key: line.productKey,
        quantity_received: line.quantity,
        received_unit: line.receivedUnit,
        conversion_to_base: line.conversionToBase || "1",
        ...(line.costValue
          ? { unit_cost: normalizedCost(line.costMode, line.costValue, line.quantity) }
          : {}),
        tracked_units:
          choice.trackingMode === "individual"
            ? line.trackedUnits.map((unit) => ({
                model_name: unit.modelName.trim(),
                brand: unit.brand.trim(),
                color: unit.color.trim(),
                capacity: unit.capacity.trim(),
                identifiers: unit.identifierValue.trim()
                  ? [{ kind: unit.identifierKind, value: unit.identifierValue.trim() }]
                  : [],
              }))
            : [],
      };
    }),
  });

  const saveStock = async (status: "draft" | "received") => {
    if (!accessToken) return;
    const validation = validateLines(status);
    if (validation) {
      notify({ message: validation, tone: "error" });
      return;
    }
    setBusy(true);
    try {
      const response = await createStockReceipt(businessId, accessToken, buildPayload(status));
      const receipt = response.data as StockReceipt | null;
      if (receipt) setSavedReceipt(receipt);
      notify({
        message: status === "draft" ? stockT("success.draftSaved") : commerceT("success.stock"),
        tone: "success",
      });
      await load();
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : commerceT("errors.save"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const resetRecorder = (parent?: StockReceipt) => {
    setStockName(parent?.name ?? "");
    setSupplier(parent?.supplier_name ?? "");
    setReceivedAt(localNow());
    setStockExpenses("0");
    setPreparedProducts([]);
    setSelectedKeys([]);
    setExistingSelection("");
    setLines([]);
    setSavedReceipt(null);
    setLateDeliveryParent(parent ?? null);
    moveTo("stock");
  };

  const beginCorrection = (receipt: StockReceipt) => {
    setCorrection({
      receipt,
      name: receipt.name,
      supplier: receipt.supplier_name,
      expenses: receipt.additional_cost,
      lines: receipt.lines.map((line) => ({
        id: line.id,
        name: line.product_name,
        quantity: String(Number(line.quantity_received) / Number(line.conversion_to_base || "1")),
        receivedUnit: line.received_unit,
        conversionToBase: line.conversion_to_base || "1",
        cost: line.received_unit_cost ?? "",
      })),
    });
  };

  const saveCorrection = async () => {
    if (!accessToken || !correction) return;
    setBusy(true);
    try {
      await correctStockReceipt(businessId, correction.receipt.id, accessToken, {
        name: correction.name.trim(),
        supplier_name: correction.supplier.trim(),
        additional_cost: correction.expenses || "0",
        lines: correction.lines.map((line) => ({
          id: line.id,
          quantity: line.quantity,
          unit: line.receivedUnit,
          unit_cost: line.cost || null,
        })),
      });
      setCorrection(null);
      notify({ message: commerceT("success.stockCorrected"), tone: "success" });
      await load();
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : commerceT("errors.save"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const archiveDraft = async (receipt: StockReceipt) => {
    if (!accessToken || receipt.status !== "draft") return;
    if (!window.confirm(commerceT("messages.archiveDraftConfirm"))) return;
    try {
      await archiveDraftStockReceipt(businessId, receipt.id, accessToken);
      notify({ message: commerceT("success.draftArchived"), tone: "success" });
      await load();
    } catch (reason) {
      notify({ message: reason instanceof Error ? reason.message : commerceT("errors.save"), tone: "error" });
    }
  };

  let editor: React.ReactNode;

  if (step === "stock") {
    editor = (
      <form className="grid gap-4" onSubmit={commitStock}>
        <div>
          <h2 className="text-lg font-bold">{lateDeliveryParent ? stockT("steps.lateDelivery") : t("steps.stock")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("help.stock")}</p>
        </div>
        <label className={field}>
          {t("fields.stockName")}
          <Input autoFocus value={stockName} onChange={(event) => setStockName(event.target.value)} />
        </label>
        <label className={field}>
          {stockT("fields.supplier")}
          <Input value={supplier} onChange={(event) => setSupplier(event.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={field}>
            {stockT("fields.dateReceived")}
            <Input required type="datetime-local" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} />
          </label>
          <label className={field}>
            {stockT("fields.stockExpenses")}
            <Input min="0" step="0.01" type="number" value={stockExpenses} onChange={(event) => setStockExpenses(event.target.value)} />
          </label>
        </div>
        <Button className="w-fit" type="submit">{stockT("actions.continue")}</Button>
      </form>
    );
  } else if (step === "catalog") {
    editor = (
      <div className="grid gap-4">
        <div>
          <h2 className="text-lg font-bold">{t("steps.catalog")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("help.catalog")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Select value={existingSelection} onChange={(event) => setExistingSelection(event.target.value)}>
            <option value="">{stockT("values.chooseProduct")}</option>
            {choices.filter((choice) => choice.existingId && !selectedKeys.includes(choice.key)).map((choice) => (
              <option key={choice.key} value={choice.key}>
                {choice.name} · {choice.sku} · {choice.unit} · {t(`tracking.${choice.trackingMode}`)}
              </option>
            ))}
          </Select>
          <Button disabled={!existingSelection} type="button" variant="outline" onClick={addExistingProduct}>
            <Plus className="size-4" /> {t("actions.addExisting")}
          </Button>
        </div>
        {selectedChoices.length ? (
          <div className={`${inset} divide-y divide-slate-200 px-3 dark:divide-slate-800`}>
            {selectedChoices.map((choice) => (
              <div className="flex items-center justify-between gap-3 py-2" key={choice.key}>
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{choice.name}</strong>
                  <p className="truncate text-xs text-slate-500">
                    {[choice.sku, choice.familyName, choice.brand, choice.variant, choice.unit, t(`tracking.${choice.trackingMode}`)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button aria-label={t("actions.remove")} size="small" type="button" variant="ghost" onClick={() => removeSelected(choice.key)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        {newProductOpen ? (
          <form className={`${inset} grid gap-3 p-3`} onSubmit={savePreparedProduct}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={field}>{stockT("fields.productName")}<Input value={preparedDraft.name} onChange={(event) => setPreparedDraft({ ...preparedDraft, name: event.target.value })} /></label>
              <label className={field}>{t("fields.productFamily")}<Input value={preparedDraft.familyName} onChange={(event) => setPreparedDraft({ ...preparedDraft, familyName: event.target.value })} /></label>
              <label className={field}>{commerceT("fields.brandOptional")}<Input value={preparedDraft.brand} onChange={(event) => setPreparedDraft({ ...preparedDraft, brand: event.target.value })} /></label>
              <label className={field}>{commerceT("fields.variant")}<Input value={preparedDraft.variant} onChange={(event) => setPreparedDraft({ ...preparedDraft, variant: event.target.value })} /></label>
              <label className={field}>{stockT("fields.unit")}<Select value={preparedDraft.unit} onChange={(event) => setPreparedDraft({ ...preparedDraft, unit: event.target.value })}>{availableUnits.map((unit) => <option key={unit.key} value={unit.key}>{unit.label}</option>)}</Select></label>
              <label className={field}>{t("fields.trackingMode")}<Select value={preparedDraft.trackingMode} onChange={(event) => setPreparedDraft({ ...preparedDraft, trackingMode: event.target.value as StockTrackingMode })}><option value="quantity">{t("tracking.quantity")}</option><option value="individual">{t("tracking.individual")}</option></Select></label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">{stockT("actions.enterProduct")}</Button>
              <Button type="button" variant="ghost" onClick={() => setNewProductOpen(false)}>{commerceT("actions.cancel")}</Button>
            </div>
          </form>
        ) : (
          <Button className="w-fit" type="button" variant="outline" onClick={() => setNewProductOpen(true)}>
            <Plus className="size-4" /> {stockT("values.newProduct")}
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => moveTo("stock")}>{t("actions.back")}</Button>
          <Button disabled={!selectedKeys.length} type="button" onClick={continueToRecording}>{stockT("actions.continue")}</Button>
        </div>
      </div>
    );
  } else if (step === "record") {
    editor = (
      <div className="grid gap-4">
        <div><h2 className="text-lg font-bold">{t("steps.record")}</h2><p className="mt-1 text-sm text-slate-500">{t("help.record")}</p></div>
        {lines.map((line) => {
          const choice = choiceFor(line.productKey)!;
          const count = lineCount(line);
          return (
            <div className={`${inset} grid gap-3 p-3`} key={line.productKey}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><strong>{choice.name}</strong><p className="text-xs text-slate-500">{choice.sku} · {choice.unit} · {t(`tracking.${choice.trackingMode}`)}</p></div>
                <Button size="small" type="button" variant="ghost" onClick={() => moveTo("catalog")}><Pencil className="size-3.5" /> {stockT("actions.edit")}</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className={field}>{stockT("fields.quantity")}<Input min="0.001" step="0.001" type="number" value={line.quantity} onChange={(event) => updateLine(line.productKey, { quantity: event.target.value })} /></label>
                <label className={field}>{t("fields.receivedUnit")}<Select value={line.receivedUnit} onChange={(event) => updateLine(line.productKey, { receivedUnit: event.target.value })}>{availableUnits.map((unit) => <option key={unit.key} value={unit.key}>{unit.label}</option>)}</Select></label>
                <label className={field}>{t("fields.baseUnit")}<Input disabled value={choice.unit} /></label>
                <label className={field}>{t("fields.conversion")}<Input min="0.000001" step="0.000001" type="number" value={line.conversionToBase} onChange={(event) => updateLine(line.productKey, { conversionToBase: event.target.value })} /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
                <label className={field}>{stockT("costMode.label")}<Select value={line.costMode} onChange={(event) => updateLine(line.productKey, { costMode: event.target.value as StockCostMode })}><option value="per_unit">{stockT("costMode.perUnit")}</option><option value="total">{stockT("costMode.total")}</option></Select></label>
                <label className={field}>{line.costMode === "total" ? stockT("fields.totalBuyingCost") : stockT("fields.costPerUnit")}<Input min="0" step="0.01" type="number" value={line.costValue} onChange={(event) => updateLine(line.productKey, { costValue: event.target.value })} /></label>
              </div>
              {choice.trackingMode === "individual" ? (
                <div className="grid gap-3">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{t("individualProgress", { count })}</p>
                  {line.trackedUnits.map((unit, index) => (
                    <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2 lg:grid-cols-3" key={index}>
                      <strong className="text-xs sm:col-span-2 lg:col-span-3">{t("individualItem", { number: index + 1 })}</strong>
                      <label className={field}>{commerceT("fields.modelName")}<Input value={unit.modelName} onChange={(event) => updateTrackedUnit(line.productKey, index, { modelName: event.target.value })} /></label>
                      <label className={field}>{commerceT("fields.brand")}<Input value={unit.brand} onChange={(event) => updateTrackedUnit(line.productKey, index, { brand: event.target.value })} /></label>
                      <label className={field}>{commerceT("fields.color")}<Input value={unit.color} onChange={(event) => updateTrackedUnit(line.productKey, index, { color: event.target.value })} /></label>
                      <label className={field}>{commerceT("fields.capacity")}<Input value={unit.capacity} onChange={(event) => updateTrackedUnit(line.productKey, index, { capacity: event.target.value })} /></label>
                      <label className={field}>{stockT("fields.identifierType")}<Select value={unit.identifierKind} onChange={(event) => updateTrackedUnit(line.productKey, index, { identifierKind: event.target.value as IdentifierKind })}>{identifierKinds.map((kind) => <option key={kind} value={kind}>{commerceT(`identifierTypes.${kind}`)}</option>)}</Select></label>
                      <label className={field}>{stockT("fields.identifierValue")}<Input value={unit.identifierValue} onChange={(event) => updateTrackedUnit(line.productKey, index, { identifierValue: event.target.value })} /></label>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" onClick={() => moveTo("catalog")}>{t("actions.back")}</Button><Button type="button" onClick={() => { const validation = validateLines("draft"); if (validation) notify({ message: validation, tone: "error" }); else moveTo("review"); }}>{stockT("actions.review")}</Button></div>
      </div>
    );
  } else {
    editor = (
      <div className="grid gap-4">
        <div><h2 className="text-lg font-bold">{t("steps.review")}</h2><p className="mt-1 text-sm text-slate-500">{t("help.review")}</p></div>
        <div className={`${inset} grid gap-2 p-3 text-sm`}>
          <div className="flex justify-between gap-3"><span>{t("fields.stockName")}</span><strong>{stockName}</strong></div>
          <div className="flex justify-between gap-3"><span>{stockT("fields.totalProducts")}</span><strong>{lines.length}</strong></div>
          <div className="flex justify-between gap-3"><span>{stockT("fields.stockExpenses")}</span><strong>{stockExpenses || "0"}</strong></div>
          {lines.map((line) => { const choice = choiceFor(line.productKey)!; return <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-800" key={line.productKey}><span>{choice.name}</span><strong>{line.quantity} {line.receivedUnit} · {t(`tracking.${choice.trackingMode}`)}</strong></div>; })}
        </div>
        <div className="grid gap-2 sm:grid-cols-2"><Button disabled={busy} type="button" variant="outline" onClick={() => void saveStock("draft")}>{stockT("actions.saveDraft")}</Button><Button disabled={busy} type="button" onClick={() => void saveStock("received")}>{busy ? stockT("actions.saving") : stockT("actions.finishSave")}</Button></div>
        <Button className="w-fit" type="button" variant="ghost" onClick={() => moveTo("record")}>{stockT("actions.backToRecording")}</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className={panel}>
        {savedReceipt ? (
          <div className="grid gap-4 p-4">
            <div><h2 className="text-lg font-bold">{stockT("success.savedTitle")}</h2><p className="text-sm text-slate-500">{savedReceipt.name || savedReceipt.reference} · {savedReceipt.reference}</p></div>
            <div className="grid gap-2">{savedReceipt.lines.map((line) => <StockProductSummary key={line.id} line={line} />)}</div>
            <StockSummaryActions receipt={savedReceipt} />
            <Button className="w-fit" type="button" variant="outline" onClick={() => resetRecorder()}>{stockT("actions.recordAnother")}</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-[12rem_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40 md:border-b-0 md:border-r">
              <div className="grid gap-1">
                {(["stock", "catalog", "record", "review"] as Step[]).map((item, index) => (
                  <button className={`rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${step === item ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`} key={item} onClick={() => { if (index === 0 || selectedKeys.length || item === "catalog") moveTo(item); }} type="button">{index + 1}. {t(`steps.${item}`)}</button>
                ))}
              </div>
            </aside>
            <div className="min-w-0 p-4">{editor}</div>
          </div>
        )}
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3 dark:border-slate-800">
          <div><h2 className="text-sm font-bold">{t("history.title")}</h2><p className="text-xs text-slate-500">{t("history.description")}</p></div>
          <StockEditControl receipts={receipts} onCorrect={beginCorrection} onLateDelivery={(receipt) => resetRecorder(receipt)} />
        </div>
        {correction ? (
          <div className="grid gap-3 border-b border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between"><strong>{t("correction.title")}</strong><Button type="button" variant="ghost" onClick={() => setCorrection(null)}>{commerceT("actions.cancel")}</Button></div>
            <div className="grid gap-3 sm:grid-cols-3"><label className={field}>{t("fields.stockName")}<Input value={correction.name} onChange={(event) => setCorrection({ ...correction, name: event.target.value })} /></label><label className={field}>{stockT("fields.supplier")}<Input value={correction.supplier} onChange={(event) => setCorrection({ ...correction, supplier: event.target.value })} /></label><label className={field}>{stockT("fields.stockExpenses")}<Input min="0" step="0.01" type="number" value={correction.expenses} onChange={(event) => setCorrection({ ...correction, expenses: event.target.value })} /></label></div>
            {correction.lines.map((line, index) => (
              <div className="grid gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-800 sm:grid-cols-3" key={line.id}><strong className="text-xs sm:col-span-3">{line.name}</strong><label className={field}>{stockT("fields.quantity")}<Input min="0.001" step="0.001" type="number" value={line.quantity} onChange={(event) => setCorrection({ ...correction, lines: correction.lines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item) })} /></label><label className={field}>{t("fields.receivedUnit")}<Input value={line.receivedUnit} onChange={(event) => setCorrection({ ...correction, lines: correction.lines.map((item, itemIndex) => itemIndex === index ? { ...item, receivedUnit: event.target.value } : item) })} /></label><label className={field}>{stockT("fields.costPerUnit")}<Input min="0" step="0.01" type="number" value={line.cost} onChange={(event) => setCorrection({ ...correction, lines: correction.lines.map((item, itemIndex) => itemIndex === index ? { ...item, cost: event.target.value } : item) })} /></label></div>
            ))}
            <Button className="w-fit" disabled={busy} type="button" onClick={() => void saveCorrection()}>{t("actions.saveCorrection")}</Button>
          </div>
        ) : null}
        <div className="grid gap-3 p-3">
          {receipts.length ? receipts.map((receipt) => (
            <article className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800" key={receipt.id}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{receipt.name || receipt.reference}</strong><p className="text-xs text-slate-500">{receipt.reference} · {receipt.supplier_name || stockT("values.noSupplier")}</p></div>{receipt.status === "draft" ? <Button size="small" type="button" variant="ghost" onClick={() => void archiveDraft(receipt)}><Trash2 className="size-3.5" /> {t("actions.archiveDraft")}</Button> : null}</div>
              <div className="grid gap-2">{receipt.lines.map((line) => <StockProductSummary key={line.id} line={line} />)}</div>
              <StockSummaryActions receipt={receipt} />
            </article>
          )) : <p className="p-3 text-sm text-slate-500">{t("history.empty")}</p>}
        </div>
      </section>
    </div>
  );
}

export { StockProgressiveWorkspaceV2 };
