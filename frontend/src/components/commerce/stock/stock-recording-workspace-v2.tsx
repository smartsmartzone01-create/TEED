"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { StockEditControl } from "@/components/commerce/stock/stock-edit-control";
import { StockProductSummary, StockSummaryActions } from "@/components/commerce/stock/stock-summary";
import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { getProducts } from "@/services/commerce/catalog";
import {
  correctStockReceipt,
  createStockReceipt,
  getStockReceipts,
} from "@/services/commerce/inventory";
import { isRequestCancelled } from "@/services/global/api-client";
import type { Product, ProductFamily } from "@/types/commerce/catalog";
import type {
  StockCostMode,
  StockReceipt,
  StockTrackingMode,
  StockUnitDefinition,
} from "@/types/commerce/inventory";

const panel =
  "rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950";
const inset =
  "rounded-lg border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40";
const field = "grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300";
const createFamilyValue = "__create_family__";
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

type Step = "stock" | "products" | "record" | "review";
type IdentifierKind = (typeof identifierKinds)[number];
type PreparedProduct = {
  key: string;
  name: string;
  familyId: string;
  familyName: string;
  brand: string;
  variant: string;
  color: string;
  capacity: string;
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
    cost: string;
  }>;
};

const localNow = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const emptyPreparedProduct = (): PreparedProduct => ({
  key: "",
  name: "",
  familyId: "",
  familyName: "",
  brand: "",
  variant: "",
  color: "",
  capacity: "",
  unit: "piece",
  trackingMode: "quantity",
});

const emptyUnit = (): UnitDraft => ({
  modelName: "",
  brand: "",
  color: "",
  capacity: "",
  identifierKind: "serial",
  identifierValue: "",
});

const unitForChoice = (
  choice?: Pick<ProductChoice, "name" | "brand" | "color" | "capacity">,
): UnitDraft => ({
  ...emptyUnit(),
  modelName: choice?.name ?? "",
  brand: choice?.brand ?? "",
  color: choice?.color ?? "",
  capacity: choice?.capacity ?? "",
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

const newLineForChoice = (
  choice: Pick<ProductChoice, "key" | "unit">,
): LineDraft => ({
  productKey: choice.key,
  quantity: "1",
  receivedUnit: choice.unit || "piece",
  conversionToBase: "1",
  costMode: "per_unit",
  costValue: "",
  trackedUnits: [],
});

function StockRecordingWorkspaceV2({
  businessId,
  recordingOpen,
  onRecordingRequested,
  onStageChange,
}: {
  businessId: string;
  recordingOpen: boolean;
  onRecordingRequested?: () => void;
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
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [unitDefinitions, setUnitDefinitions] = useState<StockUnitDefinition[]>([]);
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [preparedProducts, setPreparedProducts] = useState<PreparedProduct[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [existingSelection, setExistingSelection] = useState("");
  const [newProductOpen, setNewProductOpen] = useState(true);
  const [familySelection, setFamilySelection] = useState("");
  const [preparedDraft, setPreparedDraft] = useState<PreparedProduct>(emptyPreparedProduct());
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [activeProductKey, setActiveProductKey] = useState<string | null>(null);
  const [activeUnitDraft, setActiveUnitDraft] = useState<UnitDraft>(emptyUnit());
  const [editingUnitIndex, setEditingUnitIndex] = useState<number | null>(null);
  const [lateDeliveryParent, setLateDeliveryParent] = useState<StockReceipt | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<StockReceipt | null>(null);
  const [correction, setCorrection] = useState<CorrectionDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const moveTo = (next: Step) => {
    setStep(next);
    onStageChange?.({ stock: 0, products: 1, record: 2, review: 3 }[next] as 0 | 1 | 2 | 3);
  };

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      try {
        const [productResponse, stockResponse] = await Promise.all([
          getProducts(businessId, accessToken, signal),
          getStockReceipts(businessId, accessToken, signal),
        ]);
        setProducts(productResponse.data?.products ?? []);
        setFamilies(productResponse.data?.families ?? []);
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
          familyId: product.family ?? "",
          familyName: product.family_name ?? "",
          sku: product.sku,
          brand: product.brand,
          variant: product.variant,
          color: "",
          capacity: "",
          unit: product.unit,
          trackingMode: product.tracking_mode,
        })),
      ...preparedProducts.map((product) => ({
        ...product,
        existingId: null,
        sku: t("values.autoSku"),
      })),
    ],
    [preparedProducts, products, t],
  );

  const choiceFor = (key: string) => choices.find((choice) => choice.key === key);
  const selectedChoices = selectedKeys
    .map((key) => choiceFor(key))
    .filter((choice): choice is ProductChoice => Boolean(choice));
  const activeChoice = activeProductKey ? choiceFor(activeProductKey) : undefined;
  const activeLine = activeProductKey
    ? lines.find((line) => line.productKey === activeProductKey)
    : undefined;

  const availableUnits = useMemo(
    () => [
      ...units.map((unit) => ({ key: unit, label: commerceT(`units.${unit}`) })),
      ...unitDefinitions.map((unit) => ({ key: unit.name, label: unit.name })),
    ],
    [commerceT, unitDefinitions],
  );

  const startRecording = (key: string) => {
    const choice = choiceFor(key);
    setActiveProductKey(key);
    setActiveUnitDraft(unitForChoice(choice));
    setEditingUnitIndex(null);
    moveTo("record");
  };

  const openExistingProduct = () => {
    if (!existingSelection) return;
    const choice = choiceFor(existingSelection);
    if (!choice) return;
    setSelectedKeys((current) =>
      current.includes(choice.key) ? current : [...current, choice.key],
    );
    setLines((current) =>
      current.some((line) => line.productKey === choice.key)
        ? current
        : [...current, newLineForChoice(choice)],
    );
    setExistingSelection("");
    startRecording(choice.key);
  };

  const chooseProductFamily = (value: string) => {
    setFamilySelection(value);
    if (!value || value === createFamilyValue) {
      setPreparedDraft((current) => ({
        ...current,
        familyId: "",
        familyName: "",
        brand: current.familyId ? "" : current.brand,
      }));
      return;
    }

    const family = families.find((item) => item.id === value);
    if (!family) return;
    setPreparedDraft((current) => ({
      ...current,
      familyId: family.id,
      familyName: family.name,
      brand: family.brand,
      name: current.name.trim() ? current.name : family.name,
    }));
  };

  const savePreparedProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!preparedDraft.name.trim()) {
      notify({ message: stockT("validation.productName"), tone: "error" });
      return;
    }
    if (familySelection === createFamilyValue && !preparedDraft.familyName.trim()) {
      notify({ message: t("validation.familyName"), tone: "error" });
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
      color: preparedDraft.color.trim(),
      capacity: preparedDraft.capacity.trim(),
      unit: preparedDraft.unit.trim() || "piece",
    };
    setPreparedProducts((current) => [...current.filter((item) => item.key !== key), product]);
    setSelectedKeys((current) => (current.includes(key) ? current : [...current, key]));
    setLines((current) =>
      current.some((line) => line.productKey === key)
        ? current
        : [...current, newLineForChoice({ key, unit: product.unit })],
    );
    setPreparedDraft(emptyPreparedProduct());
    setFamilySelection("");
    setNewProductOpen(false);
    setActiveProductKey(key);
    setActiveUnitDraft(unitForChoice(product));
    setEditingUnitIndex(null);
    moveTo("record");
  };

  const removeSelected = (key: string) => {
    setSelectedKeys((current) => current.filter((item) => item !== key));
    setLines((current) => current.filter((line) => line.productKey !== key));
    if (activeProductKey === key) setActiveProductKey(null);
  };

  const updateLine = (key: string, values: Partial<LineDraft>) => {
    setLines((current) =>
      current.map((line) => {
        if (line.productKey !== key) return line;
        const next = { ...line, ...values };
        const choice = choiceFor(key);
        if (choice?.trackingMode !== "individual") return { ...next, trackedUnits: [] };
        const count = lineCount(next);
        return {
          ...next,
          trackedUnits: count ? next.trackedUnits.slice(0, count) : next.trackedUnits,
        };
      }),
    );
  };

  const commitTrackedUnit = () => {
    if (!activeChoice || !activeLine || activeChoice.trackingMode !== "individual") return;
    const count = lineCount(activeLine);
    if (!count) {
      notify({ message: stockT("validation.quantityPositive"), tone: "error" });
      return;
    }
    if (editingUnitIndex == null && activeLine.trackedUnits.length >= count) return;

    setLines((current) =>
      current.map((line) => {
        if (line.productKey !== activeLine.productKey) return line;
        if (editingUnitIndex == null) {
          return { ...line, trackedUnits: [...line.trackedUnits, activeUnitDraft] };
        }
        return {
          ...line,
          trackedUnits: line.trackedUnits.map((unit, index) =>
            index === editingUnitIndex ? activeUnitDraft : unit,
          ),
        };
      }),
    );
    setActiveUnitDraft(unitForChoice(activeChoice));
    setEditingUnitIndex(null);
  };

  const editTrackedUnit = (unit: UnitDraft, index: number) => {
    setActiveUnitDraft(unit);
    setEditingUnitIndex(index);
  };

  const removeTrackedUnit = (index: number) => {
    if (!activeLine) return;
    setLines((current) =>
      current.map((line) =>
        line.productKey === activeLine.productKey
          ? {
              ...line,
              trackedUnits: line.trackedUnits.filter((_, unitIndex) => unitIndex !== index),
            }
          : line,
      ),
    );
    if (editingUnitIndex === index) {
      setEditingUnitIndex(null);
      setActiveUnitDraft(unitForChoice(activeChoice));
    }
  };

  const validateLines = (status: "draft" | "received") => {
    if (!lines.length) return t("validation.catalogRequired");
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

  const reviewStock = () => {
    const validation = validateLines("draft");
    if (validation) {
      notify({ message: validation, tone: "error" });
      return;
    }
    moveTo("review");
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
    setFamilySelection("");
    setPreparedDraft(emptyPreparedProduct());
    setNewProductOpen(true);
    setLines([]);
    setActiveProductKey(null);
    setActiveUnitDraft(emptyUnit());
    setEditingUnitIndex(null);
    setSavedReceipt(null);
    setLateDeliveryParent(parent ?? null);
    onRecordingRequested?.();
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
    moveTo("products");
  };

  const itemLabel = (unit: UnitDraft, index: number) => {
    const identifier = unit.identifierValue
      ? `${unit.identifierKind}: ${unit.identifierValue}`
      : "";
    return [identifier, unit.modelName, unit.brand, unit.color, unit.capacity]
      .filter(Boolean)
      .join(" · ") || t("individualItem", { number: index + 1, count: activeLine ? lineCount(activeLine) : index + 1 });
  };

  let editor: React.ReactNode;

  if (step === "stock") {
    editor = (
      <form className="grid gap-4" onSubmit={commitStock}>
        <div>
          <h2 className="text-lg font-bold">
            {lateDeliveryParent ? stockT("steps.lateDelivery") : t("steps.stock")}
          </h2>
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
  } else if (step === "products") {
    editor = (
      <div className="grid gap-4">
        <div>
          <h2 className="text-lg font-bold">{t("steps.products")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("help.products")}</p>
        </div>

        {newProductOpen ? (
          <form className={`${inset} grid gap-3 p-3`} onSubmit={savePreparedProduct}>
            <div>
              <strong className="text-sm">{t("newProduct.title")}</strong>
              <p className="mt-1 text-xs text-slate-500">{t("help.autoSku")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={field}>
                {stockT("fields.productName")}
                <Input value={preparedDraft.name} onChange={(event) => setPreparedDraft({ ...preparedDraft, name: event.target.value })} />
              </label>
              <label className={field}>
                {t("fields.productFamily")}
                <Select value={familySelection} onChange={(event) => chooseProductFamily(event.target.value)}>
                  <option value="">{t("values.noFamily")}</option>
                  {families.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.name}{family.brand ? ` · ${family.brand}` : ""}
                    </option>
                  ))}
                  <option value={createFamilyValue}>{t("values.createFamily")}</option>
                </Select>
                {familySelection === createFamilyValue ? (
                  <Input
                    aria-label={t("fields.newFamilyName")}
                    placeholder={t("fields.newFamilyName")}
                    value={preparedDraft.familyName}
                    onChange={(event) => setPreparedDraft({ ...preparedDraft, familyName: event.target.value })}
                  />
                ) : null}
                <span className="font-normal text-slate-500">{t("help.familyAssignment")}</span>
              </label>
              <label className={field}>
                {commerceT("fields.brandOptional")}
                <Input disabled={Boolean(preparedDraft.familyId)} value={preparedDraft.brand} onChange={(event) => setPreparedDraft({ ...preparedDraft, brand: event.target.value })} />
              </label>
              <label className={field}>
                {t("fields.trackingMode")}
                <Select value={preparedDraft.trackingMode} onChange={(event) => setPreparedDraft({ ...preparedDraft, trackingMode: event.target.value as StockTrackingMode })}>
                  <option value="quantity">{t("tracking.quantity")}</option>
                  <option value="individual">{t("tracking.individual")}</option>
                </Select>
              </label>
              {preparedDraft.trackingMode === "individual" ? (
                <>
                  <label className={field}>
                    {commerceT("fields.color")}
                    <Input value={preparedDraft.color} onChange={(event) => setPreparedDraft({ ...preparedDraft, color: event.target.value })} />
                  </label>
                  <label className={field}>
                    {commerceT("fields.capacity")}
                    <Input value={preparedDraft.capacity} onChange={(event) => setPreparedDraft({ ...preparedDraft, capacity: event.target.value })} />
                  </label>
                </>
              ) : (
                <label className={field}>
                  {commerceT("fields.variant")}
                  <Input value={preparedDraft.variant} onChange={(event) => setPreparedDraft({ ...preparedDraft, variant: event.target.value })} />
                </label>
              )}
              <label className={field}>
                {stockT("fields.unit")}
                <Select value={preparedDraft.unit} onChange={(event) => setPreparedDraft({ ...preparedDraft, unit: event.target.value })}>
                  {availableUnits.map((unit) => <option key={unit.key} value={unit.key}>{unit.label}</option>)}
                </Select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">{t("actions.continueToRecord")}</Button>
              <Button type="button" variant="ghost" onClick={() => { setNewProductOpen(false); setFamilySelection(""); setPreparedDraft(emptyPreparedProduct()); }}>{commerceT("actions.cancel")}</Button>
            </div>
          </form>
        ) : (
          <Button className="w-fit" type="button" onClick={() => setNewProductOpen(true)}>
            <Plus className="size-4" /> {t("actions.recordNewProduct")}
          </Button>
        )}

        <div className={`${inset} grid gap-3 p-3`}>
          <div>
            <strong className="text-sm">{t("existingSku.title")}</strong>
            <p className="mt-1 text-xs text-slate-500">{t("help.existingSku")}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Select value={existingSelection} onChange={(event) => setExistingSelection(event.target.value)}>
              <option value="">{stockT("values.chooseProduct")}</option>
              {choices.filter((choice) => choice.existingId).map((choice) => (
                <option key={choice.key} value={choice.key}>
                  {choice.name} · {choice.sku} · {choice.unit} · {t(`tracking.${choice.trackingMode}`)}
                </option>
              ))}
            </Select>
            <Button disabled={!existingSelection} type="button" variant="outline" onClick={openExistingProduct}>
              <Plus className="size-4" /> {t("actions.addExisting")}
            </Button>
          </div>
        </div>

        {selectedChoices.length ? (
          <div className={`${inset} divide-y divide-slate-200 px-3 dark:divide-slate-800`}>
            <p className="py-2 text-xs font-semibold text-slate-500">{t("recordedProducts")}</p>
            {selectedChoices.map((choice) => {
              const line = lines.find((item) => item.productKey === choice.key);
              const total = line ? lineCount(line) : 0;
              const recorded = line?.trackedUnits.length ?? 0;
              return (
                <div className="flex flex-wrap items-center justify-between gap-3 py-2" key={choice.key}>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{choice.name}</strong>
                    <p className="truncate text-xs text-slate-500">
                      {[choice.sku, choice.familyName, choice.color, choice.capacity, choice.unit, t(`tracking.${choice.trackingMode}`)].filter(Boolean).join(" · ")}
                    </p>
                    {line ? (
                      <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {choice.trackingMode === "individual"
                          ? t("individualProgress", { recorded, count: total })
                          : `${line.quantity} ${line.receivedUnit}`}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="small" type="button" variant="outline" onClick={() => startRecording(choice.key)}>
                      {t("actions.recordProduct")}
                    </Button>
                    <Button aria-label={t("actions.remove")} size="small" type="button" variant="ghost" onClick={() => removeSelected(choice.key)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => moveTo("stock")}>{t("actions.back")}</Button>
          <Button disabled={!selectedKeys.length} type="button" onClick={reviewStock}>{t("actions.reviewStock")}</Button>
        </div>
      </div>
    );
  } else if (step === "record") {
    if (!activeChoice || !activeLine) {
      editor = (
        <div className="grid gap-3">
          <p className="text-sm text-slate-500">{t("validation.catalogRequired")}</p>
          <Button className="w-fit" type="button" variant="outline" onClick={() => moveTo("products")}>{t("actions.backToProducts")}</Button>
        </div>
      );
    } else {
      const count = lineCount(activeLine);
      const recorded = activeLine.trackedUnits.length;
      const itemNumber = editingUnitIndex == null ? recorded + 1 : editingUnitIndex + 1;
      const showActiveUnitForm =
        activeChoice.trackingMode === "individual" &&
        count > 0 &&
        (editingUnitIndex != null || recorded < count);

      editor = (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">{activeChoice.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {[activeChoice.sku, activeChoice.color, activeChoice.capacity, activeChoice.unit, t(`tracking.${activeChoice.trackingMode}`)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button size="small" type="button" variant="ghost" onClick={() => moveTo("products")}>{t("actions.backToProducts")}</Button>
          </div>

          <div className={`${inset} grid gap-3 p-3`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className={field}>{stockT("fields.quantity")}<Input min="0.001" step={activeChoice.trackingMode === "individual" ? "1" : "0.001"} type="number" value={activeLine.quantity} onChange={(event) => updateLine(activeLine.productKey, { quantity: event.target.value })} /></label>
              <label className={field}>{t("fields.receivedUnit")}<Select value={activeLine.receivedUnit} onChange={(event) => updateLine(activeLine.productKey, { receivedUnit: event.target.value })}>{availableUnits.map((unit) => <option key={unit.key} value={unit.key}>{unit.label}</option>)}</Select></label>
              <label className={field}>{t("fields.baseUnit")}<Input disabled value={activeChoice.unit} /></label>
              <label className={field}>{t("fields.conversion")}<Input min="0.000001" step="0.000001" type="number" value={activeLine.conversionToBase} onChange={(event) => updateLine(activeLine.productKey, { conversionToBase: event.target.value })} /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
              <label className={field}>{stockT("costMode.label")}<Select value={activeLine.costMode} onChange={(event) => updateLine(activeLine.productKey, { costMode: event.target.value as StockCostMode })}><option value="per_unit">{stockT("costMode.perUnit")}</option><option value="total">{stockT("costMode.total")}</option></Select></label>
              <label className={field}>{activeLine.costMode === "total" ? stockT("fields.totalBuyingCost") : stockT("fields.costPerUnit")}<Input min="0" step="0.01" type="number" value={activeLine.costValue} onChange={(event) => updateLine(activeLine.productKey, { costValue: event.target.value })} /></label>
            </div>
          </div>

          {activeChoice.trackingMode === "individual" ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t("individualProgress", { recorded, count })}
                </p>
                {recorded === count && count > 0 ? (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t("individualComplete")}</span>
                ) : null}
              </div>

              {recorded ? (
                <div className={`${inset} divide-y divide-slate-200 px-3 dark:divide-slate-800`}>
                  {activeLine.trackedUnits.map((unit, index) => (
                    <div className="flex items-center justify-between gap-3 py-2" key={`${activeLine.productKey}-${index}`}>
                      <div className="min-w-0">
                        <strong className="block text-xs">{t("individualItem", { number: index + 1, count })}</strong>
                        <p className="truncate text-xs text-slate-500">{itemLabel(unit, index)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button aria-label={stockT("actions.edit")} size="small" type="button" variant="ghost" onClick={() => editTrackedUnit(unit, index)}><Pencil className="size-3.5" /></Button>
                        <Button aria-label={t("actions.remove")} size="small" type="button" variant="ghost" onClick={() => removeTrackedUnit(index)}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {showActiveUnitForm ? (
                <div className={`${inset} grid gap-3 p-3`}>
                  <strong className="text-sm">{t("individualItem", { number: itemNumber, count })}</strong>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <label className={field}>{commerceT("fields.modelName")}<Input value={activeUnitDraft.modelName} onChange={(event) => setActiveUnitDraft({ ...activeUnitDraft, modelName: event.target.value })} /></label>
                    <label className={field}>{commerceT("fields.brand")}<Input value={activeUnitDraft.brand} onChange={(event) => setActiveUnitDraft({ ...activeUnitDraft, brand: event.target.value })} /></label>
                    <label className={field}>{commerceT("fields.color")}<Input value={activeUnitDraft.color} onChange={(event) => setActiveUnitDraft({ ...activeUnitDraft, color: event.target.value })} /></label>
                    <label className={field}>{commerceT("fields.capacity")}<Input value={activeUnitDraft.capacity} onChange={(event) => setActiveUnitDraft({ ...activeUnitDraft, capacity: event.target.value })} /></label>
                    <label className={field}>{stockT("fields.identifierType")}<Select value={activeUnitDraft.identifierKind} onChange={(event) => setActiveUnitDraft({ ...activeUnitDraft, identifierKind: event.target.value as IdentifierKind })}>{identifierKinds.map((kind) => <option key={kind} value={kind}>{commerceT(`identifierTypes.${kind}`)}</option>)}</Select></label>
                    <label className={field}>{stockT("fields.identifierValue")}<Input value={activeUnitDraft.identifierValue} onChange={(event) => setActiveUnitDraft({ ...activeUnitDraft, identifierValue: event.target.value })} /></label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={commitTrackedUnit}>
                      {editingUnitIndex == null ? t("actions.addIndividual") : t("actions.updateIndividual")}
                    </Button>
                    {editingUnitIndex != null ? (
                      <Button type="button" variant="ghost" onClick={() => { setEditingUnitIndex(null); setActiveUnitDraft(unitForChoice(activeChoice)); }}>{commerceT("actions.cancel")}</Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => moveTo("products")}>{t("actions.chooseAnother")}</Button>
            <Button type="button" onClick={reviewStock}>{t("actions.reviewStock")}</Button>
          </div>
        </div>
      );
    }
  } else {
    editor = (
      <div className="grid gap-4">
        <div><h2 className="text-lg font-bold">{t("steps.review")}</h2><p className="mt-1 text-sm text-slate-500">{t("help.review")}</p></div>
        <div className={`${inset} grid gap-2 p-3 text-sm`}>
          <div className="flex justify-between gap-3"><span>{t("fields.stockName")}</span><strong>{stockName}</strong></div>
          <div className="flex justify-between gap-3"><span>{stockT("fields.totalProducts")}</span><strong>{lines.length}</strong></div>
          <div className="flex justify-between gap-3"><span>{stockT("fields.stockExpenses")}</span><strong>{stockExpenses || "0"}</strong></div>
          {lines.map((line) => {
            const choice = choiceFor(line.productKey)!;
            const total = lineCount(line);
            return (
              <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-800" key={line.productKey}>
                <span>{choice.name}</span>
                <strong>
                  {line.quantity} {line.receivedUnit} · {t(`tracking.${choice.trackingMode}`)}
                  {choice.trackingMode === "individual" ? ` · ${t("individualProgress", { recorded: line.trackedUnits.length, count: total })}` : ""}
                </strong>
              </div>
            );
          })}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button disabled={busy} type="button" variant="outline" onClick={() => void saveStock("draft")}>{stockT("actions.saveDraft")}</Button>
          <Button disabled={busy} type="button" onClick={() => void saveStock("received")}>{busy ? stockT("actions.saving") : stockT("actions.finishSave")}</Button>
        </div>
        <Button className="w-fit" type="button" variant="ghost" onClick={() => moveTo("products")}>{t("actions.backToProducts")}</Button>
      </div>
    );
  }

  const navItems: Array<{ key: "stock" | "products" | "review"; label: string }> = [
    { key: "stock", label: t("steps.stock") },
    { key: "products", label: t("steps.products") },
    { key: "review", label: t("steps.review") },
  ];

  return (
    <div className="stock-recording-workspace-v2 grid gap-5">
      {recordingOpen ? (
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
                  {navItems.map((item, index) => {
                    const active = item.key === "products" ? step === "products" || step === "record" : step === item.key;
                    const disabled = item.key === "review" && !selectedKeys.length;
                    return (
                      <button
                        className={`rounded-md px-3 py-2 text-left text-xs font-semibold transition ${active ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"} disabled:cursor-not-allowed disabled:opacity-50`}
                        disabled={disabled}
                        key={item.key}
                        onClick={() => item.key === "review" ? reviewStock() : moveTo(item.key)}
                        type="button"
                      >
                        {index + 1}. {item.label}
                      </button>
                    );
                  })}
                </div>
              </aside>
              <div className="min-w-0 p-4">{editor}</div>
            </div>
          )}
        </section>
      ) : null}

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3 dark:border-slate-800">
          <div><h2 className="text-sm font-bold">{t("history.title")}</h2><p className="text-xs text-slate-500">{t("history.description")}</p></div>
          <StockEditControl receipts={receipts} onCorrect={beginCorrection} onLateDelivery={(receipt) => resetRecorder(receipt)} />
        </div>
        {correction ? (
          <div className="grid gap-3 p-3">
            <div className="flex items-center justify-between gap-2"><strong>{t("correction.title")}</strong><Button type="button" variant="ghost" onClick={() => setCorrection(null)}>{commerceT("actions.cancel")}</Button></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={field}>{t("fields.stockName")}<Input value={correction.name} onChange={(event) => setCorrection({ ...correction, name: event.target.value })} /></label>
              <label className={field}>{stockT("fields.supplier")}<Input value={correction.supplier} onChange={(event) => setCorrection({ ...correction, supplier: event.target.value })} /></label>
              <label className={field}>{stockT("fields.stockExpenses")}<Input min="0" step="0.01" type="number" value={correction.expenses} onChange={(event) => setCorrection({ ...correction, expenses: event.target.value })} /></label>
            </div>
            {correction.lines.map((line, index) => (
              <div className="grid gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-800 sm:grid-cols-3" key={line.id}>
                <strong className="text-xs sm:col-span-3">{line.name}</strong>
                <label className={field}>{stockT("fields.quantity")}<Input min="0.001" step="0.001" type="number" value={line.quantity} onChange={(event) => setCorrection({ ...correction, lines: correction.lines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item) })} /></label>
                <label className={field}>{t("fields.receivedUnit")}<Input value={line.receivedUnit} onChange={(event) => setCorrection({ ...correction, lines: correction.lines.map((item, itemIndex) => itemIndex === index ? { ...item, receivedUnit: event.target.value } : item) })} /></label>
                <label className={field}>{stockT("fields.costPerUnit")}<Input min="0" step="0.01" type="number" value={line.cost} onChange={(event) => setCorrection({ ...correction, lines: correction.lines.map((item, itemIndex) => itemIndex === index ? { ...item, cost: event.target.value } : item) })} /></label>
              </div>
            ))}
            <Button className="w-fit" disabled={busy} type="button" onClick={() => void saveCorrection()}>{t("actions.saveCorrection")}</Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export { StockRecordingWorkspaceV2 };
