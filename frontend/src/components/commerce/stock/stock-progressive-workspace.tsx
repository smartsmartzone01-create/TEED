"use client";

import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

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

type Step = "stock" | "batch" | "products" | "method" | "record" | "review";
type RecordMethod = "individual" | "group";
type GroupMethod = "quantity" | "individual";

type PreparedProduct = {
  key: string;
  name: string;
  brand: string;
  variant: string;
  unit: string;
};

type ProductChoice = {
  key: string;
  name: string;
  sku: string;
  brand: string;
  variant: string;
  unit: string;
  existingId: string | null;
};

type ItemDetails = {
  modelName: string;
  brand: string;
  color: string;
  capacity: string;
  identifierKind: (typeof identifierKinds)[number];
  identifierValue: string;
};

type RecordedLine = {
  id: string;
  productKey: string;
  quantity: string;
  costMode: StockCostMode;
  costValue: string;
  trackingMode: StockTrackingMode;
  details: ItemDetails | null;
};

type RecordedGroup = {
  id: string;
  name: string;
  method: GroupMethod;
  lines: RecordedLine[];
};

type CorrectionDraft = {
  supplier: string;
  expenses: string;
  batches: Array<{
    id: string;
    name: string;
    groups: Array<{
      id: string;
      name: string;
      unit: string;
      lines: Array<{
        id: string;
        name: string;
        brand: string;
        variant: string;
        barcode: string;
        quantity: string;
        costMode: StockCostMode;
        costValue: string;
      }>;
    }>;
  }>;
};

const emptyDetails = (): ItemDetails => ({
  modelName: "",
  brand: "",
  color: "",
  capacity: "",
  identifierKind: "serial",
  identifierValue: "",
});

const localNow = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const money = (value: string | number | null | undefined) => {
  if (value == null || value === "") return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(parsed)
    : String(value);
};

const quantityText = (value: string | number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(Number(value));

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

function CostEditor({
  mode,
  quantity,
  value,
  onMode,
  onValue,
}: {
  mode: StockCostMode;
  quantity: string;
  value: string;
  onMode: (mode: StockCostMode) => void;
  onValue: (value: string) => void;
}) {
  const t = useTranslations("CommerceStock");
  const unitCost = normalizedCost(mode, value, quantity);
  const total = unitCost == null ? null : Number(unitCost) * Number(quantity || 0);
  return (
    <label className={field}>
      {t("costMode.label")}
      <div className="grid grid-cols-[8.5rem_1fr] gap-2">
        <Select value={mode} onChange={(event) => onMode(event.target.value as StockCostMode)}>
          <option value="per_unit">{t("costMode.perUnit")}</option>
          <option value="total">{t("costMode.total")}</option>
        </Select>
        <Input min="0" step="0.01" type="number" value={value} onChange={(event) => onValue(event.target.value)} />
      </div>
      {value && unitCost != null ? (
        <span className="font-normal text-slate-500">
          {mode === "total"
            ? `${t("fields.costPerUnit")}: ${money(unitCost)}`
            : `${t("fields.totalBuyingCost")}: ${money(total)}`}
        </span>
      ) : null}
    </label>
  );
}

function SummaryRow({
  title,
  detail,
  onEdit,
}: {
  title: string;
  detail: string;
  onEdit?: () => void;
}) {
  const t = useTranslations("CommerceStock");
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 py-3 last:border-b-0 dark:border-slate-800">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{detail}</p>
      </div>
      {onEdit ? (
        <Button size="small" type="button" variant="ghost" onClick={onEdit}>
          <Pencil className="size-3.5" /> {t("actions.edit")}
        </Button>
      ) : null}
    </div>
  );
}

function ProgressiveStockWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceStock");
  const commerceT = useTranslations("Commerce");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const sequence = useRef(100);
  const nextId = (prefix: string) => `${prefix}-${++sequence.current}`;

  const [step, setStep] = useState<Step>("stock");
  const [supplier, setSupplier] = useState("");
  const [receivedAt, setReceivedAt] = useState(localNow());
  const [stockExpenses, setStockExpenses] = useState("0");
  const [stockCommitted, setStockCommitted] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [batchCommitted, setBatchCommitted] = useState(false);
  const [preparedProducts, setPreparedProducts] = useState<PreparedProduct[]>([]);
  const [preparedDraft, setPreparedDraft] = useState<PreparedProduct>({
    key: "",
    name: "",
    brand: "",
    variant: "",
    unit: "piece",
  });
  const [editingPreparedKey, setEditingPreparedKey] = useState("");
  const [recordMethod, setRecordMethod] = useState<RecordMethod | "">("");
  const [directLines, setDirectLines] = useState<RecordedLine[]>([]);
  const [groups, setGroups] = useState<RecordedGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<RecordedGroup | null>(null);
  const [lineDraft, setLineDraft] = useState<RecordedLine>({
    id: "",
    productKey: "",
    quantity: "1",
    costMode: "per_unit",
    costValue: "",
    trackingMode: "quantity",
    details: null,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [unitDefinitions, setUnitDefinitions] = useState<StockUnitDefinition[]>([]);
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [savedReceipt, setSavedReceipt] = useState<StockReceipt | null>(null);
  const [lateDeliveryParent, setLateDeliveryParent] = useState<StockReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [correctionId, setCorrectionId] = useState("");
  const [correction, setCorrection] = useState<CorrectionDraft | null>(null);

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
          name: product.name,
          sku: product.sku,
          brand: product.brand,
          variant: product.variant,
          unit: product.unit,
          existingId: product.id,
        })),
      ...preparedProducts.map((product) => ({
        key: product.key,
        name: product.name,
        sku: t("values.pendingSku"),
        brand: product.brand,
        variant: product.variant,
        unit: product.unit,
        existingId: null,
      })),
    ],
    [preparedProducts, products, t],
  );

  const choiceFor = (key: string) => choices.find((choice) => choice.key === key);

  const moveTo = (next: Step) => {
    setStep(next);
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-stock-active-step]")?.focus();
    });
  };

  const commitStock = (event: FormEvent) => {
    event.preventDefault();
    if (!receivedAt) {
      notify({ message: t("validation.dateReceived"), tone: "error" });
      return;
    }
    const expenses = Number(stockExpenses || 0);
    if (!Number.isFinite(expenses) || expenses < 0) {
      notify({ message: t("validation.stockExpenses"), tone: "error" });
      return;
    }
    setStockCommitted(true);
    moveTo("batch");
  };

  const commitBatch = (event: FormEvent) => {
    event.preventDefault();
    if (!batchName.trim()) {
      notify({ message: t("validation.batchName"), tone: "error" });
      return;
    }
    setBatchCommitted(true);
    moveTo("products");
  };

  const savePreparedProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!preparedDraft.name.trim()) {
      notify({ message: t("validation.productName"), tone: "error" });
      return;
    }
    const unit = preparedDraft.unit.trim();
    if (!unit) {
      notify({ message: t("validation.unit"), tone: "error" });
      return;
    }
    const saved: PreparedProduct = {
      ...preparedDraft,
      key: editingPreparedKey || nextId("new-product"),
      name: preparedDraft.name.trim(),
      brand: preparedDraft.brand.trim(),
      variant: preparedDraft.variant.trim(),
      unit,
    };
    setPreparedProducts((current) =>
      editingPreparedKey
        ? current.map((product) => (product.key === editingPreparedKey ? saved : product))
        : [...current, saved],
    );
    setPreparedDraft({ key: "", name: "", brand: "", variant: "", unit: "piece" });
    setEditingPreparedKey("");
  };

  const editPrepared = (product: PreparedProduct) => {
    setPreparedDraft(product);
    setEditingPreparedKey(product.key);
    moveTo("products");
  };

  const commitMethod = (event: FormEvent) => {
    event.preventDefault();
    if (!recordMethod) {
      notify({ message: t("validation.recordMethod"), tone: "error" });
      return;
    }
    setLineDraft({
      id: "",
      productKey: "",
      quantity: "1",
      costMode: "per_unit",
      costValue: "",
      trackingMode: recordMethod === "individual" ? "individual" : "quantity",
      details: recordMethod === "individual" ? emptyDetails() : null,
    });
    moveTo("record");
  };

  const validateLine = (line: RecordedLine, group?: RecordedGroup | null) => {
    const selected = choiceFor(line.productKey);
    if (!selected) return t("validation.productRequired");
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return t("validation.quantityPositive");
    if (countableUnits.has(selected.unit as (typeof units)[number]) && !Number.isInteger(quantity)) {
      return t("validation.wholeQuantity", { unit: selected.unit });
    }
    if (line.trackingMode === "individual" && quantity !== 1) {
      return t("validation.individualOneAtATime");
    }
    if (line.costValue && normalizedCost(line.costMode, line.costValue, line.quantity) == null) {
      return t("validation.buyingCost");
    }
    if (group?.lines.length) {
      const groupUnit = choiceFor(group.lines[0].productKey)?.unit;
      if (groupUnit && selected.unit.toLowerCase() !== groupUnit.toLowerCase()) {
        return t("validation.groupUnitMismatch", { unit: groupUnit });
      }
    }
    return "";
  };

  const addLine = (event: FormEvent) => {
    event.preventDefault();
    const group = recordMethod === "group" ? activeGroup : null;
    const validation = validateLine(lineDraft, group);
    if (validation) {
      notify({ message: validation, tone: "error" });
      return;
    }
    const saved = { ...lineDraft, id: nextId("line") };
    if (recordMethod === "individual") {
      setDirectLines((current) => [...current, saved]);
      setLineDraft({
        id: "",
        productKey: "",
        quantity: "1",
        costMode: "per_unit",
        costValue: "",
        trackingMode: "individual",
        details: emptyDetails(),
      });
      return;
    }
    if (!activeGroup) return;
    setActiveGroup({ ...activeGroup, lines: [...activeGroup.lines, saved] });
    setLineDraft({
      id: "",
      productKey: "",
      quantity: activeGroup.method === "individual" ? "1" : "1",
      costMode: "per_unit",
      costValue: "",
      trackingMode: activeGroup.method === "individual" ? "individual" : "quantity",
      details: activeGroup.method === "individual" ? emptyDetails() : null,
    });
  };

  const beginGroup = (name: string, method: GroupMethod) => {
    if (!name.trim()) {
      notify({ message: t("validation.groupName"), tone: "error" });
      return;
    }
    const group: RecordedGroup = { id: nextId("group"), name: name.trim(), method, lines: [] };
    setActiveGroup(group);
    setLineDraft({
      id: "",
      productKey: "",
      quantity: "1",
      costMode: "per_unit",
      costValue: "",
      trackingMode: method === "individual" ? "individual" : "quantity",
      details: method === "individual" ? emptyDetails() : null,
    });
  };

  const finishGroup = () => {
    if (!activeGroup?.lines.length) {
      notify({ message: t("validation.groupNeedsProduct"), tone: "error" });
      return;
    }
    setGroups((current) => [...current, activeGroup]);
    setActiveGroup(null);
  };

  const lineSummary = (line: RecordedLine) => {
    const product = choiceFor(line.productKey);
    if (!product) return "";
    const unitCost = normalizedCost(line.costMode, line.costValue, line.quantity);
    return `${quantityText(line.quantity)} ${product.unit}${unitCost ? ` · ${money(unitCost)} / ${product.unit}` : ""}`;
  };

  const usedLines = [...directLines, ...groups.flatMap((group) => group.lines)];

  const buildPayload = (status: "draft" | "received") => {
    const usedKeys = new Set(usedLines.map((line) => line.productKey));
    const catalogItems = choices
      .filter((choice) => usedKeys.has(choice.key))
      .map((choice) => {
        if (choice.existingId) return { key: choice.key, product_id: choice.existingId };
        return {
          key: choice.key,
          item: {
            name: choice.name,
            brand: choice.brand,
            variant: choice.variant,
            unit: choice.unit,
          },
        };
      });

    const serializeLine = (line: RecordedLine) => {
      const product = choiceFor(line.productKey)!;
      return {
        catalog_key: line.productKey,
        quantity_received: line.quantity,
        received_unit: product.unit,
        tracking_mode: line.trackingMode,
        ...(line.costValue
          ? { unit_cost: normalizedCost(line.costMode, line.costValue, line.quantity) }
          : {}),
        tracked_units:
          line.trackingMode === "individual" && line.details
            ? [
                {
                  model_name: line.details.modelName.trim(),
                  brand: line.details.brand.trim(),
                  color: line.details.color.trim(),
                  capacity: line.details.capacity.trim(),
                  identifiers: line.details.identifierValue.trim()
                    ? [
                        {
                          kind: line.details.identifierKind,
                          value: line.details.identifierValue.trim(),
                        },
                      ]
                    : [],
                },
              ]
            : [],
      };
    };

    const directGroups = directLines.map((line) => {
      const product = choiceFor(line.productKey)!;
      return {
        name: product.name,
        quantity: line.quantity,
        unit: product.unit,
        types: [serializeLine(line)],
      };
    });
    const explicitGroups = groups.map((group) => {
      const first = choiceFor(group.lines[0].productKey)!;
      const quantity = group.lines.reduce((total, line) => total + Number(line.quantity), 0);
      return {
        name: group.name,
        quantity: String(quantity),
        unit: first.unit,
        types: group.lines.map(serializeLine),
      };
    });

    return {
      status,
      ...(lateDeliveryParent ? { parent_receipt_id: lateDeliveryParent.id } : {}),
      supplier_name: supplier.trim(),
      additional_cost: stockExpenses || "0",
      ...(status === "received" ? { received_at: new Date(receivedAt).toISOString() } : {}),
      catalog_items: catalogItems,
      batches: [{ name: batchName.trim(), groups: [...directGroups, ...explicitGroups] }],
    };
  };

  const saveStock = async (status: "draft" | "received") => {
    if (!accessToken || !usedLines.length) return;
    setBusy(true);
    try {
      const response = await createStockReceipt(businessId, accessToken, buildPayload(status));
      const receipt = response.data as StockReceipt | null;
      if (receipt) setSavedReceipt(receipt);
      notify({
        message: status === "draft" ? t("success.draftSaved") : commerceT("success.stock"),
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
    setStep("stock");
    setSupplier(parent?.supplier_name ?? "");
    setReceivedAt(localNow());
    setStockExpenses("0");
    setStockCommitted(false);
    setBatchName(parent?.batches[0]?.name ?? "");
    setBatchCommitted(false);
    setPreparedProducts([]);
    setPreparedDraft({ key: "", name: "", brand: "", variant: "", unit: "piece" });
    setRecordMethod("");
    setDirectLines([]);
    setGroups([]);
    setActiveGroup(null);
    setSavedReceipt(null);
    setLateDeliveryParent(parent ?? null);
  };

  const beginCorrection = (receipt: StockReceipt) => {
    setCorrectionId(receipt.id);
    setCorrection({
      supplier: receipt.supplier_name,
      expenses: receipt.additional_cost,
      batches: receipt.batches.map((batch) => ({
        id: batch.id,
        name: batch.name,
        groups: batch.groups.map((group) => ({
          id: group.id,
          name: group.name,
          unit: group.unit,
          lines: group.types.map((line) => ({
            id: line.id,
            name: line.product_name,
            brand: line.product_brand,
            variant: line.product_variant,
            barcode: line.product_barcode,
            quantity: String(Number(line.quantity_received) / Number(line.conversion_to_base || "1")),
            costMode: "per_unit",
            costValue: line.received_unit_cost ?? "",
          })),
        })),
      })),
    });
  };

  const saveCorrection = async (receipt: StockReceipt) => {
    if (!accessToken || !correction) return;
    setBusy(true);
    try {
      await correctStockReceipt(businessId, receipt.id, accessToken, {
        supplier_name: correction.supplier.trim(),
        additional_cost: correction.expenses || "0",
        batches: correction.batches.map((batch) => ({ id: batch.id, name: batch.name.trim() })),
        groups: correction.batches.flatMap((batch) =>
          batch.groups.map((group) => ({ id: group.id, name: group.name.trim(), unit: group.unit })),
        ),
        lines: correction.batches.flatMap((batch) =>
          batch.groups.flatMap((group) =>
            group.lines.map((line) => ({
              id: line.id,
              name: line.name.trim(),
              brand: line.brand.trim(),
              variant: line.variant.trim(),
              barcode: line.barcode.trim(),
              quantity: line.quantity,
              unit_cost: line.costValue
                ? normalizedCost(line.costMode, line.costValue, line.quantity)
                : null,
            })),
          ),
        ),
      });
      setCorrectionId("");
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
      notify({
        message: reason instanceof Error ? reason.message : commerceT("errors.save"),
        tone: "error",
      });
    }
  };

  const recordedSummary = (
    <div className="max-h-[58vh] overflow-y-auto px-4">
      <SummaryRow
        title={t("steps.stock")}
        detail={stockCommitted ? `${supplier || t("values.noSupplier")} · ${new Date(receivedAt).toLocaleDateString()} · ${t("fields.stockExpenses")}: ${money(stockExpenses)}` : t("values.notEntered")}
        onEdit={stockCommitted ? () => moveTo("stock") : undefined}
      />
      <SummaryRow
        title={t("steps.batch")}
        detail={batchCommitted ? batchName : t("values.notEntered")}
        onEdit={batchCommitted ? () => moveTo("batch") : undefined}
      />
      <SummaryRow
        title={t("steps.products")}
        detail={preparedProducts.length ? preparedProducts.map((product) => product.name).join(" · ") : t("values.noNewProducts")}
        onEdit={batchCommitted ? () => moveTo("products") : undefined}
      />
      <SummaryRow
        title={t("steps.method")}
        detail={recordMethod ? t(`recordMethod.${recordMethod}`) : t("values.notEntered")}
        onEdit={recordMethod ? () => moveTo("method") : undefined}
      />
      {directLines.map((line, index) => {
        const product = choiceFor(line.productKey);
        return (
          <SummaryRow
            key={line.id}
            title={`${index + 1}. ${product?.name ?? t("fields.productName")}`}
            detail={lineSummary(line)}
            onEdit={() => moveTo("record")}
          />
        );
      })}
      {groups.map((group, index) => (
        <SummaryRow
          key={group.id}
          title={`${t("summary.group")} ${index + 1}: ${group.name}`}
          detail={`${t(`groupMethod.${group.method}`)} · ${group.lines.length} ${t("values.entries")}`}
          onEdit={() => moveTo("record")}
        />
      ))}
    </div>
  );

  let activeEditor: React.ReactNode = null;

  if (step === "stock") {
    activeEditor = (
      <form className="grid gap-4" onSubmit={commitStock}>
        <div>
          <h2 className="text-lg font-bold">{lateDeliveryParent ? t("steps.lateDelivery") : t("steps.stock")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("help.stock")}</p>
        </div>
        <label className={field}>
          {t("fields.supplier")}
          <Input autoFocus data-stock-active-step tabIndex={-1} value={supplier} onChange={(event) => setSupplier(event.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={field}>
            {t("fields.dateReceived")}
            <Input required type="datetime-local" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} />
          </label>
          <label className={field}>
            {t("fields.stockExpenses")}
            <Input min="0" step="0.01" type="number" value={stockExpenses} onChange={(event) => setStockExpenses(event.target.value)} />
          </label>
        </div>
        <Button type="submit">{t("actions.enter")}</Button>
      </form>
    );
  }

  if (step === "batch") {
    activeEditor = (
      <form className="grid gap-4" onSubmit={commitBatch}>
        <div><h2 className="text-lg font-bold">{t("steps.batch")}</h2><p className="mt-1 text-sm text-slate-500">{t("help.batch")}</p></div>
        <label className={field}>
          {t("fields.batchName")}
          <Input autoFocus data-stock-active-step tabIndex={-1} value={batchName} onChange={(event) => setBatchName(event.target.value)} />
        </label>
        <Button type="submit">{t("actions.enter")}</Button>
      </form>
    );
  }

  if (step === "products") {
    activeEditor = (
      <div className="grid gap-4">
        <div><h2 className="text-lg font-bold">{t("steps.products")}</h2><p className="mt-1 text-sm text-slate-500">{t("help.products")}</p></div>
        {preparedProducts.length ? (
          <div className={`${inset} divide-y divide-slate-200 px-3 dark:divide-slate-800`}>
            {preparedProducts.map((product) => (
              <div className="flex items-center justify-between gap-3 py-2" key={product.key}>
                <div><strong className="text-sm">{product.name}</strong><p className="text-xs text-slate-500">{[product.brand, product.variant, product.unit].filter(Boolean).join(" · ")}</p></div>
                <Button size="small" type="button" variant="ghost" onClick={() => editPrepared(product)}><Pencil className="size-3.5" /> {t("actions.edit")}</Button>
              </div>
            ))}
          </div>
        ) : null}
        <form className={`${inset} grid gap-3 p-3`} onSubmit={savePreparedProduct}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={field}>{t("fields.productName")}<Input autoFocus data-stock-active-step tabIndex={-1} value={preparedDraft.name} onChange={(event) => setPreparedDraft({ ...preparedDraft, name: event.target.value })} /></label>
            <label className={field}>{commerceT("fields.brandOptional")}<Input value={preparedDraft.brand} onChange={(event) => setPreparedDraft({ ...preparedDraft, brand: event.target.value })} /></label>
            <label className={field}>{commerceT("fields.variant")}<Input value={preparedDraft.variant} onChange={(event) => setPreparedDraft({ ...preparedDraft, variant: event.target.value })} /></label>
            <label className={field}>{t("fields.unit")}<Select value={preparedDraft.unit} onChange={(event) => setPreparedDraft({ ...preparedDraft, unit: event.target.value })}>{units.map((unit) => <option key={unit} value={unit}>{commerceT(`units.${unit}`)}</option>)}{unitDefinitions.map((unit) => <option key={unit.id} value={unit.name}>{unit.name}</option>)}</Select></label>
          </div>
          <Button type="submit">{editingPreparedKey ? t("actions.updateProduct") : t("actions.enterProduct")}</Button>
        </form>
        <Button type="button" variant="outline" onClick={() => moveTo("method")}>{t("actions.continue")}</Button>
      </div>
    );
  }

  if (step === "method") {
    activeEditor = (
      <form className="grid gap-4" onSubmit={commitMethod}>
        <div><h2 className="text-lg font-bold">{t("steps.method")}</h2><p className="mt-1 text-sm text-slate-500">{t("help.method")}</p></div>
        <div className="grid gap-3 sm:grid-cols-2" data-stock-active-step tabIndex={-1}>
          {(["individual", "group"] as const).map((method) => (
            <label className={`cursor-pointer rounded-xl border p-4 ${recordMethod === method ? "border-slate-950 dark:border-white" : "border-slate-200 dark:border-slate-800"}`} key={method}>
              <input className="mr-2" checked={recordMethod === method} name="record-method" type="radio" value={method} onChange={() => setRecordMethod(method)} />
              <strong>{t(`recordMethod.${method}`)}</strong>
              <p className="mt-1 text-xs text-slate-500">{t(`recordMethodHelp.${method}`)}</p>
            </label>
          ))}
        </div>
        <Button type="submit">{t("actions.enter")}</Button>
      </form>
    );
  }

  if (step === "record" && recordMethod === "individual") {
    activeEditor = (
      <div className="grid gap-4">
        <div><h2 className="text-lg font-bold">{t("recordMethod.individual")}</h2><p className="mt-1 text-sm text-slate-500">{t("help.individual")}</p></div>
        {directLines.length ? <p className="text-xs text-slate-500">{t("savedCount", { count: directLines.length })}</p> : null}
        <form className="grid gap-3" onSubmit={addLine}>
          <label className={field}>{t("fields.productSku")}<Select autoFocus data-stock-active-step tabIndex={-1} value={lineDraft.productKey} onChange={(event) => setLineDraft({ ...lineDraft, productKey: event.target.value })}><option value="">{t("values.chooseProduct")}</option>{choices.map((choice) => <option key={choice.key} value={choice.key}>{choice.name} · {choice.sku} · {choice.unit}</option>)}</Select></label>
          <CostEditor mode={lineDraft.costMode} quantity="1" value={lineDraft.costValue} onMode={(mode) => setLineDraft({ ...lineDraft, costMode: mode })} onValue={(value) => setLineDraft({ ...lineDraft, costValue: value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={field}>{commerceT("fields.modelName")}<Input value={lineDraft.details?.modelName ?? ""} onChange={(event) => setLineDraft({ ...lineDraft, details: { ...(lineDraft.details ?? emptyDetails()), modelName: event.target.value } })} /></label>
            <label className={field}>{commerceT("fields.brand")}<Input value={lineDraft.details?.brand ?? ""} onChange={(event) => setLineDraft({ ...lineDraft, details: { ...(lineDraft.details ?? emptyDetails()), brand: event.target.value } })} /></label>
            <label className={field}>{commerceT("fields.color")}<Input value={lineDraft.details?.color ?? ""} onChange={(event) => setLineDraft({ ...lineDraft, details: { ...(lineDraft.details ?? emptyDetails()), color: event.target.value } })} /></label>
            <label className={field}>{commerceT("fields.capacity")}<Input value={lineDraft.details?.capacity ?? ""} onChange={(event) => setLineDraft({ ...lineDraft, details: { ...(lineDraft.details ?? emptyDetails()), capacity: event.target.value } })} /></label>
            <label className={field}>{t("fields.identifierType")}<Select value={lineDraft.details?.identifierKind ?? "serial"} onChange={(event) => setLineDraft({ ...lineDraft, details: { ...(lineDraft.details ?? emptyDetails()), identifierKind: event.target.value as ItemDetails["identifierKind"] } })}>{identifierKinds.map((kind) => <option key={kind} value={kind}>{commerceT(`identifierTypes.${kind}`)}</option>)}</Select></label>
            <label className={field}>{t("fields.identifierValue")}<Input value={lineDraft.details?.identifierValue ?? ""} onChange={(event) => setLineDraft({ ...lineDraft, details: { ...(lineDraft.details ?? emptyDetails()), identifierValue: event.target.value } })} /></label>
          </div>
          <Button type="submit">{t("actions.enterItem")}</Button>
        </form>
        <Button disabled={!directLines.length} type="button" variant="outline" onClick={() => moveTo("review")}>{t("actions.review")}</Button>
      </div>
    );
  }

  if (step === "record" && recordMethod === "group") {
    activeEditor = (
      <GroupRecorder
        activeGroup={activeGroup}
        choices={choices}
        lineDraft={lineDraft}
        onBegin={beginGroup}
        onFinish={finishGroup}
        onLineDraft={setLineDraft}
        onSubmitLine={addLine}
        onReview={() => moveTo("review")}
        recordedGroups={groups}
      />
    );
  }

  if (step === "review") {
    activeEditor = (
      <div className="grid gap-4" data-stock-active-step tabIndex={-1}>
        <div><h2 className="text-lg font-bold">{t("steps.review")}</h2><p className="mt-1 text-sm text-slate-500">{t("help.review")}</p></div>
        <div className={`${inset} grid gap-2 p-3 text-sm`}>
          <div className="flex justify-between gap-3"><span>{t("fields.totalProducts")}</span><strong>{usedLines.length}</strong></div>
          <div className="flex justify-between gap-3"><span>{t("fields.stockExpenses")}</span><strong>{money(stockExpenses)}</strong></div>
          <div className="flex justify-between gap-3"><span>{t("fields.batchName")}</span><strong>{batchName}</strong></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button disabled={busy || !usedLines.length} type="button" variant="outline" onClick={() => void saveStock("draft")}>{t("actions.saveDraft")}</Button>
          <Button disabled={busy || !usedLines.length} type="button" onClick={() => void saveStock("received")}>{busy ? t("actions.saving") : t("actions.finishSave")}</Button>
        </div>
        <Button type="button" variant="ghost" onClick={() => moveTo("record")}>{t("actions.backToRecording")}</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className={panel}>
        {savedReceipt ? (
          <div className="grid gap-5 p-5">
            <div><h2 className="text-lg font-bold">{t("success.savedTitle")}</h2><p className="mt-1 text-sm text-slate-500">{savedReceipt.reference}</p></div>
            {savedReceipt.batches.map((batch) => (
              <div className={`${inset} grid gap-3 p-3`} key={batch.id}>
                <strong>{batch.name}</strong>
                {batch.groups.map((group) => {
                  const direct = group.types.length === 1 && group.name === group.types[0].product_name;
                  return (
                    <div className="grid gap-2" key={group.id}>
                      {!direct ? <div className="flex justify-between text-sm"><strong>{group.name}</strong><span>{quantityText(group.quantity)} {group.unit}</span></div> : null}
                      {group.types.map((line) => <StockProductSummary key={line.id} line={line} />)}
                    </div>
                  );
                })}
              </div>
            ))}
            <StockSummaryActions receipt={savedReceipt} />
            <Button type="button" onClick={() => resetRecorder()}>{t("actions.recordAnother")}</Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(16rem,.75fr)_minmax(0,1.25fr)]">
            <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-800">
              <div className="border-b border-slate-200 p-4 dark:border-slate-800"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("savedSoFar")}</p></div>
              {recordedSummary}
            </aside>
            <div className="min-h-[30rem] p-5">{activeEditor}</div>
          </div>
        )}
      </section>

      <section className={`${panel} p-4`}>
        <div className="flex items-center justify-between gap-3"><h2 className="font-bold">{commerceT("receivedStock")}</h2>{lateDeliveryParent ? <Button type="button" variant="ghost" onClick={() => resetRecorder()}>{t("actions.cancelLateDelivery")}</Button> : null}</div>
        <div className="mt-4 grid gap-3">
          {(showAll ? receipts : receipts.slice(0, 5)).map((receipt, index) => (
            <article className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950" key={receipt.id} style={{ borderInlineStartColor: index % 2 === 0 ? "var(--workspace-primary, var(--brand-navy))" : "var(--workspace-secondary, var(--brand-orange))", borderInlineStartWidth: 3 }}>
              <div className="flex flex-wrap items-start justify-between gap-2"><div><strong>{receipt.reference}</strong><p className="text-xs text-slate-500">{receipt.supplier_name || t("values.noSupplier")}</p></div><span className="text-xs text-slate-500">{receipt.status}</span></div>
              {receipt.batches.map((batch) => (
                <div className="grid gap-2 border-t border-slate-100 pt-3 dark:border-slate-800" key={batch.id}>
                  <strong className="text-xs uppercase tracking-wide text-slate-500">{batch.name}</strong>
                  {batch.groups.map((group) => {
                    const direct = group.types.length === 1 && group.name === group.types[0].product_name;
                    return (
                      <div className="grid gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-900" key={group.id}>
                        {!direct ? <div className="flex justify-between gap-2"><strong>{group.name}</strong><span>{quantityText(group.quantity)} {group.unit}</span></div> : null}
                        {group.types.map((line) => <div className="flex justify-between gap-3 text-xs" key={line.id}><span>{line.product_name} · {line.product_sku}</span><span>{quantityText(Number(line.quantity_received) / Number(line.conversion_to_base || "1"))} {line.received_unit} · {money(line.received_unit_cost)} / {line.received_unit}</span></div>)}
                      </div>
                    );
                  })}
                </div>
              ))}
              <StockSummaryActions receipt={receipt} />
              <div className="flex flex-wrap gap-2">
                <Button disabled={!receipt.correction_open} size="small" type="button" variant="outline" onClick={() => correctionId === receipt.id ? (setCorrectionId(""), setCorrection(null)) : beginCorrection(receipt)}>{commerceT("actions.correctStock")}{correctionId === receipt.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</Button>
                {receipt.status === "received" ? <Button size="small" type="button" variant="outline" onClick={() => { resetRecorder(receipt); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{commerceT("actions.addLateDelivery")}</Button> : <Button size="small" type="button" variant="ghost" onClick={() => void archiveDraft(receipt)}><Trash2 className="size-4" /> {commerceT("actions.archiveDraft")}</Button>}
              </div>
              {correctionId === receipt.id && correction ? <CorrectionEditor correction={correction} busy={busy} onCancel={() => { setCorrectionId(""); setCorrection(null); }} onChange={setCorrection} onSave={() => void saveCorrection(receipt)} /> : null}
            </article>
          ))}
          {!receipts.length ? <p className="text-sm text-slate-500">{commerceT("empty.stock")}</p> : null}
          {receipts.length > 5 ? <Button type="button" variant="ghost" onClick={() => setShowAll((current) => !current)}>{showAll ? commerceT("actions.showLess") : commerceT("actions.viewMore")}</Button> : null}
        </div>
      </section>
    </div>
  );
}

function GroupRecorder({
  activeGroup,
  choices,
  lineDraft,
  onBegin,
  onFinish,
  onLineDraft,
  onSubmitLine,
  onReview,
  recordedGroups,
}: {
  activeGroup: RecordedGroup | null;
  choices: ProductChoice[];
  lineDraft: RecordedLine;
  onBegin: (name: string, method: GroupMethod) => void;
  onFinish: () => void;
  onLineDraft: (line: RecordedLine) => void;
  onSubmitLine: (event: FormEvent) => void;
  onReview: () => void;
  recordedGroups: RecordedGroup[];
}) {
  const t = useTranslations("CommerceStock");
  const commerceT = useTranslations("Commerce");
  const [groupName, setGroupName] = useState("");
  const [groupMethod, setGroupMethod] = useState<GroupMethod>("quantity");

  if (!activeGroup) {
    return (
      <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onBegin(groupName, groupMethod); setGroupName(""); }}>
        <div><h2 className="text-lg font-bold">{t("recordMethod.group")}</h2><p className="mt-1 text-sm text-slate-500">{t("help.group")}</p></div>
        {recordedGroups.length ? <p className="text-xs text-slate-500">{t("savedGroups", { count: recordedGroups.length })}</p> : null}
        <label className={field}>{t("fields.groupName")}<Input autoFocus data-stock-active-step tabIndex={-1} value={groupName} onChange={(event) => setGroupName(event.target.value)} /></label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["quantity", "individual"] as const).map((method) => (
            <label className={`cursor-pointer rounded-xl border p-3 ${groupMethod === method ? "border-slate-950 dark:border-white" : "border-slate-200 dark:border-slate-800"}`} key={method}><input className="mr-2" checked={groupMethod === method} name="group-method" type="radio" onChange={() => setGroupMethod(method)} /><strong className="text-sm">{t(`groupMethod.${method}`)}</strong><p className="mt-1 text-xs text-slate-500">{t(`groupMethodHelp.${method}`)}</p></label>
          ))}
        </div>
        <Button type="submit">{t("actions.enter")}</Button>
        <Button disabled={!recordedGroups.length} type="button" variant="outline" onClick={onReview}>{t("actions.review")}</Button>
      </form>
    );
  }

  const individual = activeGroup.method === "individual";
  return (
    <div className="grid gap-4">
      <div><h2 className="text-lg font-bold">{activeGroup.name}</h2><p className="mt-1 text-sm text-slate-500">{t(`groupMethod.${activeGroup.method}`)}</p></div>
      {activeGroup.lines.length ? <div className={`${inset} divide-y divide-slate-200 px-3 dark:divide-slate-800`}>{activeGroup.lines.map((line) => { const product = choices.find((choice) => choice.key === line.productKey); return <div className="flex justify-between gap-3 py-2 text-sm" key={line.id}><span>{product?.name}</span><span>{line.quantity} {product?.unit}</span></div>; })}</div> : null}
      <form className="grid gap-3" onSubmit={onSubmitLine}>
        <label className={field}>{t("fields.productSku")}<Select autoFocus data-stock-active-step tabIndex={-1} value={lineDraft.productKey} onChange={(event) => onLineDraft({ ...lineDraft, productKey: event.target.value })}><option value="">{t("values.chooseProduct")}</option>{choices.map((choice) => <option key={choice.key} value={choice.key}>{choice.name} · {choice.sku} · {choice.unit}</option>)}</Select></label>
        {!individual ? <label className={field}>{t("fields.productQuantity")}<Input min="0.001" step="0.001" type="number" value={lineDraft.quantity} onChange={(event) => onLineDraft({ ...lineDraft, quantity: event.target.value })} /></label> : null}
        <CostEditor mode={lineDraft.costMode} quantity={lineDraft.quantity} value={lineDraft.costValue} onMode={(mode) => onLineDraft({ ...lineDraft, costMode: mode })} onValue={(value) => onLineDraft({ ...lineDraft, costValue: value })} />
        {individual && lineDraft.details ? <div className="grid gap-3 sm:grid-cols-2"><label className={field}>{commerceT("fields.modelName")}<Input value={lineDraft.details.modelName} onChange={(event) => onLineDraft({ ...lineDraft, details: { ...lineDraft.details!, modelName: event.target.value } })} /></label><label className={field}>{commerceT("fields.brand")}<Input value={lineDraft.details.brand} onChange={(event) => onLineDraft({ ...lineDraft, details: { ...lineDraft.details!, brand: event.target.value } })} /></label><label className={field}>{commerceT("fields.color")}<Input value={lineDraft.details.color} onChange={(event) => onLineDraft({ ...lineDraft, details: { ...lineDraft.details!, color: event.target.value } })} /></label><label className={field}>{commerceT("fields.capacity")}<Input value={lineDraft.details.capacity} onChange={(event) => onLineDraft({ ...lineDraft, details: { ...lineDraft.details!, capacity: event.target.value } })} /></label><label className={field}>{t("fields.identifierType")}<Select value={lineDraft.details.identifierKind} onChange={(event) => onLineDraft({ ...lineDraft, details: { ...lineDraft.details!, identifierKind: event.target.value as ItemDetails["identifierKind"] } })}>{identifierKinds.map((kind) => <option key={kind} value={kind}>{commerceT(`identifierTypes.${kind}`)}</option>)}</Select></label><label className={field}>{t("fields.identifierValue")}<Input value={lineDraft.details.identifierValue} onChange={(event) => onLineDraft({ ...lineDraft, details: { ...lineDraft.details!, identifierValue: event.target.value } })} /></label></div> : null}
        <Button type="submit">{individual ? t("actions.enterItem") : t("actions.enterProduct")}</Button>
      </form>
      <Button disabled={!activeGroup.lines.length} type="button" variant="outline" onClick={onFinish}>{t("actions.finishGroup")}</Button>
    </div>
  );
}

function CorrectionEditor({
  correction,
  busy,
  onChange,
  onSave,
  onCancel,
}: {
  correction: CorrectionDraft;
  busy: boolean;
  onChange: (draft: CorrectionDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("CommerceStock");
  const commerceT = useTranslations("Commerce");
  const updateGroup = (batchId: string, groupId: string, change: (group: CorrectionDraft["batches"][number]["groups"][number]) => CorrectionDraft["batches"][number]["groups"][number]) => onChange({ ...correction, batches: correction.batches.map((batch) => batch.id === batchId ? { ...batch, groups: batch.groups.map((group) => group.id === groupId ? change(group) : group) } : batch) });
  const updateLine = (batchId: string, groupId: string, lineId: string, change: (line: CorrectionDraft["batches"][number]["groups"][number]["lines"][number]) => CorrectionDraft["batches"][number]["groups"][number]["lines"][number]) => updateGroup(batchId, groupId, (group) => ({ ...group, lines: group.lines.map((line) => line.id === lineId ? change(line) : line) }));
  return (
    <div className="grid gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
      <div className="grid gap-2 sm:grid-cols-2"><label className={field}>{t("fields.supplier")}<Input value={correction.supplier} onChange={(event) => onChange({ ...correction, supplier: event.target.value })} /></label><label className={field}>{t("fields.stockExpenses")}<Input min="0" step="0.01" type="number" value={correction.expenses} onChange={(event) => onChange({ ...correction, expenses: event.target.value })} /></label></div>
      {correction.batches.map((batch) => <div className={`${inset} grid gap-3 p-3`} key={batch.id}><label className={field}>{t("fields.batchName")}<Input value={batch.name} onChange={(event) => onChange({ ...correction, batches: correction.batches.map((item) => item.id === batch.id ? { ...item, name: event.target.value } : item) })} /></label>{batch.groups.map((group) => <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950" key={group.id}><div className="grid gap-2 sm:grid-cols-2"><label className={field}>{t("fields.groupName")}<Input value={group.name} onChange={(event) => updateGroup(batch.id, group.id, (current) => ({ ...current, name: event.target.value }))} /></label><label className={field}>{t("fields.unit")}<Input value={group.unit} onChange={(event) => updateGroup(batch.id, group.id, (current) => ({ ...current, unit: event.target.value }))} /></label></div>{group.lines.map((line) => <div className="grid gap-2 border-t border-slate-200 pt-3 dark:border-slate-800" key={line.id}><div className="grid gap-2 sm:grid-cols-2"><label className={field}>{t("fields.productName")}<Input value={line.name} onChange={(event) => updateLine(batch.id, group.id, line.id, (current) => ({ ...current, name: event.target.value }))} /></label><label className={field}>{t("fields.productQuantity")}<Input min="0.001" step="0.001" type="number" value={line.quantity} onChange={(event) => updateLine(batch.id, group.id, line.id, (current) => ({ ...current, quantity: event.target.value }))} /></label></div><CostEditor mode={line.costMode} quantity={line.quantity} value={line.costValue} onMode={(mode) => updateLine(batch.id, group.id, line.id, (current) => ({ ...current, costMode: mode }))} onValue={(value) => updateLine(batch.id, group.id, line.id, (current) => ({ ...current, costValue: value }))} /></div>)}</div>)}</div>)}
      <div className="flex gap-2"><Button disabled={busy} size="small" type="button" onClick={onSave}>{commerceT("actions.saveCorrection")}</Button><Button size="small" type="button" variant="ghost" onClick={onCancel}>{commerceT("actions.cancel")}</Button></div>
    </div>
  );
}

export { ProgressiveStockWorkspace };
