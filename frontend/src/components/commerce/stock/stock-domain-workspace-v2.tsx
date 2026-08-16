"use client";

import { Archive, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useTranslations } from "next-intl";

import { StockProductSummary, StockSummaryActions } from "@/components/commerce/stock/stock-summary";
import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useNotification } from "@/providers/global/notification-provider";
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
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950";
const field = "grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300";
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
const identifierKinds = [
  "imei",
  "serial",
  "chassis",
  "barcode",
  "engine",
  "registration",
] as const;

type TrackedDraft = {
  id: string;
  modelName: string;
  brand: string;
  color: string;
  capacity: string;
  identifierKind: (typeof identifierKinds)[number];
  identifierValue: string;
};
type ProductDraft = {
  id: string;
  existingProductId: string;
  name: string;
  brand: string;
  variant: string;
  quantity: string;
  costMode: StockCostMode;
  costValue: string;
  trackingMode: StockTrackingMode;
  trackedUnits: TrackedDraft[];
};
type GroupDraft = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  customUnit: string;
  products: ProductDraft[];
};
type BatchDraft = { id: string; name: string; groups: GroupDraft[] };
type CorrectionProduct = {
  id: string;
  name: string;
  brand: string;
  variant: string;
  barcode: string;
  quantity: string;
  costMode: StockCostMode;
  costValue: string;
};
type CorrectionGroup = {
  id: string;
  name: string;
  unit: string;
  products: CorrectionProduct[];
};
type CorrectionDraft = {
  supplier: string;
  stockExpenses: string;
  batches: Array<{ id: string; name: string; groups: CorrectionGroup[] }>;
};

const nowLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const formatNumber = (value: string | number | null | undefined, digits = 2) => {
  if (value == null) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(
    Number(value),
  );
};
const normalizeCost = (mode: StockCostMode, value: string, quantity: string) => {
  if (!value) return null;
  const entered = Number(value);
  const count = Number(quantity);
  if (!Number.isFinite(entered) || entered < 0) return null;
  if (mode === "total") {
    if (!Number.isFinite(count) || count <= 0) return null;
    return (entered / count).toFixed(2);
  }
  return entered.toFixed(2);
};

function CostField({
  mode,
  quantity,
  value,
  onMode,
  onValue,
}: {
  mode: StockCostMode;
  quantity: string;
  value: string;
  onMode: (value: StockCostMode) => void;
  onValue: (value: string) => void;
}) {
  const t = useTranslations("CommerceStock");
  const normalized = normalizeCost(mode, value, quantity);
  const total = normalized == null ? null : Number(normalized) * Number(quantity || 0);
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
      {value && normalized != null ? (
        <span className="font-normal text-slate-500">
          {mode === "total"
            ? `${t("fields.costPerUnit")}: ${formatNumber(normalized)}`
            : `${t("fields.totalBuyingCost")}: ${formatNumber(total)}`}
        </span>
      ) : null}
    </label>
  );
}

function StockDomainWorkspaceV2({ businessId }: { businessId: string }) {
  const t = useTranslations("Commerce");
  const stockT = useTranslations("CommerceStock");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const idRef = useRef(20);
  const nextId = (prefix: string) => `${prefix}-${++idRef.current}`;

  const makeTracked = (): TrackedDraft => ({
    id: nextId("tracked"),
    modelName: "",
    brand: "",
    color: "",
    capacity: "",
    identifierKind: "serial",
    identifierValue: "",
  });
  const makeProduct = (): ProductDraft => ({
    id: nextId("product"),
    existingProductId: "",
    name: "",
    brand: "",
    variant: "",
    quantity: "1",
    costMode: "per_unit",
    costValue: "",
    trackingMode: "quantity",
    trackedUnits: [],
  });
  const makeGroup = (): GroupDraft => ({
    id: nextId("group"),
    name: "",
    quantity: "1",
    unit: "piece",
    customUnit: "",
    products: [makeProduct()],
  });
  const makeBatch = (name: string): BatchDraft => ({
    id: nextId("batch"),
    name,
    groups: [makeGroup()],
  });

  const [supplier, setSupplier] = useState("");
  const [receivedAt, setReceivedAt] = useState(nowLocal());
  const [stockExpenses, setStockExpenses] = useState("0");
  const [batches, setBatches] = useState<BatchDraft[]>([
    {
      id: "batch-1",
      name: "Batch 1",
      groups: [
        {
          id: "group-1",
          name: "",
          quantity: "1",
          unit: "piece",
          customUnit: "",
          products: [
            {
              id: "product-1",
              existingProductId: "",
              name: "",
              brand: "",
              variant: "",
              quantity: "1",
              costMode: "per_unit",
              costValue: "",
              trackingMode: "quantity",
              trackedUnits: [],
            },
          ],
        },
      ],
    },
  ]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<StockUnitDefinition[]>([]);
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
        const [stockResponse, productsResponse] = await Promise.all([
          getStockReceipts(businessId, accessToken, signal),
          getProducts(businessId, accessToken, signal),
        ]);
        const data = stockResponse.data as {
          receipts?: StockReceipt[];
          units?: StockUnitDefinition[];
        } | null;
        setReceipts(data?.receipts ?? []);
        setUnits(data?.units ?? []);
        setProducts(productsResponse.data?.products ?? []);
      } catch (reason) {
        if (!isRequestCancelled(reason)) {
          notify({
            message: reason instanceof Error ? reason.message : t("errors.load"),
            tone: "error",
          });
        }
      }
    },
    [accessToken, businessId, notify, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const updateBatch = (batchId: string, change: (value: BatchDraft) => BatchDraft) =>
    setBatches((all) => all.map((item) => (item.id === batchId ? change(item) : item)));
  const updateGroup = (
    batchId: string,
    groupId: string,
    change: (value: GroupDraft) => GroupDraft,
  ) =>
    updateBatch(batchId, (batch) => ({
      ...batch,
      groups: batch.groups.map((item) => (item.id === groupId ? change(item) : item)),
    }));
  const updateProduct = (
    batchId: string,
    groupId: string,
    productId: string,
    change: (value: ProductDraft) => ProductDraft,
  ) =>
    updateGroup(batchId, groupId, (group) => ({
      ...group,
      products: group.products.map((item) =>
        item.id === productId ? change(item) : item,
      ),
    }));

  const chooseProduct = (
    batchId: string,
    group: GroupDraft,
    draft: ProductDraft,
    productId: string,
  ) => {
    const selected = products.find((item) => item.id === productId);
    const groupUnit = group.unit === "other" ? group.customUnit.trim() : group.unit;
    if (selected && selected.unit.toLowerCase() !== groupUnit.toLowerCase()) {
      notify({ message: stockT("validation.productUnitMismatch"), tone: "error" });
      return;
    }
    updateProduct(batchId, group.id, draft.id, (current) => ({
      ...current,
      existingProductId: productId,
      name: selected?.name ?? "",
      brand: selected?.brand ?? "",
      variant: selected?.variant ?? "",
      trackingMode: selected?.tracking_mode ?? "quantity",
      trackedUnits: [],
    }));
  };

  const validate = () => {
    for (const batch of batches) {
      if (!batch.name.trim()) return stockT("validation.batchName");
      for (const group of batch.groups) {
        const unit = group.unit === "other" ? group.customUnit.trim() : group.unit;
        const groupQuantity = Number(group.quantity);
        if (!group.name.trim()) return stockT("validation.groupName");
        if (!unit) return t("validation.unitRequired");
        if (!Number.isFinite(groupQuantity) || groupQuantity <= 0)
          return t("validation.quantityPositive");
        if (countableUnits.has(unit) && !Number.isInteger(groupQuantity))
          return t("validation.wholeQuantity", { unit });
        const allocated = group.products.reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0,
        );
        if (allocated !== groupQuantity) return stockT("validation.groupBalance");
        for (const product of group.products) {
          const quantity = Number(product.quantity);
          if (!product.existingProductId && !product.name.trim())
            return t("validation.itemNameRequired");
          if (!Number.isFinite(quantity) || quantity <= 0)
            return t("validation.quantityPositive");
          if (countableUnits.has(unit) && !Number.isInteger(quantity))
            return t("validation.wholeQuantity", { unit });
          if (
            product.costValue &&
            normalizeCost(product.costMode, product.costValue, product.quantity) == null
          )
            return stockT("validation.buyingCost");
          if (product.trackingMode === "individual") {
            if (!Number.isInteger(quantity)) return stockT("validation.individualWhole");
            if (product.trackedUnits.length !== quantity)
              return stockT("validation.individualCount", { count: quantity });
          }
        }
      }
    }
    return "";
  };

  const buildBody = (status: "draft" | "received") => ({
    status,
    ...(lateDeliveryParent ? { parent_receipt_id: lateDeliveryParent.id } : {}),
    supplier_name: supplier.trim(),
    additional_cost: stockExpenses || "0",
    received_at: new Date(receivedAt).toISOString(),
    catalog_items: batches.flatMap((batch) =>
      batch.groups.flatMap((group) =>
        group.products.map((product) => ({
          key: product.id,
          ...(product.existingProductId
            ? { product_id: product.existingProductId }
            : {
                item: {
                  name: product.name.trim(),
                  brand: product.brand.trim(),
                  variant: product.variant.trim(),
                  unit: group.unit === "other" ? group.customUnit.trim() : group.unit,
                  tracking_mode: product.trackingMode,
                },
              }),
        })),
      ),
    ),
    batches: batches.map((batch) => ({
      name: batch.name.trim(),
      groups: batch.groups.map((group) => {
        const unit = group.unit === "other" ? group.customUnit.trim() : group.unit;
        return {
          name: group.name.trim(),
          quantity: group.quantity,
          unit,
          types: group.products.map((product) => ({
            catalog_key: product.id,
            quantity_received: product.quantity,
            received_unit: unit,
            tracking_mode: product.trackingMode,
            ...(product.costValue
              ? {
                  unit_cost: normalizeCost(
                    product.costMode,
                    product.costValue,
                    product.quantity,
                  ),
                }
              : {}),
            tracked_units: product.trackedUnits.map((tracked) => ({
              model_name: tracked.modelName.trim(),
              brand: tracked.brand.trim(),
              color: tracked.color.trim(),
              capacity: tracked.capacity.trim(),
              identifiers: tracked.identifierValue.trim()
                ? [{ kind: tracked.identifierKind, value: tracked.identifierValue.trim() }]
                : [],
            })),
          })),
        };
      }),
    })),
  });

  const saveStock = async (status: "draft" | "received") => {
    if (!accessToken) return;
    const validation = validate();
    if (validation) {
      notify({ message: validation, tone: "error" });
      return;
    }
    setBusy(true);
    try {
      const response = await createStockReceipt(
        businessId,
        accessToken,
        buildBody(status),
      );
      const receipt = response.data as StockReceipt | null;
      if (receipt) setSavedReceipt(receipt);
      notify({
        message: status === "draft" ? t("success.draft") : t("success.stock"),
        tone: "success",
      });
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

  const submitReceived = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveStock("received");
  };

  const reset = (parent?: StockReceipt) => {
    setSavedReceipt(null);
    setLateDeliveryParent(parent ?? null);
    setSupplier(parent?.supplier_name ?? "");
    setReceivedAt(nowLocal());
    setStockExpenses("0");
    setBatches([makeBatch(parent?.batches[0]?.name || "Batch 1")]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const beginCorrection = (receipt: StockReceipt) => {
    setCorrectionId(receipt.id);
    setCorrection({
      supplier: receipt.supplier_name,
      stockExpenses: receipt.additional_cost,
      batches: receipt.batches.map((batch) => ({
        id: batch.id,
        name: batch.name,
        groups: batch.groups.map((group) => ({
          id: group.id,
          name: group.name,
          unit: group.unit,
          products: group.types.map((line) => ({
            id: line.id,
            name: line.product_name,
            brand: line.product_brand,
            variant: line.product_variant,
            barcode: line.product_barcode,
            quantity: String(
              Number(line.quantity_received) /
                Number(line.conversion_to_base || "1"),
            ),
            costMode: "per_unit",
            costValue: line.received_unit_cost ?? "",
          })),
        })),
      })),
    });
  };

  const updateCorrectionGroup = (
    batchId: string,
    groupId: string,
    change: (value: CorrectionGroup) => CorrectionGroup,
  ) => {
    if (!correction) return;
    setCorrection({
      ...correction,
      batches: correction.batches.map((batch) =>
        batch.id === batchId
          ? {
              ...batch,
              groups: batch.groups.map((group) =>
                group.id === groupId ? change(group) : group,
              ),
            }
          : batch,
      ),
    });
  };
  const updateCorrectionProduct = (
    batchId: string,
    groupId: string,
    productId: string,
    change: (value: CorrectionProduct) => CorrectionProduct,
  ) =>
    updateCorrectionGroup(batchId, groupId, (group) => ({
      ...group,
      products: group.products.map((product) =>
        product.id === productId ? change(product) : product,
      ),
    }));

  const saveCorrection = async (receipt: StockReceipt) => {
    if (!accessToken || !correction) return;
    setBusy(true);
    try {
      await correctStockReceipt(businessId, receipt.id, accessToken, {
        supplier_name: correction.supplier.trim(),
        additional_cost: correction.stockExpenses || "0",
        batches: correction.batches.map((batch) => ({
          id: batch.id,
          name: batch.name.trim(),
        })),
        groups: correction.batches.flatMap((batch) =>
          batch.groups.map((group) => ({
            id: group.id,
            name: group.name.trim(),
            unit: group.unit,
          })),
        ),
        lines: correction.batches.flatMap((batch) =>
          batch.groups.flatMap((group) =>
            group.products.map((product) => ({
              id: product.id,
              name: product.name.trim(),
              brand: product.brand.trim(),
              variant: product.variant.trim(),
              barcode: product.barcode.trim(),
              quantity: product.quantity,
              unit: group.unit,
              unit_cost: product.costValue
                ? normalizeCost(
                    product.costMode,
                    product.costValue,
                    product.quantity,
                  )
                : null,
            })),
          ),
        ),
      });
      setCorrectionId("");
      setCorrection(null);
      notify({ message: t("success.stockCorrected"), tone: "success" });
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

  const archiveDraft = async (receipt: StockReceipt) => {
    if (!accessToken || receipt.status !== "draft") return;
    if (!window.confirm(t("messages.archiveDraftConfirm"))) return;
    try {
      await archiveDraftStockReceipt(businessId, receipt.id, accessToken);
      notify({ message: t("success.draftArchived"), tone: "success" });
      await load();
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("errors.save"),
        tone: "error",
      });
    }
  };

  if (savedReceipt) {
    return (
      <section className={`${panel} grid gap-5`}>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
          <strong>
            {savedReceipt.status === "draft"
              ? t("savedReceipt.draft")
              : t("savedReceipt.received")}
          </strong>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {savedReceipt.reference} · {savedReceipt.supplier_name || t("fields.supplierNotEntered")} · {savedReceipt.received_at ? new Date(savedReceipt.received_at).toLocaleDateString() : "—"}
          </p>
        </div>
        {savedReceipt.batches.map((batch) => (
          <article className="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800" key={batch.id}>
            <h3 className="font-bold">{batch.name}</h3>
            {batch.groups.map((group) => (
              <section className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900" key={group.id}>
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{group.name}</strong>
                  <span className="text-sm">{formatNumber(group.quantity, 3)} {group.unit}</span>
                </div>
                {group.types.map((line) => (
                  <StockProductSummary key={line.id} line={line} />
                ))}
              </section>
            ))}
          </article>
        ))}
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
            <span className="text-slate-500">{stockT("fields.totalBuyingValue")}</span>
            <p className="font-semibold">{formatNumber(savedReceipt.total_buying_value)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
            <span className="text-slate-500">{stockT("fields.stockExpenses")}</span>
            <p className="font-semibold">{formatNumber(savedReceipt.additional_cost)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
            <span className="text-slate-500">{stockT("summary.totalStockCost")}</span>
            <p className="font-semibold">
              {formatNumber(
                Number(savedReceipt.total_buying_value) +
                  Number(savedReceipt.additional_cost),
              )}
            </p>
          </div>
        </div>
        <StockSummaryActions receipt={savedReceipt} />
        <Button type="button" onClick={() => reset()}>
          {t("actions.recordAnotherStock")}
        </Button>
      </section>
    );
  }

  return (
    <section className="grid items-start gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <form className={`${panel} grid gap-5`} onSubmit={submitReceived}>
        <div>
          <h2 className="font-bold">{t("forms.stock")}</h2>
          {lateDeliveryParent ? (
            <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
              {t("lateDeliveryFor", { reference: lateDeliveryParent.reference })}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={field}>
            {stockT("fields.supplier")}
            <Input value={supplier} onChange={(event) => setSupplier(event.target.value)} />
          </label>
          <label className={field}>
            {stockT("fields.dateReceived")}
            <Input required type="datetime-local" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} />
          </label>
        </div>

        {batches.map((batch, batchIndex) => (
          <article className="grid gap-4 rounded-xl border border-slate-200 p-4 shadow-sm dark:border-slate-800" key={batch.id}>
            <div className="flex flex-wrap items-end gap-3">
              <label className={`${field} flex-1`}>
                {stockT("fields.batchName")}
                <Input value={batch.name} onChange={(event) => updateBatch(batch.id, (current) => ({ ...current, name: event.target.value }))} />
              </label>
              {batches.length > 1 ? (
                <Button type="button" variant="ghost" onClick={() => setBatches((all) => all.filter((item) => item.id !== batch.id))}>
                  <Trash2 className="size-4" /> {t("actions.removeBatch")}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-slate-500">
              {t("batchPosition", { number: batchIndex + 1 })}
            </p>

            {batch.groups.map((group) => {
              const groupUnit = group.unit === "other" ? group.customUnit : group.unit;
              const allocated = group.products.reduce(
                (sum, item) => sum + Number(item.quantity || 0),
                0,
              );
              return (
                <section className="grid gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-900" key={group.id}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className={field}>
                      {stockT("fields.groupName")}
                      <Input value={group.name} onChange={(event) => updateGroup(batch.id, group.id, (current) => ({ ...current, name: event.target.value }))} />
                    </label>
                    <label className={field}>
                      {stockT("fields.groupQuantity")}
                      <Input min="0.001" step="0.001" type="number" value={group.quantity} onChange={(event) => updateGroup(batch.id, group.id, (current) => ({ ...current, quantity: event.target.value }))} />
                    </label>
                    <label className={field}>
                      {stockT("fields.unit")}
                      <Select value={group.unit} onChange={(event) => updateGroup(batch.id, group.id, (current) => ({ ...current, unit: event.target.value, customUnit: event.target.value === "other" ? current.customUnit : "" }))}>
                        {unitOptions.map((option) => (
                          <option key={option} value={option}>{t(`units.${option}`)}</option>
                        ))}
                        {units.map((option) => (
                          <option key={option.id} value={option.name}>{option.name}</option>
                        ))}
                        <option value="other">{t("units.other")}</option>
                      </Select>
                    </label>
                    {group.unit === "other" ? (
                      <label className={field}>
                        {t("fields.customUnit")}
                        <Input value={group.customUnit} onChange={(event) => updateGroup(batch.id, group.id, (current) => ({ ...current, customUnit: event.target.value }))} />
                      </label>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {stockT("groupBalance", {
                      recorded: allocated,
                      total: Number(group.quantity || 0),
                      unit: groupUnit || "—",
                    })}
                  </p>

                  {group.products.map((product) => (
                    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950" key={product.id}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className={field}>
                          {stockT("fields.productSku")}
                          <Select value={product.existingProductId} onChange={(event) => chooseProduct(batch.id, group, product, event.target.value)}>
                            <option value="">{stockT("values.newProduct")}</option>
                            {products.filter((item) => item.is_active).map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} · {item.sku} · {item.unit}
                              </option>
                            ))}
                          </Select>
                        </label>
                        {!product.existingProductId ? (
                          <label className={field}>
                            {stockT("fields.productName")}
                            <Input value={product.name} onChange={(event) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, name: event.target.value }))} />
                          </label>
                        ) : (
                          <div className="self-end rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                            <strong>{product.name}</strong>
                          </div>
                        )}
                        {!product.existingProductId ? (
                          <>
                            <label className={field}>
                              {t("fields.brandOptional")}
                              <Input value={product.brand} onChange={(event) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, brand: event.target.value }))} />
                            </label>
                            <label className={field}>
                              {t("fields.variant")}
                              <Input value={product.variant} onChange={(event) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, variant: event.target.value }))} />
                            </label>
                          </>
                        ) : null}
                        <label className={field}>
                          {stockT("fields.productQuantity")}
                          <Input min="0.001" step="0.001" type="number" value={product.quantity} onChange={(event) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, quantity: event.target.value }))} />
                        </label>
                        <CostField
                          mode={product.costMode}
                          quantity={product.quantity}
                          value={product.costValue}
                          onMode={(costMode) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, costMode }))}
                          onValue={(costValue) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, costValue }))}
                        />
                        <label className={field}>
                          {t("fields.tracking")}
                          <Select value={product.trackingMode} onChange={(event) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, trackingMode: event.target.value as StockTrackingMode, trackedUnits: [] }))}>
                            <option value="quantity">{t("values.quantity")}</option>
                            <option value="individual">{t("values.individual")}</option>
                          </Select>
                        </label>
                      </div>

                      {product.trackingMode === "individual" ? (
                        <div className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {stockT("individualProgress", {
                              recorded: product.trackedUnits.length,
                              total: Number(product.quantity || 0),
                            })}
                          </p>
                          {product.trackedUnits.map((tracked) => (
                            <div className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 dark:bg-slate-900" key={tracked.id}>
                              <Input placeholder={t("fields.modelName")} value={tracked.modelName} onChange={(event) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, trackedUnits: current.trackedUnits.map((item) => item.id === tracked.id ? { ...item, modelName: event.target.value } : item) }))} />
                              <Input placeholder={t("fields.brand")} value={tracked.brand} onChange={(event) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, trackedUnits: current.trackedUnits.map((item) => item.id === tracked.id ? { ...item, brand: event.target.value } : item) }))} />
                              <Input placeholder={t("fields.color")} value={tracked.color} onChange={(event) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, trackedUnits: current.trackedUnits.map((item) => item.id === tracked.id ? { ...item, color: event.target.value } : item) }))} />
                              <Input placeholder={t("fields.capacity")} value={tracked.capacity} onChange={(event) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, trackedUnits: current.trackedUnits.map((item) => item.id === tracked.id ? { ...item, capacity: event.target.value } : item) }))} />
                              <Select value={tracked.identifierKind} onChange={(event) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, trackedUnits: current.trackedUnits.map((item) => item.id === tracked.id ? { ...item, identifierKind: event.target.value as TrackedDraft["identifierKind"] } : item) }))}>
                                {identifierKinds.map((kind) => (
                                  <option key={kind} value={kind}>{t(`identifierTypes.${kind}`)}</option>
                                ))}
                              </Select>
                              <div className="flex gap-2">
                                <Input placeholder={t("fields.identifierNumber")} value={tracked.identifierValue} onChange={(event) => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, trackedUnits: current.trackedUnits.map((item) => item.id === tracked.id ? { ...item, identifierValue: event.target.value } : item) }))} />
                                <Button type="button" variant="ghost" onClick={() => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, trackedUnits: current.trackedUnits.filter((item) => item.id !== tracked.id) }))}>
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            disabled={
                              product.trackedUnits.length >=
                              Math.floor(Number(product.quantity) || 0)
                            }
                            type="button"
                            variant="outline"
                            onClick={() => updateProduct(batch.id, group.id, product.id, (current) => ({ ...current, trackedUnits: [...current.trackedUnits, makeTracked()] }))}
                          >
                            <Plus className="size-4" /> {t("actions.addAnotherIndividual")}
                          </Button>
                        </div>
                      ) : null}

                      {group.products.length > 1 ? (
                        <Button type="button" variant="ghost" onClick={() => updateGroup(batch.id, group.id, (current) => ({ ...current, products: current.products.filter((item) => item.id !== product.id) }))}>
                          <Trash2 className="size-4" /> {t("actions.removeType")}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => updateGroup(batch.id, group.id, (current) => ({ ...current, products: [...current.products, makeProduct()] }))}>
                      <Plus className="size-4" /> {t("actions.addProduct")}
                    </Button>
                    {batch.groups.length > 1 ? (
                      <Button type="button" variant="ghost" onClick={() => updateBatch(batch.id, (current) => ({ ...current, groups: current.groups.filter((item) => item.id !== group.id) }))}>
                        <Trash2 className="size-4" /> {t("actions.removeGroup")}
                      </Button>
                    ) : null}
                  </div>
                </section>
              );
            })}
            <Button type="button" variant="outline" onClick={() => updateBatch(batch.id, (current) => ({ ...current, groups: [...current.groups, makeGroup()] }))}>
              <Plus className="size-4" /> {t("actions.addGroup")}
            </Button>
          </article>
        ))}

        <Button type="button" variant="outline" onClick={() => setBatches((all) => [...all, makeBatch(`Batch ${all.length + 1}`)])}>
          <Plus className="size-4" /> {t("actions.addBatch")}
        </Button>
        <label className={field}>
          {stockT("fields.stockExpenses")}
          <Input min="0" step="0.01" type="number" value={stockExpenses} onChange={(event) => setStockExpenses(event.target.value)} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button disabled={busy || !accessToken} type="button" variant="outline" onClick={() => void saveStock("draft")}>
            {t("actions.saveDraft")}
          </Button>
          <Button disabled={busy || !accessToken} type="submit">
            {busy ? stockT("actions.saving") : t("actions.finishStock")}
          </Button>
        </div>
      </form>

      <aside className={`${panel} self-start`}>
        <h2 className="font-bold">{t("receivedStock")}</h2>
        <div className="mt-4 grid gap-3 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto xl:pr-2">
          {(showAll ? receipts : receipts.slice(0, 5)).map((receipt, index) => (
            <article
              className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950"
              key={receipt.id}
              style={{
                borderInlineStartColor:
                  index % 2 === 0
                    ? "var(--workspace-primary, var(--brand-navy))"
                    : "var(--workspace-secondary, var(--brand-orange))",
                borderInlineStartWidth: 3,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <strong>{receipt.reference}</strong>
                  <p className="text-xs text-slate-500">
                    {receipt.supplier_name || t("fields.supplierNotEntered")}
                  </p>
                </div>
                <span>{receipt.status}</span>
              </div>
              {receipt.batches.map((batch) => (
                <div className="grid gap-2 border-t border-slate-100 pt-3 dark:border-slate-800" key={batch.id}>
                  <strong className="text-xs uppercase tracking-wide text-slate-500">
                    {batch.name}
                  </strong>
                  {batch.groups.map((group) => (
                    <div className="grid gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-900" key={group.id}>
                      <div className="flex justify-between gap-2">
                        <strong>{group.name}</strong>
                        <span>{formatNumber(group.quantity, 3)} {group.unit}</span>
                      </div>
                      {group.types.map((line) => (
                        <div className="flex justify-between gap-3 text-xs" key={line.id}>
                          <span>{line.product_name} · {line.product_sku}</span>
                          <span>{formatNumber(line.received_unit_cost)} / {line.received_unit}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-xs text-slate-500">{stockT("fields.totalBuyingValue")}</span>
                  <p className="font-semibold">{formatNumber(receipt.total_buying_value)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">{stockT("fields.stockExpenses")}</span>
                  <p className="font-semibold">{formatNumber(receipt.additional_cost)}</p>
                </div>
              </div>
              <StockSummaryActions receipt={receipt} />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!receipt.correction_open}
                  size="small"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (correctionId === receipt.id) {
                      setCorrectionId("");
                      setCorrection(null);
                    } else beginCorrection(receipt);
                  }}
                >
                  {t("actions.correctStock")}
                  {correctionId === receipt.id ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </Button>
                {receipt.status === "received" ? (
                  <Button size="small" type="button" variant="outline" onClick={() => reset(receipt)}>
                    {t("actions.addLateDelivery")}
                  </Button>
                ) : (
                  <Button size="small" type="button" variant="ghost" onClick={() => void archiveDraft(receipt)}>
                    <Archive className="size-4" /> {t("actions.archiveDraft")}
                  </Button>
                )}
              </div>

              {correctionId === receipt.id && correction ? (
                <div className="grid gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className={field}>
                      {stockT("fields.supplier")}
                      <Input value={correction.supplier} onChange={(event) => setCorrection({ ...correction, supplier: event.target.value })} />
                    </label>
                    <label className={field}>
                      {stockT("fields.stockExpenses")}
                      <Input min="0" step="0.01" type="number" value={correction.stockExpenses} onChange={(event) => setCorrection({ ...correction, stockExpenses: event.target.value })} />
                    </label>
                  </div>
                  {correction.batches.map((batch) => (
                    <div className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800" key={batch.id}>
                      <label className={field}>
                        {stockT("fields.batchName")}
                        <Input value={batch.name} onChange={(event) => setCorrection({ ...correction, batches: correction.batches.map((item) => item.id === batch.id ? { ...item, name: event.target.value } : item) })} />
                      </label>
                      {batch.groups.map((group) => (
                        <div className="grid gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900" key={group.id}>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className={field}>
                              {stockT("fields.groupName")}
                              <Input value={group.name} onChange={(event) => updateCorrectionGroup(batch.id, group.id, (current) => ({ ...current, name: event.target.value }))} />
                            </label>
                            <label className={field}>
                              {stockT("fields.unit")}
                              <Select value={group.unit} onChange={(event) => updateCorrectionGroup(batch.id, group.id, (current) => ({ ...current, unit: event.target.value }))}>
                                {unitOptions.map((option) => (
                                  <option key={option} value={option}>{t(`units.${option}`)}</option>
                                ))}
                              </Select>
                            </label>
                          </div>
                          {group.products.map((product) => (
                            <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950" key={product.id}>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <label className={field}>
                                  {stockT("fields.productName")}
                                  <Input value={product.name} onChange={(event) => updateCorrectionProduct(batch.id, group.id, product.id, (current) => ({ ...current, name: event.target.value }))} />
                                </label>
                                <label className={field}>
                                  {stockT("fields.productQuantity")}
                                  <Input min="0.001" step="0.001" type="number" value={product.quantity} onChange={(event) => updateCorrectionProduct(batch.id, group.id, product.id, (current) => ({ ...current, quantity: event.target.value }))} />
                                </label>
                                <label className={field}>
                                  {t("fields.brandOptional")}
                                  <Input value={product.brand} onChange={(event) => updateCorrectionProduct(batch.id, group.id, product.id, (current) => ({ ...current, brand: event.target.value }))} />
                                </label>
                                <label className={field}>
                                  {t("fields.variant")}
                                  <Input value={product.variant} onChange={(event) => updateCorrectionProduct(batch.id, group.id, product.id, (current) => ({ ...current, variant: event.target.value }))} />
                                </label>
                                <label className={field}>
                                  {t("fields.barcode")}
                                  <Input value={product.barcode} onChange={(event) => updateCorrectionProduct(batch.id, group.id, product.id, (current) => ({ ...current, barcode: event.target.value }))} />
                                </label>
                                <CostField
                                  mode={product.costMode}
                                  quantity={product.quantity}
                                  value={product.costValue}
                                  onMode={(costMode) => updateCorrectionProduct(batch.id, group.id, product.id, (current) => ({ ...current, costMode }))}
                                  onValue={(costValue) => updateCorrectionProduct(batch.id, group.id, product.id, (current) => ({ ...current, costValue }))}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button disabled={busy} size="small" type="button" onClick={() => void saveCorrection(receipt)}>
                      {t("actions.saveCorrection")}
                    </Button>
                    <Button size="small" type="button" variant="ghost" onClick={() => { setCorrectionId(""); setCorrection(null); }}>
                      {t("actions.cancel")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {receipt.late_deliveries.length ? (
                <div className="grid gap-2 border-l-2 border-orange-400 pl-3">
                  <strong>{t("lateDeliveries")}</strong>
                  {receipt.late_deliveries.map((delivery) => (
                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900" key={delivery.id}>
                      <div className="flex justify-between gap-2">
                        <span>{delivery.reference}</span>
                        <span>
                          {delivery.received_at
                            ? new Date(delivery.received_at).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {delivery.quantities_by_unit
                          .map((item) => `${item.quantity} ${item.unit}`)
                          .join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {!receipts.length ? (
            <p className="text-sm text-slate-500">{t("empty.stock")}</p>
          ) : null}
          {receipts.length > 5 ? (
            <Button type="button" variant="ghost" onClick={() => setShowAll((value) => !value)}>
              {showAll ? t("actions.showLess") : t("actions.viewMore")}
            </Button>
          ) : null}
        </div>
      </aside>
    </section>
  );
}

export { StockDomainWorkspaceV2 };
